# SentinelOps — Implementation Plans

Each section is a self-contained guide for one role. Read only your section. Start at Step 1 and work down.

---

## Member 1 — Infra, Architecture, Neo4j

### Your files
```
packages/graph/src/
  types.ts          ← already written, DO NOT change without telling the team
  client.ts         ← already written
  queries/rca.ts    ← your main work
  queries/topology.ts
  hydrators/index.ts
scripts/
  db-migrate.ts     ← already written
  db-seed.ts        ← already written
infra/
  docker-compose.yml
  ci/ci.yml
```

### Step 1 — AuraDB setup
1. Create a free Neo4j AuraDB instance at https://console.neo4j.io
2. Copy `.env.example` → `.env`, fill in `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
3. Run `npm run db:migrate` — verify constraints and indexes are created in AuraDB console
4. Run `npm run db:seed` — verify 8 services and sample incident appear in AuraDB browser

### Step 2 — Implement hydrators (`packages/graph/src/hydrators/index.ts`)
Implement in this order:
1. `hydrateTopology` — MERGE Service nodes + DEPENDS_ON edges (needed by seed script)
2. `hydrateDeploy` — MERGE Service, CREATE Deploy node, CREATE DEPLOYED_TO edge
3. `hydrateAlert` — CREATE Alert node, CREATE AFFECTS edge
4. `hydrateMetric` — CREATE MetricEvent node, CREATE AFFECTS edge

Each function receives a `SentinelEvent` and writes to Neo4j. See `GRAPH_SCHEMA.md` for exact node shapes.

### Step 3 — Implement RCA queries (`packages/graph/src/queries/rca.ts`)
Implement in this order:
1. `computeBlastRadius` — copy Query 2 from `GRAPH_SCHEMA.md`, return `BlastRadiusEntry[]`
2. `findProbableCauses` — copy Query 1 from `GRAPH_SCHEMA.md`, return `ProbableCause[]`
3. `getIncidentTimeline` — copy Query 3 from `GRAPH_SCHEMA.md`, return `TimelineEvent[]`
4. `findSimilarIncidents` — copy Query 4 from `GRAPH_SCHEMA.md`, return incident IDs

### Step 4 — Implement topology queries (`packages/graph/src/queries/topology.ts`)
1. `getTopologyGraph` — copy Query 6 from `GRAPH_SCHEMA.md`, shape output for Cytoscape.js
2. `getServiceHealthSnapshot` — copy Query 5 from `GRAPH_SCHEMA.md`
3. `getServiceDetail` — single service node with its direct deps and dependents

### Step 5 — CI/CD
1. Copy `infra/ci/ci.yml` → `.github/workflows/ci.yml`
2. Add `deploy.yml` for main branch deploys once the team is ready

### Step 6 — Docker
1. `apps/backend/Dockerfile` — already written
2. `apps/frontend/Dockerfile` — already written
3. Test `docker-compose up` from the repo root

### You are done when
- `npm run db:migrate` runs clean
- `npm run db:seed` populates AuraDB with 8 services + sample incident
- All 4 hydrators write correct nodes/edges to Neo4j (verify in AuraDB browser)
- All 4 RCA queries return correct data against seeded graph
- `docker-compose up` starts backend + frontend

---

## Member 2 — AI / ML

### Your files
```
packages/ai/src/
  index.ts          ← your main work (stubs already written)
  prompts/index.ts  ← prompt templates (stubs already written)
  providers/        ← create LLM provider abstraction here
