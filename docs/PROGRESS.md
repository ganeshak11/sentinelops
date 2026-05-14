# SentinelOps — Progress Tracker

> Update your section every time you complete a task. Change `[ ]` to `[x]`.
> Add a short note and date next to anything worth calling out.

---

## How to Update

1. Find your section below
2. Check off completed tasks with `[x]`
3. Add a one-line note if needed: `[x] Task name — note here (DD/MM)`
4. Commit the update with your code: `git commit -m "chore: update progress"`

---

## Overall Status

| Member | Role | Status |
|---|---|---|
| Member 1 | Infra + Neo4j | 🟡 In Progress |
| Member 2 | AI / ML | 🔴 Not Started |
| Member 3 | Backend | 🔴 Not Started |
| Member 4 | Backend | 🔴 Not Started |
| Member 5 | Frontend | 🔴 Not Started |
| Member 6 | Frontend | 🔴 Not Started |
| Member 7 | Cybersecurity | 🔴 Not Started |
| Member 8 | Cybersecurity | 🔴 Not Started |

> Status key: 🔴 Not Started · 🟡 In Progress · 🟢 Done

---

---

## Member 1 — Infra + Neo4j

### AuraDB Setup
- [x] Monorepo scaffold created
- [x] `packages/graph/src/types.ts` — shared types defined
- [x] `packages/graph/src/client.ts` — Neo4j driver written
- [x] `scripts/db-migrate.ts` — migration script written
- [x] `scripts/db-seed.ts` — seed script written
- [ ] AuraDB instance provisioned
- [ ] `.env` filled with real AuraDB credentials
- [ ] `npm run db:migrate` ran successfully
- [ ] `npm run db:seed` ran successfully — 8 services + sample incident visible in AuraDB browser

### Graph Hydrators (`packages/graph/src/hydrators/index.ts`)
- [ ] `hydrateTopology` — MERGE Service nodes + DEPENDS_ON edges
- [ ] `hydrateDeploy` — CREATE Deploy node + DEPLOYED_TO edge
- [ ] `hydrateAlert` — CREATE Alert node + AFFECTS edge
- [ ] `hydrateMetric` — CREATE MetricEvent node + AFFECTS edge

### RCA Queries (`packages/graph/src/queries/rca.ts`)
- [ ] `computeBlastRadius` — returns `BlastRadiusEntry[]`
- [ ] `findProbableCauses` — returns `ProbableCause[]`
- [ ] `getIncidentTimeline` — returns `TimelineEvent[]`
- [ ] `findSimilarIncidents` — returns past incident IDs

### Topology Queries (`packages/graph/src/queries/topology.ts`)
- [ ] `getTopologyGraph` — shaped for Cytoscape.js
- [ ] `getServiceHealthSnapshot`
- [ ] `getServiceDetail`

### Infrastructure
- [x] `docker-compose.yml` at root
- [x] `apps/backend/Dockerfile`
- [x] `apps/frontend/Dockerfile`
- [x] `.github/workflows/ci.yml`
- [ ] `docker-compose up` tested end-to-end
- [ ] `.github/workflows/deploy.yml` written
- [ ] Health check endpoints verified (`/health`, `/health/live`, `/health/ready`)

---

---

## Member 2 — AI / ML

### LLM Provider Setup (`packages/ai/src/providers/`)
- [ ] `packages/ai/src/providers/openai.ts` — OpenAI client wrapper
- [ ] `packages/ai/src/providers/index.ts` — `llm(prompt)` function, reads `LLM_MODEL` from env
- [ ] Provider tested with a raw prompt

### Narrative Generation (`packages/ai/src/index.ts`)
- [ ] `generateNarrative(chain)` implemented
- [ ] Tested against seeded `CausalChain` from `db-seed.ts`
- [ ] Output is consistently grounded — no hallucination beyond provided data
- [ ] Prompt tuned in `packages/ai/src/prompts/index.ts`

### Postmortem Generation
- [ ] `buildPostmortemPrompt` implemented in `prompts/index.ts`
- [ ] `generatePostmortem(chain, resolution)` implemented in `index.ts`
- [ ] Output is valid Markdown

### Anomaly Detection
- [ ] `detectAnomalies(service, metricName, values)` implemented
- [ ] Z-score threshold tested — 420% deviation correctly flagged as anomaly

### Log Clustering
- [ ] `clusterLogs(logs)` implemented
- [ ] Groups log patterns correctly by service + time window

---

---

## Member 3 — Backend

