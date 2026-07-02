# @st-manager/validation

Runtime validation schemas (e.g. Zod) used at API boundaries, form submissions, and SDK response parsing. Complements `@st-manager/contracts`, which defines the static TypeScript shapes.

- `src/auth/`, `src/studio/`, `src/session/` — schemas grouped per domain

Status: M1 foundation implemented (`createStudioSchema` for the Studio resource, via Zod). `auth/` and `session/` remain empty placeholders until milestone M10 (see ADR 0002).
