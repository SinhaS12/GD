import { randomUUID } from "node:crypto";
import { database } from "../database/index.ts";
import { issueToken, type AuthenticatedUser } from "../middleware/auth.ts";
import { ApiError, json, readJson } from "./http.ts";

function publicUser(user: AuthenticatedUser) {
  return { id: user.id, email: user.email, name: user.name };
}

export async function handleAuthRoute(
  request: Request,
  pathname: string,
  headers: Headers,
): Promise<Response | null> {
  if (pathname === "/api/auth/me" && request.method === "GET") {
    const authorization = request.headers.get("authorization");
    if (!authorization) return json({ user: null }, 200, headers);
    return null;
  }

  if (
    (pathname !== "/api/auth/signup" && pathname !== "/api/auth/login") ||
    request.method !== "POST"
  ) {
    return null;
  }

  const body = await readJson(request);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new ApiError(400, "Enter a valid email address.");
  }
  if (password.length < 10 || password.length > 128) {
    throw new ApiError(400, "Your password must be between 10 and 128 characters.");
  }

  let user: AuthenticatedUser | null;
  if (pathname === "/api/auth/signup") {
    const name =
      typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 1 || name.length > 80) {
      throw new ApiError(400, "Your name must be between 1 and 80 characters.");
    }

    const existing = database
      .query("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existing) throw new ApiError(409, "An account with that email already exists.");

    const id = randomUUID();
    const passwordHash = await Bun.password.hash(password);
    try {
      database
        .query(
          "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(id, email, name, passwordHash, new Date().toISOString());
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed: users.email")
      ) {
        throw new ApiError(409, "An account with that email already exists.");
      }
      throw error;
    }
    user = { id, email, name };
  } else {
    const record = database
      .query("SELECT id, email, name, password_hash FROM users WHERE email = ?")
      .get(email) as (AuthenticatedUser & { password_hash: string }) | null;

    if (!record || !(await Bun.password.verify(password, record.password_hash))) {
      throw new ApiError(401, "The email or password is incorrect.");
    }
    user = publicUser(record);
  }

  const token = issueToken(user);
  return json({ user: publicUser(user), token }, 200, headers);
}
