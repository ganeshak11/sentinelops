import 'dotenv/config';
import { generateNarrative, detectAnomalies, clusterLogs, generatePostmortem } from '../packages/ai/src/index';
import type { CausalChain } from '../packages/graph/src/types';

// ─── Seeded CausalChain (mirrors db-seed.ts incident) ────────────────────────
const seededChain: CausalChain = {
  incidentId: 'inc-seed-001',
  probableCauses: [
    {
      node: {
        id: 'deploy-seed-001',
        service: 'payment-service',
        version: 'v2.3.1',
        commitSha: 'a1b2c3d4',
        branch: 'main',
        environment: 'production',
        author: 'engineer@company.com',
        status: 'success',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      confidence: 0.87,
      pathFromOrigin: ['payment-service', 'checkout-api'],
      evidence: [
        'Deploy occurred 3 minutes before latency spike',
        'payment-service is a direct dependency of checkout-api',
      ],
    },
  ],
  blastRadius: [
    { service: 'checkout-api',    hops: 1, severity: 'direct'   },
    { service: 'api-gateway',     hops: 2, severity: 'indirect' },
    { service: 'order-service',   hops: 2, severity: 'indirect' },
  ],
  timeline: [
    {
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      event: 'payment-service v2.3.1 deployed to production by engineer@company.com',
      type: 'deploy',
    },
    {
      timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      event: 'Alert fired: P99 latency exceeded 2000ms on checkout-api',
      type: 'alert',
    },
    {
      timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      event: 'Incident inc-seed-001 created with severity: critical',
      type: 'system',
    },
  ],
};

// ─── Test utilities ───────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function ok(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ─── Test 1: generateNarrative ────────────────────────────────────────────────
async function testGenerateNarrative() {
  console.log('\n━━━ Test 1: generateNarrative ━━━');
  const narrative = await generateNarrative(seededChain);
  console.log('\n  LLM Output:');
  console.log(JSON.stringify(narrative, null, 4));

  ok('Returns an object',               typeof narrative === 'object' && narrative !== null);
  ok('Has summary string',              typeof narrative.summary === 'string' && narrative.summary.length > 20);
  ok('Summary mentions payment-service', narrative.summary.toLowerCase().includes('payment'));
  ok('Has remediation.primary',         typeof narrative.remediation?.primary === 'string');
  ok('Has remediation.steps array',     Array.isArray(narrative.remediation?.steps) && narrative.remediation.steps.length > 0);
  ok('Has postmortem.draft',            typeof narrative.postmortem?.draft === 'string' && narrative.postmortem.draft.length > 10);
  ok('Has postmortem.generatedAt',      typeof narrative.postmortem?.generatedAt === 'string');
}

// ─── Test 2: detectAnomalies ──────────────────────────────────────────────────
async function testDetectAnomalies() {
  console.log('\n━━━ Test 2: detectAnomalies ━━━');

  // Case A — 420% deviation (must be flagged)
  const highValues  = [100, 102, 98, 101, 99, 520]; // last value is spike
  const resultA = await detectAnomalies('payment-service', 'latency_p99', highValues);
  console.log(`  Case A (420% spike) →`, resultA);
  ok('Flags 420% spike as anomaly',         resultA.isAnomaly === true);
  ok('deviationPercent > 300 for spike',    resultA.deviationPercent > 300,
     `got ${resultA.deviationPercent.toFixed(1)}%`);

  // Case B — normal values (must NOT be flagged)
  const normalValues = [100, 102, 98, 101, 99, 100];
  const resultB = await detectAnomalies('payment-service', 'latency_p99', normalValues);
  console.log(`  Case B (normal)     →`, resultB);
  ok('Normal values not flagged as anomaly', resultB.isAnomaly === false);

  // Case C — empty array edge case
  const resultC = await detectAnomalies('payment-service', 'latency_p99', []);
  console.log(`  Case C (empty)      →`, resultC);
  ok('Empty array returns isAnomaly=false',  resultC.isAnomaly === false);
}

// ─── Test 3: clusterLogs ──────────────────────────────────────────────────────
async function testClusterLogs() {
  console.log('\n━━━ Test 3: clusterLogs ━━━');

  const logs = [
    { service: 'checkout-api',   message: 'Connection timeout: upstream payment-service', timestamp: new Date().toISOString() },
    { service: 'api-gateway',    message: 'Connection timeout: upstream checkout-api',    timestamp: new Date().toISOString() },
    { service: 'checkout-api',   message: 'Connection timeout: upstream payment-service', timestamp: new Date().toISOString() },
    { service: 'payment-service',message: 'DB query exceeded 5000ms threshold',           timestamp: new Date().toISOString() },
    { service: 'payment-service',message: 'DB query exceeded 5000ms threshold',           timestamp: new Date().toISOString() },
    { service: 'order-service',  message: 'Retrying request to inventory-service',        timestamp: new Date().toISOString() },
  ];

  const clusters = await clusterLogs(logs);
  console.log('\n  Clusters:');
  clusters.forEach(c => console.log(`    [${c.count}x] "${c.pattern}" — services: ${c.services.join(', ')}`));

  ok('Returns array of clusters',              Array.isArray(clusters));
  ok('Groups repeated log lines correctly',    clusters.some(c => c.count >= 2));
  ok('Single-occurrence logs appear once',     clusters.some(c => c.count === 1));
  ok('Each cluster has pattern + count + services',
     clusters.every(c => typeof c.pattern === 'string' && typeof c.count === 'number' && Array.isArray(c.services)));
}

// ─── Test 4: generatePostmortem ───────────────────────────────────────────────
async function testGeneratePostmortem() {
  console.log('\n━━━ Test 4: generatePostmortem ━━━');
  const resolution = 'Rolled back payment-service to v2.3.0. P99 latency returned to baseline within 2 minutes of rollback.';
  const postmortem = await generatePostmortem(seededChain, resolution);
  console.log('\n  Postmortem (truncated):');
  console.log(postmortem.substring(0, 600) + (postmortem.length > 600 ? '\n  ...[truncated]' : ''));

  ok('Returns a non-empty string',            typeof postmortem === 'string' && postmortem.length > 100);
  ok('Contains Markdown headings',            postmortem.includes('#'));
  ok('Mentions the incident ID',              postmortem.includes('inc-seed-001'));
  ok('Contains Executive Summary section',   postmortem.toLowerCase().includes('executive summary') || postmortem.toLowerCase().includes('summary'));
  ok('Contains Timeline section',            postmortem.toLowerCase().includes('timeline'));
  ok('Contains Root Cause section',          postmortem.toLowerCase().includes('root cause'));
  ok('Contains Action Items section',        postmortem.toLowerCase().includes('action item') || postmortem.toLowerCase().includes('action'));
  ok('Mentions the resolution',              postmortem.toLowerCase().includes('rollback') || postmortem.toLowerCase().includes('v2.3.0'));
}

// ─── Run all tests ────────────────────────────────────────────────────────────
(async () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   SentinelOps — packages/ai tests   ║');
  console.log('╚══════════════════════════════════════╝');

  if (!process.env.GEMINI_API_KEY) {
    console.error('\n❌ GEMINI_API_KEY is not set in .env — cannot run LLM tests.\n');
    process.exit(1);
  }

  try {
    await testGenerateNarrative();
    await testDetectAnomalies();
    await testClusterLogs();
    await testGeneratePostmortem();
  } catch (err) {
    console.error('\n💥 Test crashed:', err);
    failed++;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(failed > 0 ? 1 : 0);
})();
