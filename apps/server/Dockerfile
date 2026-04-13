FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY . .
RUN bunx prisma generate

EXPOSE 3000
CMD ["bun", "src/index.ts"]
