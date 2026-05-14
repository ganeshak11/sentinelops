// ─── Primitives ───────────────────────────────────────────────────────────────

export type EventType = 'deploy' | 'alert' | 'metric' | 'log' | 'topology';
export type Severity = 'info' | 'warn' | 'error' | 'critical';
export type ServiceStatus = 'healthy' | 'degraded' | 'down';
export type IncidentStatus = 'active' | 'resolved';
export type UserRole = 'admin' | 'engineer' | 'viewer';
export type OAuthProvider = 'github' | 'gitlab';

// ─── Events ───────────────────────────────────────────────────────────────────

export interface SentinelEvent {
  id: string;
  type: EventType;
  service: string;
  timestamp: string;           // ISO 8601
  severity?: Severity;
  metadata: Record<string, unknown>;
  rawPayload?: unknown;
}

// ─── Graph Nodes ──────────────────────────────────────────────────────────────

export interface ServiceNode {
  name: string;
  displayName: string;
  team: string;
  environment: string;
  status: ServiceStatus;
  language?: string;
  repository?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeployNode {
  id: string;
  service: string;
  version: string;
  commitSha: string;
  branch: string;
  environment: string;
  author: string;
  status: 'success' | 'failed' | 'rolling-back';
  timestamp: string;
  rollbackOf?: string;
}

export interface AlertNode {
  id: string;
  source: string;
  name: string;
  service: string;
  severity: Severity;
  message: string;
  status: 'firing' | 'resolved';
  firedAt: string;
  resolvedAt?: string;
}

export interface MetricEventNode {
  id: string;
  service: string;
  metricName: string;
  value: number;
  threshold: number;
  baseline: number;
  deviationPercent: number;
  severity: Severity;
  timestamp: string;
}

export interface IncidentNode {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  narrative?: string;
  probableCauseId?: string;
  probableCauseConfidence?: number;
  blastRadius?: number;
  startedAt: string;
  resolvedAt?: string;
  mttr?: number;
}

export type GraphNode = ServiceNode | DeployNode | AlertNode | MetricEventNode | IncidentNode;

// ─── RCA Engine Output ────────────────────────────────────────────────────────

export interface ProbableCause {
  node: DeployNode | MetricEventNode;
  confidence: number;           // 0–1
  pathFromOrigin: string[];     // service names
  evidence: string[];
}

export interface BlastRadiusEntry {
  service: string;
  hops: number;
  severity: 'direct' | 'indirect';
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
  type: EventType | 'system';
}

export interface CausalChain {
  incidentId: string;
  probableCauses: ProbableCause[];
  blastRadius: BlastRadiusEntry[];
  timeline: TimelineEvent[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  provider: OAuthProvider;
  role: UserRole;
  createdAt: string;
}

export interface JWTPayload {
  sub: string;
  login: string;
  role: UserRole;
  provider: OAuthProvider;
  iat: number;
  exp: number;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
