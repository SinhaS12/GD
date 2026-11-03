# Drive

A Google Drive-inspired file manager with account sign-in, folders, search,
upload/download, in-app file previews, starring, trash, and restore. The UI is in
`frontend/`; the Bun/SQLite API is in `backend/`.

## Local development

```sh
cd backend
bun install
bun run dev
```

Then open [http://localhost:3001](http://localhost:3001). To run the frontend
independently, use `cd frontend && bun run build`; set `API_URL` to the backend
origin when building for a separate frontend host.

## Deployment

- The root `render.yaml` describes the backend service and persistent disk.
- `frontend/vercel.json` describes the static Vercel build. Configure `API_URL`
  with the public Render service URL and configure the backend's `CORS_ORIGIN`
  with the Vercel site origin.

Deployment requires authorized Vercel and Render accounts. The configuration
files are ready for those providers; they do not contain or replace account
credentials.
