# SentinelOps — API Reference

**Base URL:** `http://localhost:4000/api/v1`
**Auth:** Bearer token (JWT) in `Authorization` header
**Content-Type:** `application/json`

---

## Authentication

SentinelOps uses **OAuth 2.0 only**. No email/password login. Supported providers: **GitHub** and **GitLab**.

---

### GET /auth/github

Redirect the user to GitHub OAuth authorization.

**Redirect to:**
```
https://github.com/login/oauth/authorize?client_id=...&scope=read:user,user:email&state=...
```

---

### GET /auth/github/callback

GitHub OAuth callback. Exchanges code for access token, creates or updates the user, and returns a JWT.

**Query params:**

| Param | Description |
|---|---|
| `code` | OAuth authorization code from GitHub |
| `state` | CSRF state token |

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "id": "usr_01J...",
    "login": "ganesh",
    "name": "Ganesh",
    "email": "ganesh@company.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/...",
    "provider": "github",
    "role": "engineer"
  }
}
```

**Response `401`:**
```json
{ "error": "oauth_failed", "message": "GitHub OAuth authorization failed" }
```

---

### GET /auth/gitlab

Redirect the user to GitLab OAuth authorization.

**Redirect to:**
```
https://gitlab.com/oauth/authorize?client_id=...&scope=read_user&response_type=code&state=...
```

---

### GET /auth/gitlab/callback

GitLab OAuth callback. Exchanges code for access token, creates or updates the user, and returns a JWT.

**Query params:**

| Param | Description |
|---|---|
| `code` | OAuth authorization code from GitLab |
| `state` | CSRF state token |

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "id": "usr_01J...",
    "login": "ganesh",
    "name": "Ganesh",
    "email": "ganesh@company.com",
    "avatarUrl": "https://secure.gravatar.com/avatar/...",
    "provider": "gitlab",
    "role": "engineer"
  }
}
```

---

### POST /auth/refresh

Refresh an expiring JWT token.

