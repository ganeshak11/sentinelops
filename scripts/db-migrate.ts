import 'dotenv/config';
import { getDriver, closeDriver } from '../packages/graph/src/client';

// Run once on a fresh AuraDB instance
// Usage: npm run db:migrate

const schema = `
CREATE CONSTRAINT service_name_unique IF NOT EXISTS
  FOR (s:Service) REQUIRE s.name IS UNIQUE;

CREATE CONSTRAINT deploy_id_unique IF NOT EXISTS
  FOR (d:Deploy) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT incident_id_unique IF NOT EXISTS
  FOR (i:Incident) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT alert_id_unique IF NOT EXISTS
  FOR (a:Alert) REQUIRE a.id IS UNIQUE;

CREATE INDEX service_status IF NOT EXISTS FOR (s:Service) ON (s.status);
CREATE INDEX deploy_timestamp IF NOT EXISTS FOR (d:Deploy) ON (d.timestamp);
CREATE INDEX deploy_service IF NOT EXISTS FOR (d:Deploy) ON (d.service);
CREATE INDEX alert_timestamp IF NOT EXISTS FOR (a:Alert) ON (a.firedAt);
CREATE INDEX alert_service IF NOT EXISTS FOR (a:Alert) ON (a.service);
CREATE INDEX alert_status IF NOT EXISTS FOR (a:Alert) ON (a.status);
CREATE INDEX metric_timestamp IF NOT EXISTS FOR (m:MetricEvent) ON (m.timestamp);
CREATE INDEX metric_service IF NOT EXISTS FOR (m:MetricEvent) ON (m.service);
CREATE INDEX incident_status IF NOT EXISTS FOR (i:Incident) ON (i.status);
CREATE INDEX incident_started IF NOT EXISTS FOR (i:Incident) ON (i.startedAt);
`;

async function migrate() {
  const driver = getDriver();
  const session = driver.session();
  try {
    for (const statement of schema.split(';').map(s => s.trim()).filter(Boolean)) {
      await session.run(statement);
      console.log(`✓ ${statement.split('\n')[0]}`);
    }
    console.log('\nMigration complete.');
  } finally {
    await session.close();
    await closeDriver();
  }
}

migrate().catch(console.error);
