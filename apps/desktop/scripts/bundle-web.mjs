import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");
const webDir = join(repoRoot, "apps/web");
const webOutDir = join(webDir, "out");
const desktopDistDir = join(__dirname, "../dist");

const buildEnv = {
  ...process.env,
  ST_MANAGER_DESKTOP_BUILD: "1",
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  NODE_ENV: "production",
};

console.log("Building apps/web static export for desktop bundle...");

// Ensure a clean export output (prebuild only clears .next).
rmSync(join(webDir, "out"), { recursive: true, force: true });

const build = spawnSync("pnpm", ["build"], {
  cwd: webDir,
  env: buildEnv,
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(webOutDir)) {
  console.error("Expected apps/web/out after static export build.");
  process.exit(1);
}

rmSync(desktopDistDir, { recursive: true, force: true });
cpSync(webOutDir, desktopDistDir, { recursive: true });

console.log(`Bundled ${webOutDir} -> ${desktopDistDir}`);
