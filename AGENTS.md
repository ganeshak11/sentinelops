# SentinelOps — AI Agent Rules

> This file is read by AI coding assistants (GitHub Copilot, Cursor, Claude, ChatGPT, v0, etc.)
> These rules are ABSOLUTE. No exceptions. No "but it would be cleaner if...". Follow them exactly.

---

## 1. Identity & Scope

You are assisting ONE team member. You only work within that member's assigned files.
Before writing a single line of code, read:
- `docs/TEAM.md` — find which member you are assisting and what they own
- `docs/IMPLEMENTATION.md` — read that member's section only
- `docs/PROGRESS.md` — check what is already done and what is blocked

If the task you are asked to do is outside that member's assigned files, **refuse and explain why**.

---

## 2. Absolute Off-Limits — Never Touch These

These files and folders are owned by Member 1 (Infra + Neo4j lead).
**No other AI agent may read, suggest changes to, or generate code for these:**

```
packages/graph/src/types.ts        ← FROZEN. The entire team depends on this.
packages/graph/src/client.ts       ← Neo4j driver. Do not touch.
packages/graph/src/queries/        ← All Cypher queries. Member 1 only.
packages/graph/src/hydrators/      ← All graph writes. Member 1 only.
scripts/db-migrate.ts              ← Schema migration. Member 1 only.
scripts/db-seed.ts                 ← Seed data. Member 1 only.
docker-compose.yml                 ← Infra. Member 1 only.
apps/backend/Dockerfile            ← Infra. Member 1 only.
apps/frontend/Dockerfile           ← Infra. Member 1 only.
.github/workflows/                 ← CI/CD. Member 1 only.
tsconfig.json                      ← Root config. Member 1 only.
package.json                       ← Root workspace. Member 1 only.
```

If a user asks you to modify any of these files, respond with:
> "This file is owned by Member 1 (Infra + Neo4j). I cannot modify it. Raise the change request with Member 1 directly."

If you genuinely believe a change to one of these files would benefit the project, **do not modify it**.
Instead, add a detailed suggestion to `docs/AI_SUGGESTIONS.md` using the template in that file.
Member 1 will review it and decide whether to implement it.

---

## 3. types.ts Is a Contract — Never Modify It

`packages/graph/src/types.ts` defines every shared interface used across the entire codebase.
Changing it breaks backend, frontend, and AI package simultaneously.

**You must never:**
- Add, remove, or rename a field in any interface in this file
- Add a new type or interface to this file
- Change any union type values in this file

If the code you are writing requires a type that doesn't exist, **stop and tell the user** to raise it with Member 1. Do not work around it by defining a local type that duplicates or contradicts the shared one.

---

## 4. Respect the Build Order

Before implementing anything, check `docs/PROGRESS.md`.

If the task depends on something that isn't checked off yet:
- **Do not mock it silently** and move on as if it works
- **Tell the user explicitly**: "This depends on [X] which is not done yet according to PROGRESS.md. Either wait, or implement a clearly labeled mock that must be replaced."

If you implement a temporary mock, it must be marked like this:
```ts
// MOCK — replace when [Member X] completes [task]. See PROGRESS.md.
```

Never leave a silent mock that looks like real implementation.

---

## 5. Never Generate Code Outside Your Member's Files

If you are assisting Member 5 (Frontend), you must not generate code in:
- `apps/backend/`
- `packages/graph/`
- `packages/ai/`
- `packages/correlator/`
- `scripts/`

If the frontend needs something from the backend that doesn't exist yet, tell the user to raise it with Members 3/4. Do not generate backend code to unblock yourself.

The only cross-boundary action allowed is **reading** files to understand interfaces and types.

---

## 6. API Contract Is Sacred

The API is defined in `docs/API.md`.

**You must never:**
- Add a new endpoint that isn't in `docs/API.md`
- Change a request or response shape from what's documented
- Remove a field from a response
- Change an HTTP method or status code

If the user asks for something that requires an API change, tell them:
> "This requires an API change. Update `docs/API.md` first and get agreement from Members 3/4 and 5/6 before implementing."

---

## 7. No Architecture Changes

The architecture is defined in `docs/ARCHITECTURE.md` and the ADRs in `docs/adr/`.

**You must never suggest or implement:**
- Replacing Neo4j with any other database
- Replacing the LLM layer with direct log analysis
- Adding a new package to the monorepo
- Adding a new service to `docker-compose.yml`
- Changing the event queue from the current implementation to Redis/Bull
- Changing the auth strategy from OAuth-only to anything else
- Adding email/password login

If a user asks for any of the above, respond with:
> "This is an architecture-level decision documented in `docs/adr/`. It cannot be changed without a new ADR approved by Member 1."

---

## 8. Cypher Query Rules

If you are Member 1's AI assistant and are writing Cypher queries:

- **Always use parameterized queries.** Never concatenate user input into a Cypher string.
- Every query must use `$paramName` syntax for all variable inputs
- Never use string templates or dynamic query building based on user input

```cypher
// CORRECT
MATCH (s:Service {name: $name}) RETURN s

// NEVER DO THIS
MATCH (s:Service {name: '${userInput}'}) RETURN s
```

---

## 9. No New Dependencies Without Justification

Before adding any new `npm` package:
1. Check if the functionality already exists in an installed package
2. If it's a new package, tell the user: "I'm adding [package]. It is used for [reason]. It is not already available in the project."
3. Never add a package to the root `package.json` — add it only to the specific workspace that needs it
4. Never add a package flagged by `npm audit` as having high/critical vulnerabilities

---

## 10. Branch and Commit Rules

When generating git commands for the user:

- **Never suggest `git push origin main`** — main is protected
- **Never suggest `git push origin dev`** — dev is protected
- Always suggest a feature branch: `git checkout -b feat/<name>` or `fix/<name>`
- Always suggest a PR to `dev`, never directly to `main`
- Commit messages must follow Conventional Commits:
  ```
  feat(scope): description
  fix(scope): description
  chore(scope): description
  ```

---

## 11. Security Rules

- **Never hardcode secrets, API keys, tokens, or passwords** in any file
- All secrets come from `process.env.*` — never from hardcoded strings
- Never store JWT tokens in `localStorage` or `sessionStorage` — memory only
- Never use `===` to compare secrets or tokens — always `crypto.timingSafeEqual`
- Never log request bodies, tokens, or user data to console in production code
- Never disable TypeScript strict mode (`// @ts-ignore`, `any` types) to make something work faster

---

## 12. PROGRESS.md Must Be Updated

Every time you help a user complete a task that has a checkbox in `docs/PROGRESS.md`:

Remind the user:
> "Don't forget to check this off in `docs/PROGRESS.md` and commit the update."

The team depends on this file to know what's unblocked. A completed task that isn't checked off is the same as a task that isn't done from the team's perspective.

---

## 13. When in Doubt

If you are unsure whether something is allowed:
1. Check `docs/TEAM.md` — is this in scope for this member?
2. Check `docs/IMPLEMENTATION.md` — is this step listed for this member?
3. Check `docs/PROGRESS.md` — is the dependency done?
4. Check `docs/ARCHITECTURE.md` — does this contradict the architecture?

If any answer is no, **stop and tell the user** rather than proceeding.

The goal is a working, shippable product at the end of 45 days.
A shortcut taken by one AI agent that breaks another member's work costs the whole team.
