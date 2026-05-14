# SentinelOps — Graph Schema (Neo4j AuraDB)

The entire reasoning capability of SentinelOps is built on this graph. Every service, deployment, commit, metric event, alert, and incident is a node. Every relationship between them is a typed edge. Cypher queries traverse this graph to infer causality.

---

## Node Types

### Service
Represents a running application or microservice.

```cypher
(:Service {
  name: String,          // Unique identifier e.g. "payment-service"
  displayName: String,
  team: String,          // Owning team
  environment: String,   // "production" | "staging"
  status: String,        // "healthy" | "degraded" | "down"
  language: String,      // "node" | "python" | "go" etc.
  repository: String,    // GitHub repo URL
  createdAt: DateTime,
  updatedAt: DateTime
})
```

---

### Deploy
Represents a deployment event for a service.

```cypher
(:Deploy {
  id: String,            // UUID
  service: String,       // Service name
  version: String,       // Semantic version e.g. "v2.3.1"
  commitSha: String,
  branch: String,
  environment: String,
  author: String,
  status: String,        // "success" | "failed" | "rolling-back"
  timestamp: DateTime,
  rollbackOf: String     // Deploy ID if this is a rollback
})
```

---

### Commit
Represents a Git commit linked to a deployment.

```cypher
(:Commit {
  sha: String,           // Git commit SHA
  message: String,
  author: String,
  filesChanged: Integer,
  additions: Integer,
  deletions: Integer,
  timestamp: DateTime
})
```

---

### MetricEvent
Represents a metric threshold breach or anomaly.

```cypher
(:MetricEvent {
  id: String,
  service: String,
  metricName: String,    // "p99_latency" | "error_rate" | "cpu" | "memory"
  value: Float,
  threshold: Float,
  baseline: Float,
  deviationPercent: Float,
  severity: String,      // "warn" | "critical"
  timestamp: DateTime
})
```

---

### Alert
Represents a fired alert from any monitoring source.

```cypher
(:Alert {
  id: String,
  source: String,        // "pagerduty" | "grafana" | "datadog" | "custom"
  name: String,
  service: String,
  severity: String,      // "info" | "warn" | "error" | "critical"
  message: String,
  status: String,        // "firing" | "resolved"
  firedAt: DateTime,
  resolvedAt: DateTime
})
```

---

### Incident
Represents a detected production incident.

```cypher
(:Incident {
  id: String,
  title: String,
  severity: String,
  status: String,        // "active" | "resolved"
  narrative: String,     // LLM-generated summary
  probableCauseId: String,
  probableCauseConfidence: Float,
  blastRadius: Integer,  // Number of affected services
  startedAt: DateTime,
  resolvedAt: DateTime,
  mttr: Integer          // Seconds
})
```

---

## Relationship Types

### DEPENDS_ON
Service A depends on Service B.

```cypher
(:Service)-[:DEPENDS_ON {
  weight: Float,         // Coupling strength 0-1
  protocol: String,      // "http" | "grpc" | "queue" | "db"
  criticality: String,   // "hard" | "soft"
  declaredAt: DateTime,
  updatedAt: DateTime
}]->(:Service)
```

---

### DEPLOYED_TO
A deploy event belongs to a service.

```cypher
(:Deploy)-[:DEPLOYED_TO]->(:Service)
```

---

### INCLUDES_COMMIT
A deploy includes a commit.

```cypher
(:Deploy)-[:INCLUDES_COMMIT]->(:Commit)
```

---

### TRIGGERED_ALERT
A metric event triggered an alert.

```cypher
(:MetricEvent)-[:TRIGGERED_ALERT]->(:Alert)
```

---

### AFFECTS
An alert or metric event affects a service.

```cypher
(:Alert)-[:AFFECTS {
  detectedAt: DateTime,
  propagationType: String   // "direct" | "cascade"
}]->(:Service)

(:MetricEvent)-[:AFFECTS]->(:Service)
```

---

### CAUSED_BY
An incident's probable cause relationship.

```cypher
(:Incident)-[:CAUSED_BY {
  confidence: Float,
  evidence: String[]
}]->(:Deploy)

(:Incident)-[:CAUSED_BY {
  confidence: Float
}]->(:MetricEvent)
```

---

### PRECEDES
Temporal ordering between events (used for timeline reconstruction).

```cypher
(:Deploy)-[:PRECEDES {
  deltaSeconds: Integer
}]->(:Alert)
```

---

### OWNED_BY
Service ownership.

```cypher
(:Service)-[:OWNED_BY]->(:Team)
```

---

## Indexes

