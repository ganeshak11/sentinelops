# ADR-007 — Google Gemini as the LLM Provider

**Status:** Accepted
**Date:** 2026-05-24
**Author:** Member 2 (AI / ML)

## Context

The original implementation plan and `.env.example` assumed OpenAI (GPT-4o) as the LLM provider for narrative and postmortem generation. During implementation, Google Gemini (`gemini-1.5-flash`) was chosen as an alternative.

## Decision

Use Google Gemini via the `@google/generative-ai` SDK as the LLM provider for `packages/ai`.

The provider abstraction (`packages/ai/src/providers/index.ts`) exports a single `llm(prompt: string): Promise<string>` function. The underlying model is selected at runtime via the `LLM_MODEL` environment variable. This means the caller never depends on the specific provider — swapping Gemini for OpenAI (or any other model) requires only a new provider file and updating the env variable.

## Rationale

- **Cost:** Gemini 1.5 Flash has a generous free tier suitable for hackathon development and testing
- **Speed:** Lower latency than GPT-4o for short structured outputs
- **API simplicity:** `@google/generative-ai` has a minimal surface area for the use case
- **Abstraction is intact:** The provider interface (`llm(prompt)`) is unchanged — ADR-002's guarantee that the LLM can be swapped without touching the reasoning layer still holds

## Consequences

- `GEMINI_API_KEY` replaces `OPENAI_API_KEY` in `.env` and `.env.example`
- `LLM_MODEL` defaults to `gemini-1.5-flash` in `packages/ai/src/providers/index.ts`
- To switch back to OpenAI, implement `packages/ai/src/providers/openai.ts`, update `providers/index.ts` to import it, and set `LLM_MODEL=gpt-4o` in env — no other files change
- `@google/generative-ai` is the only new dependency added to `packages/ai/package.json`
