FROM oven/bun:1.3.3-alpine

WORKDIR /app

COPY backend/package.json backend/bun.lock ./backend/
RUN cd backend && bun install --production --frozen-lockfile

COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3001

CMD ["bun", "run", "index.ts"]
