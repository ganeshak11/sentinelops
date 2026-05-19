import { getSession } from '../client';
import { ServiceNode } from '../types';

export interface TopologyGraph {
  nodes: Array<{ id: string; type: string; status: string }>;
  edges: Array<{ source: string; target: string; type: string; weight?: number; protocol?: string }>;
  lastUpdated: string;
}

export async function getTopologyGraph(): Promise<TopologyGraph> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (a:Service)-[r:DEPENDS_ON]->(b:Service)
       RETURN a.name AS source, b.name AS target,
              r.weight AS weight, r.protocol AS protocol,
              a.status AS sourceStatus, b.status AS targetStatus`
    );

    const nodeMap = new Map<string, string>();
    const edges = result.records.map((r) => {
      nodeMap.set(r.get('source'), r.get('sourceStatus') ?? 'healthy');
      nodeMap.set(r.get('target'), r.get('targetStatus') ?? 'healthy');
      return {
        source: r.get('source') as string,
        target: r.get('target') as string,
        type: 'DEPENDS_ON',
        weight: r.get('weight') as number,
        protocol: r.get('protocol') as string,
      };
    });

    const nodes = Array.from(nodeMap.entries()).map(([id, status]) => ({
      id,
      type: 'Service',
      status,
    }));

    return { nodes, edges, lastUpdated: new Date().toISOString() };
  } finally {
    await session.close();
  }
}

export async function getServiceDetail(serviceName: string): Promise<ServiceNode> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (s:Service {name: $serviceName})
       RETURN s`,
      { serviceName }
    );
    if (!result.records.length) throw new Error(`Service not found: ${serviceName}`);
    const props = result.records[0].get('s').properties as Record<string, unknown>;
    return {
      name: props.name as string,
      displayName: (props.displayName ?? props.name) as string,
      team: (props.team ?? '') as string,
      environment: (props.environment ?? 'production') as string,
      status: (props.status ?? 'healthy') as ServiceNode['status'],
      language: props.language as string | undefined,
      repository: props.repository as string | undefined,
      createdAt: props.createdAt instanceof Date ? props.createdAt.toISOString() : (props.createdAt as string) ?? new Date().toISOString(),
      updatedAt: props.updatedAt instanceof Date ? props.updatedAt.toISOString() : (props.updatedAt as string) ?? new Date().toISOString(),
    };
  } finally {
    await session.close();
  }
}

export async function getServiceHealthSnapshot(): Promise<Array<{ service: string; status: string; activeAlerts: number; recentDeploys: number }>> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (s:Service)
       OPTIONAL MATCH (s)<-[:AFFECTS]-(a:Alert {status: 'firing'})
       OPTIONAL MATCH (d:Deploy)-[:DEPLOYED_TO]->(s)
         WHERE d.timestamp > datetime() - duration('PT1H')
       RETURN s.name AS service,
              s.status AS status,
              count(DISTINCT a) AS activeAlerts,
              count(DISTINCT d) AS recentDeploys
       ORDER BY activeAlerts DESC, recentDeploys DESC`
    );
    return result.records.map((r) => ({
      service: r.get('service') as string,
      status: (r.get('status') ?? 'healthy') as string,
      activeAlerts: (r.get('activeAlerts') as number),
      recentDeploys: (r.get('recentDeploys') as number),
    }));
  } finally {
    await session.close();
  }
}
