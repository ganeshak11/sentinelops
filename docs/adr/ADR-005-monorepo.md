# ADR-005 — Monorepo with npm Workspaces

**Status:** Accepted
**Date:** 2026-05-01

## Context

SentinelOps has multiple packages (`graph`, `correlator`, `ai`) shared between the backend and potentially the frontend. Managing these as separate repos adds overhead for a small team.

## Decision

Use a single monorepo with npm workspaces. Shared packages live in `packages/`, applications in `apps/`. TypeScript project references enable incremental builds.

## Consequences

- Shared types and utilities are imported directly without publishing to npm
- A single `npm install` at the root installs everything
- CI runs all checks in one pipeline
- Repo size grows over time — acceptable for this project scale
