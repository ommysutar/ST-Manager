# @st-manager/desktop

Tauri 2 native desktop shell for ST Manager. The packaged app bundles the **local production static export** of `apps/web` — the same Next.js UI, served from files inside the DMG (no remote URL, works offline for UI).

## Architecture

| Mode | Webview loads |
|------|----------------|
| **Development** (`tauri dev`) | `http://localhost:3000` — local `apps/web` dev server |
| **Production** (DMG / bundle) | Bundled `apps/web/out` copied to `apps/desktop/dist` |

Build pipeline:

1. `ST_MANAGER_DESKTOP_BUILD=1 pnpm --filter @st-manager/web build` → static export to `apps/web/out`
2. Copy `out/` → `apps/desktop/dist`
3. `tauri build` packages `dist/` into the macOS app

API calls use `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000` at build time). Run the API locally for live data.

## Development

```bash
# Terminal 1 — API
pnpm --filter @st-manager/api dev

# Terminal 2 — Desktop (starts apps/web on :3000)
pnpm --filter @st-manager/desktop tauri dev
```

## Production build (macOS DMG)

```bash
pnpm install
pnpm --filter @st-manager/desktop exec tauri build
```

`beforeBuildCommand` runs `scripts/bundle-web.mjs` automatically.

Artifacts: `apps/desktop/src-tauri/target/release/bundle/`