### Auth (`apps/backend/src/auth/router.ts`)
- [ ] GitHub OAuth strategy configured (`passport-github2`)
- [ ] `GET /auth/github` — redirects to GitHub
- [ ] `GET /auth/github/callback` — exchanges code, creates/updates User in Neo4j, issues JWT
- [ ] `POST /auth/refresh` — verifies JWT, issues new one
- [ ] `POST /auth/logout` — adds token to denylist
- [ ] `GET /auth/me` — returns current user

### Middleware (`apps/backend/src/middleware/`)
- [ ] `auth.ts` — JWT verify middleware, attaches `req.user`
- [ ] `rbac.ts` — `requireRole()` middleware

### Event Ingestion (`apps/backend/src/api/events.ts`)
- [ ] `POST /events/ingest` — validates, normalizes, enqueues event
- [ ] `eventQueue.process()` wired in `index.ts` — calls correct hydrator per event type
- [ ] Alert events trigger `runRCA()` after hydration
- [ ] `GET /events` with query param filtering
- [ ] `GET /events/:id`

### RCA Engine (`apps/backend/src/rca/engine.ts`)
- [ ] `runRCA(alertId, incidentId)` implemented
- [ ] Calls `findProbableCauses`, `computeBlastRadius`, `getIncidentTimeline` from `@sentinelops/graph`
- [ ] Builds `CausalChain` and calls `generateNarrative` from `@sentinelops/ai`
- [ ] Writes narrative back to Incident node in Neo4j
- [ ] Emits `rca:complete` WebSocket event

### Incidents API (`apps/backend/src/api/incidents.ts`)
- [ ] `GET /incidents` with filters
- [ ] `GET /incidents/:id` — full detail with causal chain
- [ ] `POST /incidents/:id/resolve`
- [ ] `GET /incidents/:id/postmortem`
- [ ] `GET /incidents/:id/postmortem/export` — Markdown file download

---

---

## Member 4 — Backend

### GitLab Auth (`apps/backend/src/auth/router.ts`)
- [ ] GitLab OAuth strategy configured (`passport-gitlab2`)
- [ ] `GET /auth/gitlab` — redirects to GitLab
- [ ] `GET /auth/gitlab/callback` — exchanges code, creates/updates User in Neo4j, issues JWT

### Graph + Services API (`apps/backend/src/api/graph.ts`)
- [ ] `GET /graph/topology` — calls `getTopologyGraph()`
- [ ] `GET /graph/blast-radius/:serviceId` — calls `computeBlastRadius()`
- [ ] `POST /graph/topology/declare` — calls `hydrateTopology()`
- [ ] `GET /graph/services/:serviceId` — calls `getServiceDetail()`
- [ ] `GET /services` — list all services with health
- [ ] `POST /services` — register new service

### Actions API (`apps/backend/src/api/actions.ts`)
- [ ] `POST /actions/rollback` — triggers rollback, requires engineer/admin role
- [ ] `GET /actions/:actionId` — returns action status

### Webhooks (`apps/backend/src/api/webhooks.ts`)
- [ ] `POST /webhooks/github` — parses event, normalizes to `SentinelEvent`, enqueues
- [ ] `POST /webhooks/gitlab` — parses event, normalizes to `SentinelEvent`, enqueues
- [ ] `POST /webhooks/generic` — normalizes to `SentinelEvent`, enqueues

### WebSocket Server (`apps/backend/src/websocket/server.ts`)
- [ ] `ws.Server` initialized and attached to Express HTTP server
- [ ] `emit(type, payload)` function exported
- [ ] `incident:created` emitted on new incident
- [ ] `rca:complete` emitted after RCA finishes
- [ ] `graph:updated` emitted after topology hydration

---

---

## Member 5 — Frontend

### Auth
- [ ] `apps/frontend/src/app/login/page.tsx` — login page with GitHub + GitLab buttons
- [ ] `apps/frontend/src/lib/auth.tsx` — React context, JWT stored in memory
- [ ] `useAuth()` hook — returns `{ user, token, logout }`
- [ ] `apps/frontend/src/app/layout.tsx` — AuthProvider wrapping app, redirect unauthenticated to `/login`

### Incident Feed
- [ ] `apps/frontend/src/app/page.tsx` — main dashboard layout
- [ ] `apps/frontend/src/components/IncidentFeed.tsx` — incident list with status badge, severity, affected services
- [ ] `useWebSocket` wired — `incident:created` prepends to list, `incident:updated` updates existing
- [ ] Click incident → navigates to `/incidents/:id`

