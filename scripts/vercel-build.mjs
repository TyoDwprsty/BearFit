// Vercel runs `npm run vercel-build` instead of `build` when this script exists.
// Applies pending Prisma migrations (if DIRECT_URL is configured), then builds.
import { spawnSync } from "node:child_process";

const run = (command) => {
  const r = spawnSync(command, { shell: true, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const url = process.env.DIRECT_URL ?? "";
if (url && !/your-/.test(url)) {
  run("npx prisma migrate deploy");
} else {
  console.warn("⚠ DIRECT_URL is not set — skipping `prisma migrate deploy`.");
}
run("npx next build");