```

### Step 1 — LLM provider setup
1. Install OpenAI SDK: already in `packages/ai/package.json`
2. Create `packages/ai/src/providers/openai.ts` — thin wrapper around OpenAI chat completions
3. Create `packages/ai/src/providers/index.ts` — export a `llm(prompt: string): Promise<string>` function that reads `LLM_MODEL` from env

### Step 2 — Implement `generateNarrative`
1. Open `packages/ai/src/index.ts`
2. Import `buildNarrativePrompt` from `./prompts`
3. Call `llm(buildNarrativePrompt(chain))`
4. Parse the LLM response into `IncidentNarrative` shape
5. Test it manually by passing the seeded `CausalChain` from `scripts/db-seed.ts`

### Step 3 — Tune prompts (`packages/ai/src/prompts/index.ts`)
- Run `generateNarrative` against the seeded incident 10+ times
- Tune `buildNarrativePrompt` until the output is consistently accurate and grounded
- The narrative must not speculate beyond the `CausalChain` input

### Step 4 — Implement `detectAnomalies`
- Simple Z-score: if `(value - mean) / stddev > 2.5`, it's an anomaly
- Input: array of recent metric values for a service
- Output: `{ isAnomaly: boolean, deviationPercent: number }`

### Step 5 — Implement `clusterLogs`
- Group log messages by regex pattern similarity
- Input: array of `{ service, message, timestamp }`
- Output: array of `{ pattern, count, services[] }`
- Keep it simple — exact string prefix matching is fine for v1

### Step 6 — Postmortem generation
- Implement `buildPostmortemPrompt` in `packages/ai/src/prompts/index.ts`
- Add `generatePostmortem(chain, resolution)` to `packages/ai/src/index.ts`

### You are done when
- `generateNarrative` produces a coherent, grounded 2-3 sentence summary from the seeded incident
- `detectAnomalies` correctly flags a 420% deviation as an anomaly
- `generatePostmortem` produces a valid Markdown postmortem document

---

## Members 3 & 4 — Backend

### Your files
```
apps/backend/src/
  index.ts          ← already written, uncomment routers as you build them
  auth/router.ts    ← stubs written, you implement
  api/events.ts     ← stubs written, you implement
  api/incidents.ts  ← create this
  api/graph.ts      ← create this
  api/actions.ts    ← create this
  api/webhooks.ts   ← stubs written, you implement
  rca/engine.ts     ← stub written, you implement
  middleware/       ← create auth + RBAC middleware here
  websocket/        ← create WebSocket server here