```cypher
-- Service lookup
CREATE INDEX service_name FOR (s:Service) ON (s.name);
CREATE INDEX service_status FOR (s:Service) ON (s.status);

-- Deploy lookup
CREATE INDEX deploy_timestamp FOR (d:Deploy) ON (d.timestamp);
CREATE INDEX deploy_service FOR (d:Deploy) ON (d.service);
CREATE INDEX deploy_version FOR (d:Deploy) ON (d.version);

-- Alert lookup
CREATE INDEX alert_timestamp FOR (a:Alert) ON (a.firedAt);
CREATE INDEX alert_service FOR (a:Alert) ON (a.service);
CREATE INDEX alert_status FOR (a:Alert) ON (a.status);

-- Metric lookup
CREATE INDEX metric_timestamp FOR (m:MetricEvent) ON (m.timestamp);
CREATE INDEX metric_service FOR (m:MetricEvent) ON (m.service);

-- Incident lookup
CREATE INDEX incident_status FOR (i:Incident) ON (i.status);
CREATE INDEX incident_started FOR (i:Incident) ON (i.startedAt);
```

---

## Core Cypher Queries

### 1. Find Probable Root Cause
Given an alert on a service, traverse upstream to find the most likely causal deploy.

```cypher
MATCH (alert:Alert {id: $alertId})-[:AFFECTS]->(svc:Service)
MATCH (deploy:Deploy)-[:DEPLOYED_TO]->(upstream:Service)
WHERE upstream.name = svc.name
  OR (upstream)-[:DEPENDS_ON*1..3]->(svc)
WITH deploy, svc,
     duration.inSeconds(deploy.timestamp, alert.firedAt).seconds AS deltaSeconds
WHERE deltaSeconds > 0 AND deltaSeconds < 600
RETURN deploy, deltaSeconds,
       (1.0 / (deltaSeconds + 1)) AS temporalScore
ORDER BY temporalScore DESC
LIMIT 5
```

---

### 2. Compute Blast Radius
Find all services affected if a given service degrades.

```cypher
MATCH (origin:Service {name: $serviceName})
MATCH path = (origin)<-[:DEPENDS_ON*1..5]-(downstream:Service)
WITH downstream,
     length(path) AS hops
RETURN downstream.name AS service,
       hops,
       CASE WHEN hops = 1 THEN 'direct' ELSE 'indirect' END AS severity
ORDER BY hops ASC
```

---

### 3. Get Full Incident Timeline
Reconstruct the ordered event sequence for an incident.

```cypher
MATCH (inc:Incident {id: $incidentId})-[:CAUSED_BY]->(cause)
MATCH (cause)-[:PRECEDES*0..10]->(event)
WHERE event:Deploy OR event:Alert OR event:MetricEvent
RETURN event, labels(event) AS eventType
ORDER BY event.timestamp ASC
```

---

### 4. Find Similar Past Incidents
Match the current failure topology against historical incidents.

```cypher
MATCH (current:Incident {id: $incidentId})-[:CAUSED_BY]->(cause:Deploy)
MATCH (cause)-[:DEPLOYED_TO]->(svc:Service)
MATCH (historical:Incident)-[:CAUSED_BY]->(pastDeploy:Deploy)-[:DEPLOYED_TO]->(svc)
WHERE historical.id <> $incidentId
  AND historical.status = 'resolved'
RETURN historical
ORDER BY historical.startedAt DESC
LIMIT 3
```

---

### 5. Service Health Snapshot
Current health of all services with recent alert and deploy activity.

```cypher
MATCH (s:Service)
OPTIONAL MATCH (s)<-[:AFFECTS]-(a:Alert {status: 'firing'})
OPTIONAL MATCH (d:Deploy)-[:DEPLOYED_TO]->(s)
  WHERE d.timestamp > datetime() - duration('PT1H')
RETURN s.name AS service,
       s.status AS status,
       count(DISTINCT a) AS activeAlerts,
       count(DISTINCT d) AS recentDeploys
ORDER BY activeAlerts DESC, recentDeploys DESC
```

---

### 6. Topology Dependency Map (for Cytoscape.js)

```cypher
MATCH (a:Service)-[r:DEPENDS_ON]->(b:Service)
RETURN a.name AS source,
       b.name AS target,
       r.weight AS weight,
       r.protocol AS protocol,
       a.status AS sourceStatus,
       b.status AS targetStatus
```

---

## Schema Initialization Script

Run once on fresh AuraDB instance:

```cypher
// Create constraints
CREATE CONSTRAINT service_name_unique IF NOT EXISTS
  FOR (s:Service) REQUIRE s.name IS UNIQUE;

CREATE CONSTRAINT deploy_id_unique IF NOT EXISTS
  FOR (d:Deploy) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT incident_id_unique IF NOT EXISTS
  FOR (i:Incident) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT alert_id_unique IF NOT EXISTS
  FOR (a:Alert) REQUIRE a.id IS UNIQUE;

// Create all indexes (see Indexes section above)
```
