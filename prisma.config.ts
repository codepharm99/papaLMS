import "dotenv/config";
import { defineConfig, env } from "prisma/config";

type PrismaConfig = Parameters<typeof defineConfig>[0];
type PrismaConfigWithSeed = PrismaConfig & { seed?: string };

const config: PrismaConfigWithSeed = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  // `seed` is accepted by the Prisma CLI but not included in the
  // TypeScript definition exposed by `prisma/config` in this project.
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
};

export default defineConfig(config);
