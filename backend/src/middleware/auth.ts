import { sign, verify } from "jsonwebtoken";
import { database } from "../database/index.ts";
import { ApiError } from "../route/http.ts";

const jwtSecret =
  process.env.JWT_SECRET ??
  (process.env.NODE_ENV === "production"
    ? ""
    : "drive-local-development-secret-change-before-deploy");

if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

export function issueToken(user: AuthenticatedUser): string {
  return sign({ email: user.email }, jwtSecret, {
    subject: user.id,
    expiresIn: "7d",
  });
}

export async function authRequest(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError(401, "Please sign in to continue.");

  let subject: string;
  try {
    const decoded = verify(token, jwtSecret);
    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      throw new ApiError(401, "Your session is invalid. Please sign in again.");
    }
    subject = decoded.sub;
  } catch {
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }

  const user = database
    .query("SELECT id, email, name FROM users WHERE id = ?")
    .get(subject) as AuthenticatedUser | null;
  if (!user) throw new ApiError(401, "Your account could not be found.");
  return user;
}
