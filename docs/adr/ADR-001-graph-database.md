# ADR-001 — Use Neo4j AuraDB as the Primary Reasoning Substrate

**Status:** Accepted
**Date:** 2026-05-01

## Context

SentinelOps needs to model service dependencies, causal chains, and blast radius traversal. This is fundamentally a graph problem — services depend on other services, events propagate along edges, and root cause analysis is a path-finding operation.

## Decision

Use Neo4j AuraDB as the primary data store for all service topology, events, and incidents. All reasoning (RCA, blast radius, timeline reconstruction) is done via Cypher queries against the live graph.

## Consequences

- Cypher queries express causal traversal naturally and concisely
- The graph is always live — no batch rebuilding at incident time
- AuraDB is fully managed — no Neo4j ops overhead
- The free tier is sufficient for hackathon and small team use
- Engineers unfamiliar with Cypher have a learning curve
