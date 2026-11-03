import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "bun:test";

const testDirectory = mkdtempSync(join(tmpdir(), "gd-drive-test-"));
process.env.DB_PATH = join(testDirectory, "test.sqlite");
process.env.STORAGE_DIR = join(testDirectory, "files");
process.env.NODE_ENV = "test";

const { handleRequest } = await import("../../index.ts");

async function request(path: string, init: RequestInit = {}) {
  return handleRequest(new Request(`http://localhost${path}`, init));
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type TestFile = { id: string; name: string; parentId: string | null; isStarred: boolean };

afterAll(() => {
  rmSync(testDirectory, { recursive: true, force: true });
});

test("authenticates users and protects their files", async () => {
  const health = await request("/api/health");
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });

  const unauthenticated = await request("/api/files");
  expect(unauthenticated.status).toBe(401);

  const forbiddenOrigin = await request("/api/health", {
    headers: { Origin: "https://not-the-app.example" },
  });
  expect(forbiddenOrigin.status).toBe(403);

  const email = `test-${randomUUID()}@example.com`;
  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email,
      password: "a-secure-test-password",
    }),
  });
  expect(signup.status).toBe(200);
  const session = await responseJson<{ token: string }>(signup);
  const headers = { Authorization: `Bearer ${session.token}` };

  const currentUser = await request("/api/auth/me", { headers });
  expect((await responseJson<{ user: { email: string } }>(currentUser)).user.email).toBe(email);

  const duplicate = await request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email,
      password: "a-secure-test-password",
    }),
  });
  expect(duplicate.status).toBe(409);

  const folderResponse = await request("/api/folders", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Project files" }),
  });
  expect(folderResponse.status).toBe(201);
  const folder = (await responseJson<{ file: TestFile }>(folderResponse)).file;

  const nestedFolderResponse = await request("/api/folders", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Nested", parentId: folder.id }),
  });
  const nestedFolder = (await responseJson<{ file: TestFile }>(nestedFolderResponse)).file;

  const form = new FormData();
  form.append("file", new File(["hello drive"], "notes.txt", { type: "text/plain" }));
  form.append("parentId", folder.id);
  const uploadResponse = await request("/api/files", {
    method: "POST",
    headers,
    body: form,
  });
  expect(uploadResponse.status).toBe(201);
  const uploaded = (await responseJson<{ file: TestFile }>(uploadResponse)).file;
  expect(uploaded.name).toBe("notes.txt");
  expect(uploaded.parentId).toBe(folder.id);

  const download = await request(`/api/files/${uploaded.id}/download`, { headers });
  expect(download.status).toBe(200);
  expect(await download.text()).toBe("hello drive");

  const search = await request("/api/files?view=search&q=notes", { headers });
  expect((await responseJson<{ files: TestFile[] }>(search)).files.map((file) => file.id)).toContain(uploaded.id);

  const starred = await request(`/api/files/${uploaded.id}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ isStarred: true }),
  });
  expect((await responseJson<{ file: TestFile }>(starred)).file.isStarred).toBe(true);

  const trash = await request(`/api/files/${folder.id}`, {
    method: "DELETE",
    headers,
  });
  expect(trash.status).toBe(200);
  const trashList = await request("/api/files?view=trash", { headers });
  expect((await responseJson<{ files: TestFile[] }>(trashList)).files).toHaveLength(3);

  const restore = await request(`/api/files/${uploaded.id}/restore`, {
    method: "PATCH",
    headers,
  });
  expect(restore.status).toBe(200);
  const rootFiles = await request("/api/files", { headers });
  expect((await responseJson<{ files: TestFile[] }>(rootFiles)).files.map((file) => file.id)).toContain(folder.id);

  const invalidFolderMove = await request(`/api/files/${folder.id}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ parentId: nestedFolder.id }),
  });
  expect(invalidFolderMove.status).toBe(400);

  const invalidUploadName = new FormData();
  invalidUploadName.append("file", new File(["bad"], "../notes.txt"));
  const rejectedUpload = await request("/api/files", {
    method: "POST",
    headers,
    body: invalidUploadName,
  });
  expect(rejectedUpload.status).toBe(400);
});
