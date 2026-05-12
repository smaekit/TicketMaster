FROM oven/bun:1-alpine AS base
WORKDIR /app

# ── Build the React client ──────────────────────────────────────────────────
FROM base AS build-client
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/client ./apps/client
RUN bun install
WORKDIR /app/apps/client
RUN bun run build

# ── Server release image ────────────────────────────────────────────────────
FROM base AS release
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY knowledge-base.md ./
COPY --from=build-client /app/apps/client/dist ./apps/server/public
RUN bun install

WORKDIR /app/apps/server
RUN bun /app/apps/server/node_modules/.bin/prisma generate

EXPOSE 3000
CMD ["sh", "-c", "bun /app/apps/server/node_modules/.bin/prisma migrate deploy && bun src/index.ts"]