### Incident Detail Page
- [ ] `apps/frontend/src/app/incidents/[id]/page.tsx`
- [ ] Narrative panel — LLM-generated summary displayed
- [ ] Timeline — ordered event list
- [ ] Remediation steps displayed
- [ ] Rollback button — calls `api.actions.rollback()`, shows action status

---

---

## Member 6 — Frontend

### Graph Visualization
- [ ] `apps/frontend/src/components/TopologyGraph.tsx` — Cytoscape.js graph
- [ ] Node color coding — green/yellow/red by service status
- [ ] `graph:updated` WebSocket event refreshes graph
- [ ] Click node → service detail panel (deps, active alerts, last deploy)

### Blast Radius Overlay
- [ ] `apps/frontend/src/components/BlastRadiusOverlay.tsx`
- [ ] Highlights affected nodes when incident is selected
- [ ] Calls `api.graph.blastRadius(serviceId)` and highlights returned services

### Postmortem Page
- [ ] `apps/frontend/src/app/incidents/[id]/postmortem/page.tsx`
- [ ] Renders formatted Markdown postmortem
- [ ] Export button — downloads Markdown file

### Users Page (admin only)
- [ ] `apps/frontend/src/app/users/page.tsx` — list users, show roles
- [ ] Role change UI — calls `PATCH /users/:id/role`

---

---

## Member 7 — Cybersecurity

### Security Middleware (`apps/backend/src/middleware/security.ts`)
- [ ] `security.ts` created with rate limiters and security headers
- [ ] Auth routes: 20 req/min per IP
- [ ] Ingest: 500 req/min per token
- [ ] Webhooks: 200 req/min per IP
- [ ] Default: 100 req/min per token
- [ ] CORS restricted to `FRONTEND_URL`
- [ ] Helmet.js headers configured
- [ ] Middleware mounted in `apps/backend/src/index.ts`

### Webhook Signature Verification
- [ ] GitHub `X-Hub-Signature-256` verified with `crypto.timingSafeEqual`
- [ ] GitLab `X-Gitlab-Token` verified with `crypto.timingSafeEqual`
- [ ] Generic `X-SentinelOps-Token` verified
- [ ] Invalid signature returns `401` — tested

### OAuth Security Review
- [ ] State param generated with `crypto.randomBytes(16)` — verified
- [ ] State validated on callback before code exchange — verified
- [ ] Redirect URI is hardcoded, not taken from request — verified
- [ ] Provider OAuth tokens not stored anywhere — verified

---

---

## Member 8 — Cybersecurity

### JWT Security Review
- [ ] Algorithm is `HS256`, not `none` — verified
- [ ] `JWT_SECRET` minimum 32 chars enforced at startup
- [ ] Token expiry enforced on every request
- [ ] Denylist checked on every authenticated request
- [ ] No sensitive data in JWT payload — verified

### Cypher Injection Prevention
- [ ] All queries in `packages/graph/src/queries/` use `$param` syntax — reviewed
- [ ] All hydrators in `packages/graph/src/hydrators/` use `$param` syntax — reviewed
- [ ] Zero string concatenation into Cypher — confirmed

### Audit Trail
- [ ] `AuditLog` node writes implemented in `packages/graph/src/hydrators/`
- [ ] Rollback triggered → audit log written
- [ ] Incident resolved → audit log written
- [ ] Role changed → audit log written
- [ ] Audit logs are append-only — confirmed

### Dependency Audit
- [ ] `npm audit` returns zero high/critical vulnerabilities
- [ ] `npm audit --audit-level=high` passing in CI
- [ ] All dependencies reviewed for known CVEs

---

---

## Integration Milestones

> These are team-wide checkpoints. Update when the full loop works end-to-end.

- [ ] **M1 — Graph live:** `db:migrate` + `db:seed` working, 8 services visible in AuraDB
- [ ] **M2 — Ingest working:** `POST /events/ingest` writes Deploy node to Neo4j
- [ ] **M3 — RCA working:** Alert event triggers RCA, Incident node created with narrative
- [ ] **M4 — Frontend connected:** Dashboard shows seeded incident, graph renders
- [ ] **M5 — Real-time working:** WebSocket pushes incident to dashboard live
- [ ] **M6 — Full demo loop:** GitHub push → webhook → graph → RCA → narrative → dashboard
- [ ] **M7 — Security hardened:** All webhook verification, rate limiting, and JWT checks passing
- [ ] **M8 — Demo ready:** Seed data polished, demo script rehearsed, all panels working
