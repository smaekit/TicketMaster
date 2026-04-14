import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun src/lib/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