```

### Step 1 — Auth (do this first, everything else needs it)
1. Open `apps/backend/src/auth/router.ts`
2. Install passport strategies (already in `package.json`)
3. Implement GitHub OAuth: `passport-github2` strategy → on success, MERGE User node in Neo4j, issue JWT
4. Implement GitLab OAuth: `passport-gitlab2` strategy → same flow
5. Implement `POST /auth/refresh` — verify JWT, issue new one
6. Implement `POST /auth/logout` — add token to in-memory denylist Set
7. Create `apps/backend/src/middleware/auth.ts` — JWT verify middleware, attach `req.user`
8. Create `apps/backend/src/middleware/rbac.ts` — `requireRole('admin' | 'engineer')` middleware
9. Uncomment `authRouter` in `apps/backend/src/index.ts`

### Step 2 — Event ingestion (`apps/backend/src/api/events.ts`)
1. Implement `POST /events/ingest`:
   - Validate with zod (type, service, timestamp required)
   - Assign `id` (use `crypto.randomUUID()`) and normalize timestamp
   - `eventQueue.enqueue(event)`
   - Return `202` with `eventId`
2. Set up `eventQueue.process()` in `index.ts`:
   - Call the correct hydrator from `@sentinelops/graph` based on `event.type`
   - If `event.type === 'alert'`, trigger `runRCA()`
3. Implement `GET /events` with query param filtering
4. Uncomment `eventsRouter` in `index.ts`

### Step 3 — RCA engine (`apps/backend/src/rca/engine.ts`)
1. Implement `runRCA(alertId, incidentId)`:
   - Call `findProbableCauses(alertId)` from `@sentinelops/graph`
   - Call `computeBlastRadius(service)` from `@sentinelops/graph`
   - Call `getIncidentTimeline(incidentId)` from `@sentinelops/graph`
   - Build `CausalChain` object
   - Call `generateNarrative(chain)` from `@sentinelops/ai`
   - Write narrative to Incident node in Neo4j
   - Emit `rca:complete` WebSocket event

### Step 4 — Incidents API (`apps/backend/src/api/incidents.ts`)
Create this file with:
- `GET /incidents` — query Neo4j, return list
- `GET /incidents/:id` — full incident detail with causal chain
- `POST /incidents/:id/resolve` — update Incident node status
- `GET /incidents/:id/postmortem` — call `generatePostmortem` from `@sentinelops/ai`
- `GET /incidents/:id/postmortem/export` — return Markdown as file download

### Step 5 — Graph + Services API
Create `apps/backend/src/api/graph.ts`:
- `GET /graph/topology` — call `getTopologyGraph()` from `@sentinelops/graph`
- `GET /graph/blast-radius/:serviceId` — call `computeBlastRadius()`
- `POST /graph/topology/declare` — call `hydrateTopology()`
- `GET /graph/services/:serviceId` — call `getServiceDetail()`

### Step 6 — Webhooks (`apps/backend/src/api/webhooks.ts`)
1. Implement GitHub webhook signature verification (coordinate with Members 7/8)
2. Implement GitLab token verification
3. Normalize each webhook payload into a `SentinelEvent` and enqueue

### Step 7 — WebSocket server
Create `apps/backend/src/websocket/server.ts`:
- Initialize `ws.Server` attached to the Express HTTP server
- Export `emit(type, payload)` function
- Call `emit('incident:created', incident)` from RCA engine
- Call `emit('graph:updated', topology)` after hydration

### You are done when
- GitHub OAuth login works end-to-end and returns a JWT
- `POST /events/ingest` with a deploy event writes a Deploy node to Neo4j
- `POST /events/ingest` with an alert event triggers RCA and creates an Incident
- `GET /incidents/:id` returns full incident with narrative
- WebSocket emits `rca:complete` to connected frontend clients

---

## Members 5 & 6 — Frontend

### Your files
```
apps/frontend/src/
  app/              ← Next.js app router pages
  components/       ← React components
  hooks/
    useWebSocket.ts ← stub written, you implement
  lib/
    api.ts          ← already written, use this for all API calls
```

### Step 1 — Auth pages (do this first)
1. Create `apps/frontend/src/app/login/page.tsx`:
   - Two buttons: "Sign in with GitHub" and "Sign in with GitLab"
   - Each button links to `{API_URL}/auth/github` and `{API_URL}/auth/gitlab`
2. Create `apps/frontend/src/lib/auth.tsx`:
   - React context that stores JWT in memory (useState, not localStorage)
   - `useAuth()` hook that returns `{ user, token, logout }`
3. Create `apps/frontend/src/app/layout.tsx`:
   - Wrap app in `AuthProvider`
   - Redirect unauthenticated users to `/login`

### Step 2 — Incident feed
1. Create `apps/frontend/src/app/page.tsx` — main dashboard
2. Create `apps/frontend/src/components/IncidentFeed.tsx`:
   - Fetch incidents with `api.incidents.list()`
   - Show status badge, severity, title, affected services, time ago
   - Click → navigate to `/incidents/:id`
3. Implement `useWebSocket` in `hooks/useWebSocket.ts`:
   - On `incident:created` → prepend to incident list
   - On `incident:updated` → update existing item

### Step 3 — Graph visualization
1. Create `apps/frontend/src/components/TopologyGraph.tsx`:
   - Fetch topology with `api.graph.topology()`
   - Render with `react-cytoscapejs`
   - Node color: green = healthy, yellow = degraded, red = down
   - On `graph:updated` WebSocket event → refresh graph
2. Create `apps/frontend/src/components/BlastRadiusOverlay.tsx`:
   - When an incident is selected, highlight affected nodes
   - Call `api.graph.blastRadius(serviceId)` and highlight returned services

### Step 4 — Incident detail page
Create `apps/frontend/src/app/incidents/[id]/page.tsx`:
- Fetch incident with `api.incidents.get(id)`
- Show: narrative panel, timeline, blast radius, remediation steps
- Rollback button → call `api.actions.rollback(...)`, show action status

### Step 5 — Postmortem page
Create `apps/frontend/src/app/incidents/[id]/postmortem/page.tsx`:
- Fetch with `api.incidents.postmortem(id)`
- Render formatted Markdown (use `react-markdown`)
- "Export" button → link to `{API_URL}/incidents/:id/postmortem/export`

### You are done when
- Login page shows GitHub + GitLab buttons and OAuth flow completes
- Dashboard shows live incident feed that updates via WebSocket
- Cytoscape.js graph renders the 8 seeded services with correct edges
- Incident detail page shows narrative, timeline, and rollback button

---

## Members 7 & 8 — Cybersecurity

### Your files
```
apps/backend/src/
  middleware/auth.ts      ← review and harden (Members 3/4 write it)
  middleware/rbac.ts      ← review and harden
  api/webhooks.ts         ← implement signature verification
  middleware/security.ts  ← create this (rate limiting, headers, CORS)
