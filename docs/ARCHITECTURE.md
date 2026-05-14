# SentinelOps — Architecture

## Overview

SentinelOps is a real-time, event-driven incident reasoning platform. Its core design principle is **graph-first reasoning**: every relationship between services, deployments, commits, metrics, and alerts is stored as a typed edge in Neo4j AuraDB, enabling Cypher-native traversal for causal analysis.

The AI layer (LLM) is downstream of the graph — it translates a structured causal chain into a human-readable narrative. The graph does the reasoning. The LLM does the communication.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT SOURCES                            │
│  GitHub Webhooks  │  CI/CD Logs  │  App Logs  │  Metrics/Alerts │
└────────┬──────────┴──────┬───────┴──────┬─────┴────────┬────────┘
         │                 │              │              │
         ▼                 ▼              ▼              ▼
┌────────────────────────────────────────────────────────────────┐
│                    EVENT INGESTION SERVICE                     │
│         Normalizes all events into canonical format            │
│         Validates schema, assigns timestamps, deduplicates     │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                      EVENT QUEUE                               │
│              In-memory queue (Bull/Redis)                      │
└───────────────────────────┬────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐
│  GRAPH HYDRATOR │  │   ANOMALY    │  │   LOG CLUSTERING     │
│                 │  │  DETECTOR    │  │                      │
│ Writes nodes +  │  │              │  │ Groups log patterns  │
│ edges to Neo4j  │  │ Flags metric │  │ by service + time    │
│ in real time    │  │ deviations   │  │ window               │
└────────┬────────┘  └──────┬───────┘  └──────────┬───────────┘
         │                  │                       │
         ▼                  ▼                       ▼
┌────────────────────────────────────────────────────────────────┐
│                     NEO4J AURADB                               │
│           Live service dependency knowledge graph              │
│   Nodes: Service, Deploy, Commit, Metric, Alert, Incident      │
│   Edges: DEPENDS_ON, TRIGGERED_BY, AFFECTS, PRECEDES, OWNS     │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                      RCA ENGINE                                │
│                                                                │
│  1. Identify trigger node (deploy / alert / metric spike)      │
│  2. Traverse DEPENDS_ON edges — find downstream services       │
│  3. Score probable root cause by path weight + recency         │
│  4. Compute blast radius (reachability within N hops)          │
│  5. Build ordered causal chain                                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    LLM NARRATIVE LAYER                         │
│                                                                │
│  Input: structured causal chain from RCA engine (NOT raw logs) │
│  Output: human-readable incident narrative                     │
│          + remediation recommendation                          │
│          + postmortem draft                                    │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                     FRONTEND DASHBOARD                         │
│                                                                │
│  Real-time incident feed    │  Dependency graph (Cytoscape.js) │
│  Blast radius visualization │  Incident narrative panel        │
│  Remediation suggestions    │  Postmortem timeline             │
└────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Event Ingestion Service

**Responsibility:** Normalize all incoming event types into a canonical `SentinelEvent` format.

**Input types:**
- `deploy` — GitHub webhook on push/release
- `alert` — PagerDuty/Grafana/Datadog webhook
- `metric` — Time-series data points (latency, error rate, CPU)
- `log` — Structured log lines from application services
- `topology` — Service dependency declarations (on startup or change)

**Canonical event format:**
```typescript
interface SentinelEvent {
  id: string;                    // UUID
  type: 'deploy' | 'alert' | 'metric' | 'log' | 'topology';
  service: string;               // Service name
  timestamp: string;             // ISO 8601
  severity?: 'info' | 'warn' | 'error' | 'critical';
  metadata: Record<string, unknown>;
  rawPayload: unknown;
}
```

---

### 2. Graph Hydrator

**Responsibility:** Write normalized events into Neo4j as typed nodes and edges in real time.

Every service interaction, deploy event, and metric spike becomes a node. Every dependency relationship and causal connection becomes an edge. The graph is always live — not rebuilt at incident time.

**Key operations:**
- `MERGE (s:Service {name: $name})` — upsert service nodes
- Create `Deploy` nodes linked to the deploying service
- Create `Commit` nodes linked to deploy nodes
- Update `DEPENDS_ON` edges when topology changes
- Create `Metric` nodes with threshold breach flags

---

