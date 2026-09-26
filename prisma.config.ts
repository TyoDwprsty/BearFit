import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Same env files as Next.js: .env.local wins over .env
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Supabase *Session pooler* URL (port 5432, IPv4-friendly). Needed for DDL.
    url: env("DIRECT_URL"),
  },
  experimental: {
    externalTables: true,
  },
  // Owned by Supabase Auth — Prisma may reference it but never migrates it.
  tables: {
    external: ["auth.users"],
  },
});
