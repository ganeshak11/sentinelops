import 'dotenv/config';
import { getDriver, closeDriver } from '../packages/graph/src/client';

// Loads a realistic demo topology + sample incident
// Usage: npm run db:seed

async function seed() {
  const driver = getDriver();
  const session = driver.session();

  try {
    // 1. Create services
    const services = [
      { name: 'api-gateway',        team: 'platform',  status: 'healthy' },
      { name: 'checkout-api',       team: 'commerce',  status: 'degraded' },
      { name: 'payment-service',    team: 'payments',  status: 'degraded' },
      { name: 'order-service',      team: 'commerce',  status: 'healthy' },
      { name: 'inventory-service',  team: 'warehouse', status: 'healthy' },
      { name: 'notification-svc',   team: 'platform',  status: 'healthy' },
      { name: 'postgres-payments',  team: 'data',      status: 'healthy' },
      { name: 'stripe-gateway',     team: 'payments',  status: 'healthy' },
    ];

    for (const svc of services) {
      await session.run(
        `MERGE (s:Service {name: $name})
         SET s.team = $team, s.status = $status,
             s.environment = 'production', s.updatedAt = datetime()`,
        svc
      );
    }
    console.log(`✓ Created ${services.length} services`);

    // 2. Create dependency edges
    const deps = [
      ['api-gateway',       'checkout-api'],
      ['api-gateway',       'order-service'],
      ['checkout-api',      'payment-service'],
      ['checkout-api',      'inventory-service'],
      ['order-service',     'inventory-service'],
      ['order-service',     'notification-svc'],
      ['payment-service',   'postgres-payments'],
      ['payment-service',   'stripe-gateway'],
    ];

    for (const [from, to] of deps) {
      await session.run(
        `MATCH (a:Service {name: $from}), (b:Service {name: $to})
         MERGE (a)-[:DEPENDS_ON {weight: 0.8, protocol: 'http', criticality: 'hard'}]->(b)`,
        { from, to }
      );
    }
    console.log(`✓ Created ${deps.length} dependency edges`);

    // 3. Create a sample deploy + incident
    await session.run(`
      MERGE (d:Deploy {id: 'deploy-seed-001'})
      SET d.service = 'payment-service', d.version = 'v2.3.1',
          d.commitSha = 'a1b2c3d4', d.branch = 'main',
          d.environment = 'production', d.author = 'engineer@company.com',
          d.status = 'success', d.timestamp = datetime() - duration('PT10M')
      WITH d
      MATCH (s:Service {name: 'payment-service'})
      MERGE (d)-[:DEPLOYED_TO]->(s)
    `);

    await session.run(`
      MERGE (a:Alert {id: 'alert-seed-001'})
      SET a.source = 'grafana', a.name = 'High P99 Latency',
          a.service = 'checkout-api', a.severity = 'critical',
          a.message = 'P99 latency exceeded 2000ms threshold',
          a.status = 'firing', a.firedAt = datetime() - duration('PT7M')
      WITH a
      MATCH (s:Service {name: 'checkout-api'})
      MERGE (a)-[:AFFECTS {detectedAt: datetime(), propagationType: 'direct'}]->(s)
    `);

    await session.run(`
      MERGE (i:Incident {id: 'inc-seed-001'})
      SET i.title = 'Latency spike in checkout-api',
          i.severity = 'critical', i.status = 'active',
          i.probableCauseId = 'deploy-seed-001',
          i.probableCauseConfidence = 0.87,
          i.blastRadius = 3,
          i.startedAt = datetime() - duration('PT7M')
      WITH i
      MATCH (d:Deploy {id: 'deploy-seed-001'})
      MERGE (i)-[:CAUSED_BY {confidence: 0.87, evidence: ['Deploy 3min before spike', 'Direct dependency']}]->(d)
    `);

    console.log('✓ Created sample deploy, alert, and incident');
    console.log('\nSeed complete. Open http://localhost:3000 to see the demo data.');
  } finally {
    await session.close();
    await closeDriver();
  }
}

seed().catch(console.error);
