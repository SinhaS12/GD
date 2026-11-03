import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { database } from "../database/index.ts";
import type { AuthenticatedUser } from "../middleware/auth.ts";
import { ApiError, json, readJson } from "./http.ts";

const maxUploadBytes = 100 * 1024 * 1024;
const storageQuotaBytes = 15 * 1024 * 1024 * 1024;
const storageDirectory = resolve(
  process.env.STORAGE_DIR ?? `${import.meta.dir}/../../storage`,
);

type FileRecord = {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  mime_type: string;
  size: number;
  storage_key: string | null;
  is_folder: number;
  is_starred: number;
  is_trashed: number;
  created_at: string;
  updated_at: string;
};

function publicFile(file: FileRecord) {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mime_type,
    size: file.size,
    parentId: file.parent_id,
    isFolder: file.is_folder === 1,
    isStarred: file.is_starred === 1,
    isTrashed: file.is_trashed === 1,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
  };
}

function ownedFile(user: AuthenticatedUser, id: string): FileRecord {
  const file = database
    .query("SELECT * FROM files WHERE id = ? AND owner_id = ?")
    .get(id, user.id) as FileRecord | null;
  if (!file) throw new ApiError(404, "That item could not be found.");
  return file;
}

function validateName(value: unknown): string {
  if (typeof value !== "string") throw new ApiError(400, "Enter a name.");
  const name = value.trim();
  if (
    !name ||
    name.length > 255 ||
    /[\u0000-\u001f\u007f/\\]/.test(name) ||
    name === "." ||
    name === ".."
  ) {
    throw new ApiError(400, "Use a name between 1 and 255 characters.");
  }
  return name;
}

function validateParent(user: AuthenticatedUser, parentId: unknown): string | null {
  if (parentId === null || parentId === undefined || parentId === "") return null;
  if (typeof parentId !== "string") throw new ApiError(400, "Invalid destination folder.");

  const parent = ownedFile(user, parentId);
  if (parent.is_folder !== 1 || parent.is_trashed === 1) {
    throw new ApiError(400, "Choose an active folder as the destination.");
  }
  return parent.id;
}

async function insertFolder(
  user: AuthenticatedUser,
  name: string,
  parentId: string | null,
): Promise<FileRecord> {
  const id = randomUUID();
  const now = new Date().toISOString();
  database
    .query(
      `INSERT INTO files
        (id, owner_id, parent_id, name, mime_type, is_folder, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'application/vnd.google-apps.folder', 1, ?, ?)`,
    )
    .run(id, user.id, parentId, name, now, now);
  return ownedFile(user, id);
}

function descendants(user: AuthenticatedUser, fileId: string): FileRecord[] {
  return database
    .query(
      `WITH RECURSIVE children(id) AS (
         SELECT id FROM files WHERE id = ? AND owner_id = ?
         UNION ALL
         SELECT files.id FROM files
         JOIN children ON files.parent_id = children.id
         WHERE files.owner_id = ?
       )
       SELECT files.* FROM files JOIN children ON files.id = children.id`,
    )
    .all(fileId, user.id, user.id) as FileRecord[];
}