### 3. RCA Engine

**Responsibility:** When an incident is detected, traverse the graph to produce a scored causal chain.

**Algorithm:**
1. Identify the candidate trigger node (highest severity alert, or most recent deploy in the affected service cluster)
2. Run upstream traversal: `MATCH (trigger)<-[:AFFECTS*1..5]-(root)` to find probable origin
3. Run downstream traversal: `MATCH (trigger)-[:DEPENDS_ON*1..3]->(downstream)` for blast radius
4. Score each candidate root cause by: path length (shorter = higher score), temporal proximity to anomaly onset, and number of downstream services affected
5. Return ordered list of probable causes with confidence scores

**Output:**
```typescript
interface CausalChain {
  incidentId: string;
  probableCauses: Array<{
    node: GraphNode;
    confidence: number;       // 0-1
    pathFromOrigin: GraphNode[];
    evidence: string[];
  }>;
  blastRadius: GraphNode[];
  timeline: TimelineEvent[];
}
```

---

### 4. LLM Narrative Layer

**Responsibility:** Translate the structured `CausalChain` into a human-readable incident report.

**Important:** The LLM receives the structured causal chain as input — not raw logs. This grounds the output in the actual graph traversal result, prevents hallucination, and keeps the narrative factually accurate.

**Prompt structure:**
```
You are an SRE writing an incident summary.

CAUSAL CHAIN:
[structured JSON from RCA engine]

TIMELINE:
[ordered events with timestamps]

Write:
1. A 2-3 sentence incident summary (what happened, likely cause, impact)
2. Immediate remediation steps (max 3)
3. A postmortem outline (timeline, root cause, action items)

Do not speculate beyond the provided data. Use probabilistic language.
```

---

### 5. Frontend Dashboard

**Responsibility:** Surface the incident narrative and graph visualization in real time via WebSocket.

**Key panels:**
- **Incident feed** — Live stream of active and recent incidents
- **Dependency graph** — Cytoscape.js visualization of service topology, with affected nodes highlighted
- **Blast radius map** — Visual overlay of impact propagation
- **Narrative panel** — LLM-generated incident summary with copy-to-clipboard
- **Remediation panel** — Actionable steps with one-click rollback trigger
- **Postmortem timeline** — Chronological event sequence, exportable

---

## Data Flow: Incident Lifecycle

```
1. Deploy fires  →  GitHub webhook  →  Ingestion service
2. Latency spike →  Metric event    →  Ingestion service
3. Alert fires   →  Alert event     →  Ingestion service
                                           │
                                           ▼
                                    Graph hydrated with
                                    new Deploy node +
                                    Metric node +
                                    Alert node
                                           │
                                    RCA Engine triggered
                                           │
                                    Cypher traversal:
                                    - Find deploy N minutes before spike
                                    - Trace affected downstream services
                                    - Score blast radius
                                           │
                                    Causal chain → LLM
                                           │
                                    Narrative generated
                                           │
                                    WebSocket push → Dashboard
                                           │
                                    Engineer sees:
                                    "Deploy v2.3.1 of payment-service
                                     caused latency spike in checkout-api
                                     (3 downstream services affected).
                                     Recommended: rollback to v2.3.0."
```

---

## Neo4j Graph Schema

See [GRAPH_SCHEMA.md](./GRAPH_SCHEMA.md) for full node types, relationships, indexes, and example Cypher queries.

---

## Security Architecture

See [SECURITY.md](./SECURITY.md) for auth, RBAC, and secrets management.

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker Compose and production deployment.

---

## Architecture Decisions

See [ADR Index](./adr/README.md) for all architecture decision records.

| ADR | Decision |
|---|---|
| [ADR-001](./adr/ADR-001-graph-database.md) | Use Neo4j AuraDB as the primary reasoning substrate |
| [ADR-002](./adr/ADR-002-llm-downstream.md) | LLM receives structured causal chain, not raw logs |
| [ADR-003](./adr/ADR-003-websocket-realtime.md) | WebSocket for real-time dashboard updates |
| [ADR-004](./adr/ADR-004-event-queue.md) | In-process queue for hackathon scope, replaceable with Redis/Bull |
| [ADR-005](./adr/ADR-005-monorepo.md) | Monorepo with npm workspaces |
