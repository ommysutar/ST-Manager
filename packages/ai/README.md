# @st-manager/ai

AI orchestration layer consumed primarily by `@st-manager/api`.

- `src/prompts/` — versioned prompt templates per feature
- `src/providers/` — provider-agnostic adapter contracts (OpenAI, Anthropic, local)
- `src/pipelines/` — composable multi-step AI workflows
- `src/types/` — AI-specific types (model config, token usage, completion metadata)

Status: scaffolding only, no application code yet.
