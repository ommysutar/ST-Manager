# @st-manager/config-eslint

Shared ESLint flat-config presets consumed by all apps and packages for consistent linting across TypeScript, React, and NestJS code.

- `base.mjs` — TypeScript + recommended rules for any Node/TS package
- `react.mjs` — extends `base.mjs` with React hooks/refresh rules (web, desktop, ui)
- `nestjs.mjs` — extends `base.mjs` with decorator-friendly allowances (api)

## Usage

In a consuming package's `eslint.config.mjs`:

```js
import base from "@st-manager/config-eslint/base";

export default base;
```

Status: implemented at the repo root only so far (`/eslint.config.mjs`). Per-package configs will be added as `apps/*` are bootstrapped.
