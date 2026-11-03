# Drive

The backend is a Bun HTTP server with a local SQLite database and file storage. It
also serves the frontend when running locally or in the Render container.

## Run locally

From `backend/`:

```sh
bun install
bun run dev
```

Open [http://localhost:3001](http://localhost:3001). The app creates `data/` and
`storage/` automatically. Set `DB_PATH` and `STORAGE_DIR` to use other locations.
Uploads are limited to 100 MB per file.

## API

- `POST /api/auth/signup` and `POST /api/auth/login` create a session.
- `GET /api/auth/me` validates the bearer token.
- `GET /api/files?view=drive|recent|starred|trash|search` lists files.
- `POST /api/files` uploads a multipart `file`.
- `POST /api/folders` creates a folder.
- `PATCH /api/files/:id` renames, stars, or moves an item.
- `GET /api/files/:id/download` downloads a file.
- `DELETE /api/files/:id` moves an item to trash.
- `PATCH /api/files/:id/restore` restores an item.
- `DELETE /api/files/:id?permanent=true` permanently deletes an item.
- `GET /api/health` is the deployment health check.

Protected endpoints require `Authorization: Bearer <token>`. Set `JWT_SECRET` to
a long random value in production. Set `CORS_ORIGIN` to the exact frontend origin
(or a comma-separated list of origins) when the frontend is hosted separately.

## Deploy

`../render.yaml` configures the Bun API with a persistent Render disk for SQLite
and uploads. `../frontend/vercel.json` configures the static Vercel frontend;
set its `API_URL` environment variable to the deployed Render service URL before
building. The API's `CORS_ORIGIN` must match the Vercel deployment origin.

For checks, run `bun run typecheck` and `bun test`.
