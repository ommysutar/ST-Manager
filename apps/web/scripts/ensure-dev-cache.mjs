import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
const buildIdPath = path.join(nextDir, "BUILD_ID");
const documentPath = path.join(nextDir, "server", "pages", "_document.js");

function hasMixedTurbopackArtifacts() {
  if (!fs.existsSync(documentPath)) {
    return false;
  }

  const contents = fs.readFileSync(documentPath, "utf8");
  return contents.includes("[turbopack]_runtime");
}

function shouldResetDevCache() {
  if (!fs.existsSync(nextDir)) {
    return false;
  }

  // Turbopack dev and webpack production builds both write to `.next`.
  // Reusing either cache for the other mode causes runtime 500s such as:
  // "Cannot find module '../chunks/ssr/[turbopack]_runtime.js'".
  return fs.existsSync(buildIdPath) || hasMixedTurbopackArtifacts();
}

if (shouldResetDevCache()) {
  console.warn(
    "[st-manager/web] Removing stale .next cache before Turbopack dev to prevent Internal Server Error.",
  );
  fs.rmSync(nextDir, { recursive: true, force: true });
}