```

### Step 1 — Security middleware (`apps/backend/src/middleware/security.ts`)
Create this file and export middleware that Members 3/4 mount in `index.ts`:
- `helmet()` — security headers (already in index.ts, verify config)
- `cors({ origin: process.env.FRONTEND_URL })` — restrict origin
- Rate limiters using `express-rate-limit`:
  - Auth routes: 20 req/min per IP
  - Ingest: 500 req/min per token
  - Webhooks: 200 req/min per IP
  - Default: 100 req/min per token

### Step 2 — Webhook signature verification
Implement in `apps/backend/src/api/webhooks.ts` (coordinate with Members 3/4):

**GitHub:**
```
HMAC-SHA256(key=GITHUB_WEBHOOK_SECRET, data=rawBody)
Compare to X-Hub-Signature-256 header using timingSafeEqual
```

**GitLab:**
```
Compare X-Gitlab-Token header to GITLAB_WEBHOOK_SECRET using timingSafeEqual
```

Always use `crypto.timingSafeEqual` — never `===` for secret comparison.

### Step 3 — OAuth security review
Review `apps/backend/src/auth/router.ts` (written by Members 3/4) and verify:
- State parameter is generated with `crypto.randomBytes(16).toString('hex')` and stored in session
- State is validated on callback before exchanging code
- Redirect URI is hardcoded, not taken from request params
- OAuth tokens from providers are never stored — only the user profile is used

### Step 4 — JWT security review
Review JWT implementation and verify:
- Algorithm is `HS256` (not `none`)
- `JWT_SECRET` is minimum 32 chars
- Token expiry is enforced (`exp` claim checked)
- Denylist is checked on every authenticated request
- JWT payload contains no sensitive data (no passwords, no provider tokens)

### Step 5 — Cypher injection prevention
Review all Cypher queries in `packages/graph/src/` and verify:
- Every query uses parameterized queries (`$param` syntax) — never string concatenation
- No user input is interpolated directly into Cypher strings

### Step 6 — Dependency audit
- Run `npm audit` and fix any high/critical vulnerabilities
- Add `npm audit --audit-level=high` to CI (already in `infra/ci/ci.yml`)

### Step 7 — Audit trail
Add to `packages/graph/src/hydrators/index.ts` (coordinate with Member 1):
- After every state-changing action (rollback triggered, incident resolved, role changed), write an `AuditLog` node to Neo4j
- See `docs/SECURITY.md` — Audit Trail section for the node schema

### You are done when
- GitHub webhook with invalid signature returns 401
- GitLab webhook with wrong token returns 401
- Auth routes are rate limited (verify with a simple loop test)
- All Cypher queries use parameterized inputs (code review)
- `npm audit` returns zero high/critical vulnerabilities
- OAuth state validation is in place and tested
