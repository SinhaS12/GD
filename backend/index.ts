import { authRequest } from "./src/middleware/auth.ts";
import { handleAuthRoute } from "./src/route/auth.ts";
import { handleFileRoute } from "./src/route/file.ts";
import { ApiError, json } from "./src/route/http.ts";

const port = Number(process.env.PORT ?? 3001);
const frontendDirectory = new URL("../frontend/", import.meta.url);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
    headers.set("Vary", "Origin");
  }

  return headers;
}

async function handleRequest(request: Request): Promise<Response> {
  const headers = corsHeaders(request);
  const origin = request.headers.get("origin");
  const isSameOrigin = origin === new URL(request.url).origin;
  const isAllowedOrigin = !origin || isSameOrigin || allowedOrigins.has(origin);

  if (!isAllowedOrigin) {
    return json({ error: "Origin is not allowed." }, 403, headers);
  }

  if (request.method === "OPTIONS") {
    headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ status: "ok" }, 200, headers);
  }

  try {
    if (!url.pathname.startsWith("/api/")) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ error: "Not found." }, 404, headers);
      }

      const requestedPath = decodeURIComponent(url.pathname.slice(1));
      const relativePath = requestedPath || "index.html";
      const fileUrl = new URL(relativePath, frontendDirectory);
      if (!fileUrl.pathname.startsWith(frontendDirectory.pathname)) {
        return json({ error: "Not found." }, 404, headers);
      }

      const file = Bun.file(fileUrl);
      if (!(await file.exists())) {
        return json({ error: "Not found." }, 404, headers);
      }

      headers.set("Content-Type", file.type || "application/octet-stream");
      headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; frame-src blob:; connect-src 'self' https: http://localhost:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      return new Response(request.method === "HEAD" ? null : file, { headers });
    }

    const authResponse = await handleAuthRoute(request, url.pathname, headers);
    if (authResponse) return authResponse;

    const user = await authRequest(request);
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return json({ user }, 200, headers);
    }

    const fileResponse = await handleFileRoute(request, url, user, headers);
    if (fileResponse) return fileResponse;

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found." }, 404, headers);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ error: error.message }, error.status, headers);
    }

    console.error("Request failed:", error);
    return json({ error: "An unexpected server error occurred." }, 500, headers);
  }

  return json({ error: "Not found." }, 404, headers);
}

if (import.meta.main) {
  const server = Bun.serve({ port, fetch: handleRequest });
  console.log(`Drive server listening on ${server.url}`);
}

export { handleRequest };
