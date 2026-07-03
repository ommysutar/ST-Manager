# @st-manager/ai

AI orchestration layer consumed primarily by `@st-manager/api`.

- `src/prompts/` — versioned prompt templates per feature
- `src/providers/` — OpenAI and mock provider adapters behind a shared `AiProvider` interface
- `src/pipelines/` — composable AI workflows (M12: studio summary)
- `src/types/` — completion result types and `AiProviderError`

## M12 — Studio summary

| Component | Purpose |
|---|---|
| `buildStudioSummaryPrompt` | Builds marketing-style summary prompt from studio name |
| `createMockProvider` | Deterministic dev/CI responses without network |
| `createOpenAiProvider` | OpenAI chat completions adapter |
| `runStudioSummaryPipeline` | Prompt → provider → trimmed summary |
| `createAiProvider` | Factory selecting `mock` or `openai` |

Configure via API env vars:

| Variable | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | `mock` | `mock` \| `openai` |
| `AI_API_KEY` | — | Required when `AI_PROVIDER=openai` |
| `AI_MODEL` | `gpt-4o-mini` | OpenAI model id |

Status: **implemented (M12)** — builds to CommonJS for NestJS runtime consumption.
