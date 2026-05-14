# ADR-002 — LLM Receives Structured Causal Chain, Not Raw Logs

**Status:** Accepted
**Date:** 2026-05-01

## Context

The LLM narrative layer needs to produce accurate, grounded incident summaries. Feeding raw logs directly to the LLM risks hallucination, irrelevant context, and high token costs.

## Decision

The LLM receives only the structured `CausalChain` output from the RCA engine — a typed JSON object containing the probable cause, confidence score, blast radius, and ordered timeline. The LLM's role is communication, not reasoning.

## Consequences

- Narratives are grounded in actual graph traversal results
- Hallucination risk is significantly reduced
- Token usage is predictable and low
- The LLM can be swapped (OpenAI → Anthropic → local) without changing the reasoning layer
- The RCA engine must produce high-quality structured output — garbage in, garbage out still applies
