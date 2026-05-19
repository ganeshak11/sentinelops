import { getSession } from '../client';
import { SentinelEvent, DeployNode, AlertNode, MetricEventNode } from '../types';

export async function hydrateTopology(event: SentinelEvent): Promise<void> {
  const { dependencies } = event.metadata as { dependencies: Array<{ from: string; to: string; protocol?: string; criticality?: string }> };
  const session = getSession();
  try {
    await session.run(
      `MERGE (s:Service {name: $service})
       SET s.updatedAt = datetime(), s.environment = $environment`,
      { service: event.service, environment: (event.metadata.environment as string) ?? 'production' }
    );
    if (dependencies?.length) {
      for (const dep of dependencies) {
        await session.run(
          `MERGE (a:Service {name: $from})
           MERGE (b:Service {name: $to})
           MERGE (a)-[r:DEPENDS_ON]->(b)
           SET r.protocol = $protocol, r.criticality = $criticality,
               r.weight = 0.8, r.updatedAt = datetime()`,
          { from: dep.from, to: dep.to, protocol: dep.protocol ?? 'http', criticality: dep.criticality ?? 'hard' }
        );
      }
    }
  } finally {
    await session.close();
  }
}

export async function hydrateDeploy(event: SentinelEvent): Promise<DeployNode> {
  const meta = event.metadata as Record<string, unknown>;
  const node: DeployNode = {
    id: event.id,
    service: event.service,
    version: (meta.version as string) ?? 'unknown',
    commitSha: (meta.commitSha as string) ?? '',
    branch: (meta.branch as string) ?? 'main',
    environment: (meta.environment as string) ?? 'production',
    author: (meta.author as string) ?? 'unknown',
    status: (meta.status as DeployNode['status']) ?? 'success',
    timestamp: event.timestamp,
    rollbackOf: meta.rollbackOf as string | undefined,
  };
  const session = getSession();
  try {
    await session.run(
      `MERGE (s:Service {name: $service})
       SET s.updatedAt = datetime()
       WITH s
       CREATE (d:Deploy $props)
       CREATE (d)-[:DEPLOYED_TO]->(s)`,
      { service: node.service, props: { ...node, timestamp: new Date(node.timestamp) } }
    );
  } finally {
    await session.close();
  }
  return node;
}

export async function hydrateAlert(event: SentinelEvent): Promise<AlertNode> {
  const meta = event.metadata as Record<string, unknown>;
  const node: AlertNode = {
    id: event.id,
    source: (meta.source as string) ?? 'custom',
    name: (meta.name as string) ?? 'Alert',
    service: event.service,
    severity: event.severity ?? 'error',
    message: (meta.message as string) ?? '',
    status: 'firing',
    firedAt: event.timestamp,
  };
  const session = getSession();
  try {
    await session.run(
      `MERGE (s:Service {name: $service})
       WITH s
       CREATE (a:Alert $props)
       CREATE (a)-[:AFFECTS {detectedAt: datetime(), propagationType: 'direct'}]->(s)`,
      { service: node.service, props: { ...node, firedAt: new Date(node.firedAt) } }
    );
  } finally {
    await session.close();
  }
  return node;
}

export async function hydrateMetric(event: SentinelEvent): Promise<MetricEventNode> {
  const meta = event.metadata as Record<string, unknown>;
  const node: MetricEventNode = {
    id: event.id,
    service: event.service,
    metricName: (meta.metricName as string) ?? 'unknown',
    value: (meta.value as number) ?? 0,
    threshold: (meta.threshold as number) ?? 0,
    baseline: (meta.baseline as number) ?? 0,
    deviationPercent: (meta.deviationPercent as number) ?? 0,
    severity: event.severity ?? 'warn',
    timestamp: event.timestamp,
  };
  const session = getSession();
  try {
    await session.run(
      `MERGE (s:Service {name: $service})
       WITH s
       CREATE (m:MetricEvent $props)
       CREATE (m)-[:AFFECTS]->(s)`,
      { service: node.service, props: { ...node, timestamp: new Date(node.timestamp) } }
    );
  } finally {
    await session.close();
  }
  return node;
}
