# Enterprise RAG

Retrieval-Augmented Generation.

## Current scope

The main seminar scope is intentionally reduced to **No RAG vs RAG**.

The deck explains RAG fundamentals first: chunks, embeddings, retrieval, context, citations, and traces. The live demo then shows how the local RAG pipeline produces retrieved chunks and citations, compared against the conceptual No RAG baseline where no source is attached to the answer.

## Prerequisites

- Node.js 22 LTS or a newer compatible Node version.
- pnpm 10.x via Corepack.
- Docker, for the PostgreSQL + pgvector demo database.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
```

## HR RAG app demo commands

Run these before presenting so the editable HR database and pgvector index are ready:

```bash
pnpm install
pnpm demo:run
```

`pnpm demo:run` starts PostgreSQL/pgvector with Docker Compose, seeds the HR policies, then runs the Express API and React app together.

Open `http://localhost:5174`, then:

1. Ask the preset overtime question.
2. Inspect streamed answer chunks, citations, best retrieval score, and evidence threshold.
3. Open the Policy dashboard.
4. Create, delete, or edit a policy and save/re-index HR data into PostgreSQL/pgvector.
5. Ask the same question again and compare answer + citations.

Optional Gemini mode:

```bash
GEMINI_API_KEY=your_key pnpm demo:run
```

`GEMINI_MODEL` defaults to `gemini-2.5-flash` and can be overridden. If the configured model is unavailable, the API falls back through available `generateContent` models before using the deterministic local answer. External web grounding is opt-in from the UI: when **External reference** is enabled, questions with weak or insufficient internal policy evidence use Gemini Google Search grounding, clearly label the answer as reference material, and return external web sources.

Environment files are loaded from the repo-root `.env` first, then `apps/api/.env` if present. Do not put secrets in browser-visible Vite variables unless they are intentionally public.

Before shipping or rehearsing, run:

```bash
pnpm demo:build
pnpm build
```

The React/Express HR demo uses deterministic local dense vectors so the seminar does not depend on model downloads.

## RAG demo artifact paths

| Purpose | Path |
|---|---|
| AcmePeople HR seed data | `apps/api/src/lib/seedData.ts` |
| HR vector database | PostgreSQL + pgvector from `docker-compose.yml` |
| HR React app | `apps/web` |
| HR Express API | `apps/api` |
| HR fixed questions | `apps/api/src/lib/seedData.ts` |

Recommended live demo order:

1. Explain the HR scenario: policy data changes, but the model is not retrained.
2. Start Postgres/pgvector and seed the HR policy index before the talk.
3. Open the React app at `http://localhost:5174`.
4. Ask the overtime preset.
5. Point at answer, citations, retrieved evidence, and mode.
6. Edit the overtime policy.
7. Re-index from the app.
8. Ask again and show the answer/source changed.
9. Optionally enable External reference mode for a question outside the HR corpus and show that web-grounded sources are separated from company policy citations.

Demo technology stack:

- Source layer: fictional HR policies standing in for exported Notion/Jira/Azure/GitLab/PDF/runbook content.
- Web app: React + Vite, TanStack Router, TanStack Query, Tailwind, and shadcn-style components.
- API: Express with JSON and SSE streaming endpoints.
- Vector store: PostgreSQL + pgvector, using cosine distance over policy chunks.
- Embeddings: deterministic local dense vectors for reliable live delivery.
- Answer/citations: streaming deterministic extractive answer with citations, top-K setup, an evidence-score gate, and opt-in external-reference grounding.
- Boundaries: no mandatory API key, no mandatory local LLM, no external search engine, and no LLM-as-judge.

