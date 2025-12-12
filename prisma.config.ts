import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const config = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  // `seed` is accepted by the Prisma CLI but not included in the
  // TypeScript definition exposed by `prisma/config` in this project.
  // Cast to `any` to avoid the TS error while keeping runtime behavior.
  seed: "node prisma/seed.cjs",
  datasources: {
    db: {
      url: env("DATABASE_URL"),
    },
  },
  // Backwards-compatible `datasource` shape for Prisma CLI (some versions expect this)
  datasource: {
    url: env("DATABASE_URL"),
  },
} as any;

export default defineConfig(config);