async function removeStoredFile(storageKey: string): Promise<void> {
  try {
    await unlink(resolve(storageDirectory, storageKey));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

export async function handleFileRoute(
  request: Request,
  url: URL,
  user: AuthenticatedUser,
  headers: Headers,
): Promise<Response | null> {
  const { pathname, searchParams } = url;

  if (pathname === "/api/files" && request.method === "GET") {
    const view = searchParams.get("view") ?? "drive";
    if (!["drive", "starred", "trash", "search", "recent"].includes(view)) {
      throw new ApiError(400, "Choose a valid Drive view.");
    }
    const parentId = searchParams.get("parent");
    const search = (searchParams.get("q") ?? "").trim().slice(0, 200);
    const conditions = ["owner_id = ?"];
    const parameters: (string | number | null)[] = [user.id];

    if (view === "trash") {
      conditions.push("is_trashed = 1");
    } else {
      conditions.push("is_trashed = 0");
      if (view === "starred") conditions.push("is_starred = 1");
      if (view === "recent") {
        const files = database
          .query(
            `SELECT * FROM files WHERE owner_id = ? AND is_trashed = 0
             ORDER BY updated_at DESC LIMIT 100`,
          )
          .all(user.id) as FileRecord[];
        const usage = database
          .query(
            "SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE owner_id = ? AND is_folder = 0 AND is_trashed = 0",
          )
          .get(user.id) as { used: number };
        return json(
          {
            files: files.map(publicFile),
            storage: { used: usage.used, total: storageQuotaBytes },
          },
          200,
          headers,
        );
      }
      if (parentId) {
        const parent = ownedFile(user, parentId);
        if (parent.is_folder !== 1 || parent.is_trashed === 1) {
          throw new ApiError(404, "That folder could not be found.");
        }
        conditions.push("parent_id = ?");
        parameters.push(parentId);
      } else if (view !== "starred" && view !== "search") {
        conditions.push("parent_id IS NULL");
      }
    }

    if (search) {
      conditions.push("name LIKE ? ESCAPE '\\'");
      parameters.push(`%${search.replace(/[\\%_]/g, "\\$&")}%`);
    }

    const files = database
      .query(
        `SELECT * FROM files WHERE ${conditions.join(" AND ")}
         ORDER BY is_folder DESC, is_starred DESC, updated_at DESC LIMIT 1000`,
      )
      .all(...parameters) as FileRecord[];
    const usage = database
      .query(
        "SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE owner_id = ? AND is_folder = 0 AND is_trashed = 0",
      )
      .get(user.id) as { used: number };

    return json(
      {
        files: files.map(publicFile),
        storage: { used: usage.used, total: 15 * 1024 * 1024 * 1024 },
      },
      200,
      headers,
    );
  }

  if (pathname === "/api/folders" && request.method === "POST") {
    const body = await readJson(request);
    const name = validateName(body.name);
    const parentId = validateParent(user, body.parentId);
    const folder = await insertFolder(user, name, parentId);
    return json({ file: publicFile(folder) }, 201, headers);
  }

  if (pathname === "/api/files" && request.method === "POST") {
    let form: Awaited<ReturnType<Request["formData"]>>;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "Upload must use a valid multipart form.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose a file to upload.");
    if (file.size > maxUploadBytes) {
      throw new ApiError(413, "Files must be 100 MB or smaller.");
    }

    const name = validateName(file.name);
    const parentId = validateParent(user, form.get("parentId"));
    const usage = database
      .query(
        "SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE owner_id = ? AND is_folder = 0 AND is_trashed = 0",
      )
      .get(user.id) as { used: number };
    if (usage.used + file.size > storageQuotaBytes) {
      throw new ApiError(413, "Your Drive is out of storage space.");
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const storageKey = `${id}.blob`;
    const filePath = resolve(storageDirectory, storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, new Uint8Array(await file.arrayBuffer()), { flag: "wx" });

    try {
      database.transaction(() => {
        const latestUsage = database
          .query(
            "SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE owner_id = ? AND is_folder = 0 AND is_trashed = 0",
          )
          .get(user.id) as { used: number };
        if (latestUsage.used + file.size > storageQuotaBytes) {
          throw new ApiError(413, "Your Drive is out of storage space.");
        }

        database
          .query(
            `INSERT INTO files
              (id, owner_id, parent_id, name, mime_type, size, storage_key, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            user.id,
            parentId,
            name,
            file.type || "application/octet-stream",
            file.size,
            storageKey,
            now,
            now,
          );
      })();
    } catch (error) {
      await removeStoredFile(storageKey);
      throw error;
    }
    return json({ file: publicFile(ownedFile(user, id)) }, 201, headers);
  }

  const match = pathname.match(/^\/api\/files\/([^/]+)(?:\/(download|restore))?$/);
  if (!match) return null;

  const id = match[1];
  const action = match[2];
  if (!id) return null;
  const file = ownedFile(user, id);

  if (action === "download" && request.method === "GET") {
    if (file.is_folder === 1 || file.is_trashed === 1 || !file.storage_key) {
      throw new ApiError(404, "This file is not available to download.");
    }
    const filePath = resolve(storageDirectory, file.storage_key);
    const storedFile = Bun.file(filePath);
    if (!(await storedFile.exists())) {
      throw new ApiError(404, "The stored file could not be found.");
    }
    headers.set("Content-Type", file.mime_type);
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    headers.set("Content-Length", String(file.size));
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(storedFile, { headers });
  }

  if (action === "restore" && request.method === "PATCH") {
    if (file.is_trashed !== 1) throw new ApiError(400, "This item is not in the trash.");
    database
      .query(
        `WITH RECURSIVE ancestors(id) AS (
           SELECT id FROM files WHERE id = ? AND owner_id = ?
           UNION ALL
           SELECT files.parent_id FROM files
           JOIN ancestors ON files.id = ancestors.id
           WHERE files.owner_id = ? AND files.parent_id IS NOT NULL
         ),
         descendants(id) AS (
           SELECT id FROM ancestors
           UNION ALL
           SELECT files.id FROM files
           JOIN descendants ON files.parent_id = descendants.id
           WHERE files.owner_id = ?
         )
         UPDATE files SET is_trashed = 0, updated_at = ?
         WHERE id IN (SELECT id FROM descendants)`,
      )
      .run(id, user.id, user.id, user.id, new Date().toISOString());
    return json({ file: publicFile(ownedFile(user, id)) }, 200, headers);
  }

  if (action || request.method !== "PATCH" && request.method !== "DELETE") {
    return null;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request);
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if ("name" in body) {
      updates.push("name = ?");
      values.push(validateName(body.name));
    }
    if ("isStarred" in body) {
      if (typeof body.isStarred !== "boolean") {
        throw new ApiError(400, "Starred must be true or false.");
      }
      updates.push("is_starred = ?");
      values.push(Number(body.isStarred));
    }
    if ("parentId" in body) {
      const newParentId = validateParent(user, body.parentId);
      if (file.is_folder === 1 && newParentId) {
        const childIds = descendants(user, file.id).map((child) => child.id);
        if (childIds.includes(newParentId)) {
          throw new ApiError(400, "A folder cannot be moved into itself or one of its subfolders.");
        }
      }
      updates.push("parent_id = ?");
      values.push(newParentId);
    }
    if (updates.length === 0) throw new ApiError(400, "There are no changes to save.");

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id, user.id);
    database
      .query(`UPDATE files SET ${updates.join(", ")} WHERE id = ? AND owner_id = ?`)
      .run(...values);
    return json({ file: publicFile(ownedFile(user, id)) }, 200, headers);
  }

  if (request.method === "DELETE") {
    if (searchParams.get("permanent") === "true" || file.is_trashed === 1) {
      const items = descendants(user, id);
      for (const item of items) {
        if (item.storage_key) await removeStoredFile(item.storage_key);
      }
      database
        .query("DELETE FROM files WHERE id = ? AND owner_id = ?")
        .run(id, user.id);
    } else {
      database
        .query(
          `WITH RECURSIVE children(id) AS (
             SELECT id FROM files WHERE id = ? AND owner_id = ?
             UNION ALL
             SELECT files.id FROM files
             JOIN children ON files.parent_id = children.id
             WHERE files.owner_id = ?
           )
           UPDATE files SET is_trashed = 1, updated_at = ?
           WHERE id IN (SELECT id FROM children)`,
        )
        .run(id, user.id, user.id, new Date().toISOString());
    }
    return json({ success: true }, 200, headers);
  }

  return null;
}
