# @st-manager/api-sdk

Typed HTTP client consumed by `@st-manager/web` and `@st-manager/desktop` to call `@st-manager/api`. Never imported by the API itself.

- `src/client/` — base fetch wrapper, auth header injection, error normalization
- `src/modules/` — per-domain typed API methods

Status: scaffolding only, no application code yet.
