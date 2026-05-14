// Graph Hydrators — owned by Member 1
// Backend calls these after normalizing an event. Never write to Neo4j directly from backend.

import { SentinelEvent, DeployNode, AlertNode, MetricEventNode } from '../types';

export async function hydrateDeploy(event: SentinelEvent): Promise<DeployNode> {
  // TODO: Member 1 implements
  // MERGE Service node, CREATE Deploy node, CREATE DEPLOYED_TO edge
  throw new Error('Not implemented');
}

export async function hydrateAlert(event: SentinelEvent): Promise<AlertNode> {
  // TODO: Member 1 implements
  // CREATE Alert node, CREATE AFFECTS edge to Service
  throw new Error('Not implemented');
}

export async function hydrateMetric(event: SentinelEvent): Promise<MetricEventNode> {
  // TODO: Member 1 implements
  // CREATE MetricEvent node, CREATE AFFECTS edge to Service
  throw new Error('Not implemented');
}

export async function hydrateTopology(event: SentinelEvent): Promise<void> {
  // TODO: Member 1 implements
  // MERGE Service nodes, MERGE DEPENDS_ON edges
  throw new Error('Not implemented');
}
