import { getSession } from '../client';
import { ProbableCause, BlastRadiusEntry, TimelineEvent, DeployNode, MetricEventNode } from '../types';

export async function findProbableCauses(alertId: string): Promise<ProbableCause[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (alert:Alert {id: $alertId})-[:AFFECTS]->(svc:Service)
       MATCH (deploy:Deploy)-[:DEPLOYED_TO]->(upstream:Service)
       WHERE upstream.name = svc.name
         OR (upstream)-[:DEPENDS_ON*1..3]->(svc)
       WITH deploy, svc, alert,
            duration.inSeconds(deploy.timestamp, alert.firedAt).seconds AS deltaSeconds
       WHERE deltaSeconds > 0 AND deltaSeconds < 600
       RETURN deploy, deltaSeconds,
              (1.0 / (deltaSeconds + 1)) AS temporalScore
       ORDER BY temporalScore DESC
       LIMIT 5`,
      { alertId }
    );
    return result.records.map((r) => {
      const deploy = r.get('deploy').properties as DeployNode;
      const delta = r.get('deltaSeconds') as number;
      const score = r.get('temporalScore') as number;
      return {
        node: deploy,
        confidence: Math.min(score, 1),
        pathFromOrigin: [deploy.service],
        evidence: [`Deploy ${deploy.id} occurred ${delta}s before alert fired`],
      };
    });
  } finally {
    await session.close();
  }
}

export async function computeBlastRadius(serviceName: string): Promise<BlastRadiusEntry[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (origin:Service {name: $serviceName})
       MATCH path = (origin)<-[:DEPENDS_ON*1..5]-(downstream:Service)
       WITH downstream, length(path) AS hops
       RETURN downstream.name AS service,
              hops,
              CASE WHEN hops = 1 THEN 'direct' ELSE 'indirect' END AS severity
       ORDER BY hops ASC`,
      { serviceName }
    );
    return result.records.map((r) => ({
      service: r.get('service') as string,
      hops: (r.get('hops') as number),
      severity: r.get('severity') as 'direct' | 'indirect',
    }));
  } finally {
    await session.close();
  }
}

export async function getIncidentTimeline(incidentId: string): Promise<TimelineEvent[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (inc:Incident {id: $incidentId})-[:CAUSED_BY]->(cause)
       MATCH (cause)-[:PRECEDES*0..10]->(event)
       WHERE event:Deploy OR event:Alert OR event:MetricEvent
       RETURN event, labels(event) AS eventType
       ORDER BY event.timestamp ASC`,
      { incidentId }
    );
    return result.records.map((r) => {
      const props = r.get('event').properties as Record<string, unknown>;
      const labels = r.get('eventType') as string[];
      const type = labels[0]?.toLowerCase() as TimelineEvent['type'];
      const ts = props.timestamp ?? props.firedAt ?? props.startedAt;
      return {
        timestamp: ts instanceof Date ? ts.toISOString() : String(ts),
        event: (props.message ?? props.version ?? props.metricName ?? type) as string,
        type,
      };
    });
  } finally {
    await session.close();
  }
}

export async function findSimilarIncidents(incidentId: string): Promise<string[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (current:Incident {id: $incidentId})-[:CAUSED_BY]->(cause:Deploy)
       MATCH (cause)-[:DEPLOYED_TO]->(svc:Service)
       MATCH (historical:Incident)-[:CAUSED_BY]->(pastDeploy:Deploy)-[:DEPLOYED_TO]->(svc)
       WHERE historical.id <> $incidentId
         AND historical.status = 'resolved'
       RETURN historical
       ORDER BY historical.startedAt DESC
       LIMIT 3`,
      { incidentId }
    );
    return result.records.map((r) => r.get('historical').properties.id as string);
  } finally {
    await session.close();
  }
}
