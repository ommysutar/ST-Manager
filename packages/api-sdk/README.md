# @st-manager/api-sdk

Typed HTTP client consumed by `@st-manager/web` and `@st-manager/desktop` to call `@st-manager/api`. Never imported by the API itself. Framework-agnostic: uses native `fetch` only, no HTTP library, no retry logic, no caching.

- `src/client/` — `createHttpClient(config)` (fetch wrapper), `ApiError` (error normalization). M10: `getAuthHeaders` + `onUnauthorized` refresh retry.
- `src/auth/` — `createAuthApi(client)`: `login`, `refresh`.
- `src/sync/` — `createSyncApi(client)`: `pushStudios`, `pullStudios` (M11, JWT required).
- `src/ai/` — `createAiApi(client)`: `generateStudioSummary` (M12, JWT required).
- `src/studios/` — `createStudiosApi(client)`: `listStudios`, `createStudio`.

```ts
import { createHttpClient, createStudiosApi } from "@st-manager/api-sdk";

const client = createHttpClient({ baseUrl: "http://localhost:4000" });
const studios = createStudiosApi(client);

await studios.createStudio({ name: "Downtown Studio" });
await studios.listStudios({ page: 1, pageSize: 20 });
```

Status: implemented (M5). `createStudio`/`listStudios` call the real `apps/api` endpoints and unwrap the server's `{ success, data, meta }` response envelope — callers get back plain `StudioResponseDto`/`ListStudiosResponseDto` values, never the raw envelope.