**Request:**
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Response `200`:**
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "expiresIn": 86400 }
```

---

### POST /auth/logout

Invalidate the current JWT token.

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

### GET /auth/me

Get the currently authenticated user.

**Response `200`:**
```json
{
  "id": "usr_01J...",
  "login": "ganesh",
  "name": "Ganesh",
  "email": "ganesh@company.com",
  "avatarUrl": "https://avatars.githubusercontent.com/u/...",
  "provider": "github",
  "role": "engineer",
  "createdAt": "2026-05-01T10:00:00Z"
}
```

---

## Events

### POST /events/ingest

Ingest a raw event into the pipeline. Used by integrations (GitHub, Grafana, etc.) and direct API clients.

**Request:**
```json
{
  "type": "deploy",
  "service": "payment-service",
  "timestamp": "2026-05-10T14:32:00Z",
  "severity": "info",
  "metadata": {
    "version": "v2.3.1",
    "commitSha": "a1b2c3d4",
    "author": "ganesh@company.com",
    "branch": "main",
    "environment": "production"
  }
}
```

**Event types:**

| Type | Description |
|---|---|
| `deploy` | A new version was deployed to an environment |
| `alert` | An alert fired (from any monitoring source) |
| `metric` | A metric data point (latency, error rate, CPU, memory) |
| `log` | A structured log line |
| `topology` | Service dependency declaration or update |

**Response `202`:**
```json
{
  "eventId": "evt_01J...",
  "status": "queued",
  "message": "Event accepted and queued for processing"
}
```

---

### GET /events

List recent events with optional filtering.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `service` | string | Filter by service name |
| `type` | string | Filter by event type |
| `severity` | string | Filter by severity |
| `from` | ISO 8601 | Start of time range |
| `to` | ISO 8601 | End of time range |
| `limit` | number | Max results (default: 50, max: 200) |

**Response `200`:**
```json
{
  "events": [
    {
      "id": "evt_01J...",
      "type": "deploy",
      "service": "payment-service",
      "timestamp": "2026-05-10T14:32:00Z",
      "severity": "info",
      "metadata": { "version": "v2.3.1" }
    }
  ],
  "total": 142,
  "hasMore": true
}
```

---

### GET /events/:id

Get a single event by ID.

**Response `200`:**
```json
{
  "id": "evt_01J...",
  "type": "deploy",
  "service": "payment-service",
  "timestamp": "2026-05-10T14:32:00Z",
  "severity": "info",
  "metadata": { "version": "v2.3.1", "commitSha": "a1b2c3d4" },
  "processedAt": "2026-05-10T14:32:01Z"
}
```

---

## Incidents

### GET /incidents

List all incidents, most recent first.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `status` | `active` \| `resolved` \| `all` | Filter by status (default: `all`) |
| `service` | string | Filter by affected service |
| `limit` | number | Max results (default: 20) |

**Response `200`:**
```json
{
  "incidents": [
    {
      "id": "inc_01J...",
      "status": "active",
      "title": "Latency spike in checkout-api",
      "severity": "critical",
      "affectedServices": ["checkout-api", "payment-service", "order-service"],
      "probableCause": {
        "service": "payment-service",
        "event": "deploy",
        "version": "v2.3.1",
        "confidence": 0.87
      },
      "startedAt": "2026-05-10T14:35:00Z",
      "resolvedAt": null,
      "mttr": null
    }
  ],
  "total": 14
}
```

---

### GET /incidents/:id

Get full incident detail including causal chain, blast radius, and narrative.

**Response `200`:**
```json
{
  "id": "inc_01J...",
  "status": "active",
  "title": "Latency spike in checkout-api",
  "severity": "critical",
  "startedAt": "2026-05-10T14:35:00Z",
  "resolvedAt": null,

  "probableCauses": [
    {
      "service": "payment-service",
      "event": { "type": "deploy", "version": "v2.3.1", "timestamp": "2026-05-10T14:32:00Z" },
      "confidence": 0.87,
      "pathFromOrigin": ["payment-service", "checkout-api", "api-gateway"],
      "evidence": [
        "Deploy v2.3.1 occurred 3 minutes before latency spike",
        "P99 latency increased 420% within 90 seconds of deploy",
        "checkout-api has direct DEPENDS_ON edge to payment-service"
      ]
    }
  ],

  "blastRadius": {
    "services": ["checkout-api", "payment-service", "order-service"],
    "hopCount": 2,
    "estimatedImpact": "3 services, ~2400 requests/min affected"
  },

  "narrative": "At 14:35 UTC, a latency spike was detected in checkout-api (P99 latency: 2400ms, up from 180ms baseline). Graph traversal identified payment-service deploy v2.3.1 at 14:32 UTC as the probable cause — the deploy occurred 3 minutes before symptom onset and checkout-api has a direct dependency on payment-service. Two additional downstream services (order-service, api-gateway) are experiencing secondary latency due to cascade propagation.",

  "remediation": {
    "primary": "Roll back payment-service to v2.3.0",
    "steps": [
      "Trigger rollback: POST /actions/rollback with serviceId and targetVersion",
      "Monitor checkout-api P99 latency for recovery (expected within 2-3 minutes)",
      "If latency does not recover in 5 minutes, check order-service independently"
    ]
  },

  "timeline": [
    { "timestamp": "2026-05-10T14:32:00Z", "event": "Deploy v2.3.1 to payment-service", "type": "deploy" },
    { "timestamp": "2026-05-10T14:34:30Z", "event": "payment-service P99 latency +340%", "type": "metric" },
    { "timestamp": "2026-05-10T14:35:00Z", "event": "checkout-api alert: high latency", "type": "alert" },
    { "timestamp": "2026-05-10T14:35:10Z", "event": "SentinelOps incident created", "type": "system" },
    { "timestamp": "2026-05-10T14:35:15Z", "event": "RCA complete — probable cause identified", "type": "system" }
  ],

  "postmortem": {
    "draft": "## Incident Postmortem — inc_01J...\n\n**Date:** May 10, 2026\n**Duration:** Ongoing\n**Severity:** Critical\n\n### Summary\n...",
    "generatedAt": "2026-05-10T14:35:20Z"
  }
}
```

---

### POST /incidents/:id/resolve

Mark an incident as resolved.

**Request:**
```json
{
  "resolvedBy": "usr_01J...",
  "resolution": "Rolled back payment-service to v2.3.0. Latency recovered within 2 minutes.",
  "rootCause": "Regression introduced in v2.3.1 payment-service — database query timeout increased P99 latency"
}
```

**Response `200`:**
```json
{
  "id": "inc_01J...",
  "status": "resolved",
  "resolvedAt": "2026-05-10T15:10:00Z",
  "mttr": 2100
}
```

---

### GET /incidents/:id/postmortem

Get the auto-generated postmortem for an incident.

**Response `200`:**
```json
{
  "incidentId": "inc_01J...",
  "title": "Postmortem: Latency spike in checkout-api — May 10, 2026",
  "severity": "critical",
  "duration": 2100,
  "summary": "Deploy v2.3.1 of payment-service introduced a database query regression that caused P99 latency to spike 420% within 90 seconds, cascading to 3 downstream services.",
  "timeline": [...],
  "rootCause": "Database query timeout regression in payment-service v2.3.1",
  "actionItems": [
    "Add query performance regression test to payment-service CI pipeline",
    "Set up canary deployment for payment-service",
    "Add P99 latency alert threshold for payment-service at 500ms"
  ],
  "generatedAt": "2026-05-10T14:35:20Z",
  "exportUrl": "/incidents/inc_01J.../postmortem/export"
}
```

---

### GET /incidents/:id/postmortem/export

Export the postmortem as a Markdown file.

**Response `200`:** `Content-Type: text/markdown` — raw Markdown document download.

---

## Graph

### GET /graph/topology

Get the full service dependency graph as a node-edge list (for Cytoscape.js rendering).

**Response `200`:**
```json
{
  "nodes": [
    { "id": "payment-service", "type": "Service", "status": "degraded", "labels": ["Service"] },
    { "id": "checkout-api", "type": "Service", "status": "degraded", "labels": ["Service"] },
    { "id": "api-gateway", "type": "Service", "status": "healthy", "labels": ["Service"] }
  ],
  "edges": [
    { "source": "checkout-api", "target": "payment-service", "type": "DEPENDS_ON" },
    { "source": "api-gateway", "target": "checkout-api", "type": "DEPENDS_ON" }
  ],
  "lastUpdated": "2026-05-10T14:35:00Z"
}
```

---

### GET /graph/blast-radius/:serviceId

Get the blast radius for a given service — all services affected if this service goes down.

**Response `200`:**
```json
{
  "service": "payment-service",
  "blastRadius": [
    { "service": "checkout-api", "hops": 1, "severity": "direct" },
    { "service": "order-service", "hops": 2, "severity": "indirect" },
    { "service": "api-gateway", "hops": 3, "severity": "indirect" }
  ],
  "totalServicesAffected": 3
}
```

---

### POST /graph/topology/declare

Declare or update service dependencies. Called by services on startup.

**Request:**
```json
{
  "service": "checkout-api",
  "version": "v1.4.2",
  "dependsOn": ["payment-service", "inventory-service"],
  "environment": "production"
}
```

**Response `200`:**
```json
{ "status": "updated", "edgesCreated": 2, "edgesUpdated": 0 }
```

---

### GET /graph/services/:serviceId

Get a single service node with its direct dependencies and dependents.

**Response `200`:**
```json
{
  "service": {
    "name": "payment-service",
    "status": "degraded",
    "team": "payments",
    "environment": "production",
    "repository": "https://github.com/org/payment-service"
  },
  "dependsOn": ["stripe-gateway", "postgres-payments"],
  "dependents": ["checkout-api", "order-service"],
  "activeAlerts": 1,
  "lastDeploy": { "version": "v2.3.1", "timestamp": "2026-05-10T14:32:00Z" }
}
```

---

## Services

### GET /services

List all registered services and their current health.

**Response `200`:**
```json
{
  "services": [
    {
      "name": "payment-service",
      "status": "degraded",
      "team": "payments",
      "environment": "production",
      "activeAlerts": 1,
      "lastDeploy": "v2.3.1"
    }
  ],
  "total": 12
}
```

---

### POST /services

Register a new service in the graph.

**Request:**
```json
{
  "name": "payment-service",
  "displayName": "Payment Service",
  "team": "payments",
  "environment": "production",
  "language": "node",
  "repository": "https://github.com/org/payment-service"
}
```

**Response `201`:**
```json
{ "name": "payment-service", "status": "healthy", "createdAt": "2026-05-10T10:00:00Z" }
```

---

## Actions

### POST /actions/rollback

Trigger a rollback for a service. Requires `admin` or `engineer` role.

**Request:**
```json
{
  "service": "payment-service",
  "targetVersion": "v2.3.0",
  "reason": "RCA identified v2.3.1 as probable cause of inc_01J...",
  "incidentId": "inc_01J..."
}
```

**Response `202`:**
```json
{
  "actionId": "act_01J...",
  "status": "triggered",
  "service": "payment-service",
  "targetVersion": "v2.3.0",
  "estimatedDuration": "2-3 minutes"
}
```

---

### GET /actions/:actionId

Get the status of a triggered action.

**Response `200`:**
```json
{
  "actionId": "act_01J...",
  "type": "rollback",
  "status": "completed",
  "service": "payment-service",
  "targetVersion": "v2.3.0",
  "triggeredAt": "2026-05-10T15:08:00Z",
  "completedAt": "2026-05-10T15:10:30Z"
}
```

---

## Webhooks (Inbound)

### POST /webhooks/github

Receives GitHub push and deployment events. Configured as a GitHub webhook.

**Headers required:**
```
X-GitHub-Event: push | deployment | deployment_status
X-Hub-Signature-256: sha256=...
```

**Supported event types:**

| `X-GitHub-Event` | Action taken |
|---|---|
| `push` | Creates a `deploy` event for the target branch |
| `deployment` | Creates a `deploy` event with environment metadata |
| `deployment_status` | Updates deploy status (`success` / `failure`) |

**Response `200`:**
```json
{ "received": true, "eventId": "evt_01J..." }
```

---

### POST /webhooks/gitlab

Receives GitLab push and pipeline events. Configured as a GitLab webhook.

**Headers required:**
```
X-Gitlab-Event: Push Hook | Pipeline Hook | Deployment Hook
X-Gitlab-Token: your-webhook-secret
```

**Supported event types:**

| `X-Gitlab-Event` | Action taken |
|---|---|
| `Push Hook` | Creates a `deploy` event for the target branch |
| `Pipeline Hook` | Creates a `deploy` event on pipeline success |
| `Deployment Hook` | Creates a `deploy` event with environment metadata |

**Response `200`:**
```json
{ "received": true, "eventId": "evt_01J..." }
```

---

### POST /webhooks/generic

Generic inbound webhook for custom alerting sources (Grafana, Datadog, PagerDuty, etc.).

**Request:**
```json
{
  "source": "grafana",
  "alertName": "High latency",
  "service": "checkout-api",
  "severity": "critical",
  "value": 2400,
  "threshold": 500,
  "timestamp": "2026-05-10T14:35:00Z"
}
```

**Response `200`:**
```json
{ "received": true, "eventId": "evt_01J..." }
```

---

## Users

### GET /users

List all users. Requires `admin` role.

**Response `200`:**
```json
{
  "users": [
    {
      "id": "usr_01J...",
      "login": "ganesh",
      "name": "Ganesh",
      "email": "ganesh@company.com",
      "provider": "github",
      "role": "admin",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

### PATCH /users/:id/role

Update a user's role. Requires `admin` role.

**Request:**
```json
{ "role": "engineer" }
```

**Roles:**

| Role | Permissions |
|---|---|
| `admin` | Full access — manage users, trigger rollbacks, configure integrations |
| `engineer` | View incidents, trigger rollbacks, declare topology |
| `viewer` | Read-only access to incidents and graph |

**Response `200`:**
```json
{ "id": "usr_01J...", "role": "engineer" }
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable description",
  "statusCode": 400
}
```

| Status | Error code | Meaning |
|---|---|---|
| `400` | `validation_error` | Request body failed schema validation |
| `401` | `unauthorized` | Missing or invalid JWT |
| `403` | `forbidden` | Authenticated but insufficient role |
| `404` | `not_found` | Resource does not exist |
| `409` | `conflict` | Resource already exists |
| `429` | `rate_limited` | Too many requests |
| `500` | `internal_error` | Unexpected server error |
| `503` | `graph_unavailable` | Neo4j AuraDB connection failed |
