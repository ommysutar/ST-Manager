/**
 * Static service identity for responses like `GET /health`.
 *
 * `SERVICE_VERSION` is a plain constant rather than a `package.json` import
 * because every `tsconfig.json` in this monorepo pins `rootDir` to `./src`
 * (see the M0/M1 implementation report), so importing a file outside `src`
 * would break the build. Keep this in sync with `package.json`'s `version`
 * field until an automated release/versioning process exists.
 */
export const SERVICE_NAME = "st-manager-api";
export const SERVICE_VERSION = "0.0.0";
