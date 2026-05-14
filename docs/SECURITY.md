# SentinelOps — Security

---

## Authentication

SentinelOps uses **OAuth 2.0 exclusively**. There are no passwords stored anywhere in the system.

### Supported Providers

| Provider | Scopes requested |
|---|---|
| GitHub | `read:user`, `user:email` |
| GitLab | `read_user` |

### OAuth Flow

```
1. User clicks "Sign in with GitHub / GitLab"
2. Browser redirects to provider authorization URL with state param (CSRF token)
3. Provider redirects back to /auth/{provider}/callback with code + state
4. Backend validates state, exchanges code for provider access token
5. Backend fetches user profile from provider API
6. Backend creates or updates User node in Neo4j
7. Backend issues a signed JWT (HS256, 24h expiry)
8. JWT returned to frontend, stored in memory (not localStorage)
```

### JWT

- Algorithm: `HS256`
- Expiry: `24h`
- Payload:
  ```json
  {
    "sub": "usr_01J...",
    "login": "ganesh",
    "role": "engineer",
    "provider": "github",
    "iat": 1715350000,
    "exp": 1715436400
  }
  ```
- Tokens are refreshable via `POST /auth/refresh` before expiry
- Logout invalidates the token server-side via a denylist (in-memory for dev, Redis for production)

---

## RBAC

Three roles with additive permissions:

| Permission | viewer | engineer | admin |
|---|---|---|---|
| View incidents and graph | ✅ | ✅ | ✅ |
| Ingest events via API | ❌ | ✅ | ✅ |
| Trigger rollbacks | ❌ | ✅ | ✅ |
| Declare service topology | ❌ | ✅ | ✅ |
| Resolve incidents | ❌ | ✅ | ✅ |
| Manage users and roles | ❌ | ❌ | ✅ |
| Configure integrations | ❌ | ❌ | ✅ |

Role is stored on the User node in Neo4j and embedded in the JWT. Role changes take effect on next token refresh.

The first user to authenticate is automatically assigned the `admin` role.

---

## Webhook Security

### GitHub Webhooks

All inbound GitHub webhook requests are verified using `X-Hub-Signature-256`:

```
HMAC-SHA256(secret=GITHUB_WEBHOOK_SECRET, body=rawRequestBody)
```

Requests with missing or invalid signatures are rejected with `401`.

### GitLab Webhooks

GitLab webhooks are verified using the `X-Gitlab-Token` header, compared against `GITLAB_WEBHOOK_SECRET`.

### Generic Webhooks

Generic webhooks use a shared secret passed as `X-SentinelOps-Token`, compared against `GENERIC_WEBHOOK_SECRET`.

---

## Secrets Management

All secrets are loaded from environment variables. Never committed to source control.

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs and verifies JWTs — minimum 32 chars, random |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITHUB_WEBHOOK_SECRET` | Verifies inbound GitHub webhook signatures |
| `GITLAB_CLIENT_ID` | GitLab OAuth app client ID |
| `GITLAB_CLIENT_SECRET` | GitLab OAuth app client secret |
| `GITLAB_WEBHOOK_SECRET` | Verifies inbound GitLab webhook tokens |
| `GENERIC_WEBHOOK_SECRET` | Verifies inbound generic webhook requests |
| `NEO4J_PASSWORD` | Neo4j AuraDB password |
| `OPENAI_API_KEY` | LLM API key |

In production, use a secrets manager (AWS Secrets Manager, HashiCorp Vault) rather than `.env` files.

---

## Audit Trail

Every state-changing action is written to an `AuditLog` node in Neo4j:

```cypher
(:AuditLog {
  id: String,
  userId: String,
  userLogin: String,
  action: String,       // "rollback_triggered" | "incident_resolved" | "role_changed" | ...
  resourceType: String, // "incident" | "service" | "user"
  resourceId: String,
  metadata: String,     // JSON string of action details
  ip: String,
  timestamp: DateTime
})
```

Audit logs are append-only and never deleted.

---

## Transport Security

- All production traffic must be served over HTTPS/TLS
- WebSocket connections use `wss://`
- Neo4j AuraDB connections use `neo4j+s://` (TLS enforced by AuraDB)
- CORS is restricted to the configured `FRONTEND_URL` origin in production

---

## Rate Limiting

| Endpoint group | Limit |
|---|---|
| `POST /auth/*` | 20 req/min per IP |
| `POST /events/ingest` | 500 req/min per token |
| `POST /webhooks/*` | 200 req/min per source IP |
| All other endpoints | 100 req/min per token |

Exceeding limits returns `429 Too Many Requests`.
