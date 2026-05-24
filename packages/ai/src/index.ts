import { CausalChain } from '@sentinelops/graph';
import { llm } from './providers';
import { buildNarrativePrompt, buildPostmortemPrompt } from './prompts';

export interface IncidentNarrative {
  summary: string;
  remediation: { primary: string; steps: string[] };
  postmortem: { draft: string; generatedAt: string };
}

export async function generateNarrative(chain: CausalChain): Promise<IncidentNarrative> {
  const prompt = buildNarrativePrompt(chain);
  const response = await llm(prompt);
  try {
    return JSON.parse(response);
  } catch (err) {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse LLM response into JSON');
  }
}

export async function detectAnomalies(
  service: string,
  metricName: string,
  values: number[]
): Promise<{ isAnomaly: boolean; deviationPercent: number }> {
  if (values.length === 0) return { isAnomaly: false, deviationPercent: 0 };
  const latest = values[values.length - 1];
  const baseline = values.slice(0, -1);
  if (baseline.length === 0) return { isAnomaly: false, deviationPercent: 0 };

  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  if (mean === 0) return { isAnomaly: false, deviationPercent: 0 };

  const variance = baseline.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / baseline.length;
  const stddev = Math.sqrt(variance);

  const zScore = stddev === 0 ? 0 : Math.abs((latest - mean) / stddev);
  const isAnomaly = zScore > 2.5;
  const deviationPercent = ((latest - mean) / mean) * 100;

  return { isAnomaly, deviationPercent };
}

export async function clusterLogs(
  logs: Array<{ service: string; message: string; timestamp: string }>
): Promise<Array<{ pattern: string; count: number; services: string[] }>> {
  const clusters = new Map<string, { count: number; services: Set<string> }>();
  
  for (const log of logs) {
    const pattern = log.message.split(/[.:;!?]|\s{2,}/)[0].trim().substring(0, 100);
    
    if (!clusters.has(pattern)) {
      clusters.set(pattern, { count: 0, services: new Set() });
    }
    
    const cluster = clusters.get(pattern)!;
    cluster.count++;
    cluster.services.add(log.service);
  }
  
  return Array.from(clusters.entries()).map(([pattern, data]) => ({
    pattern,
    count: data.count,
    services: Array.from(data.services)
  }));
}

export async function generatePostmortem(chain: CausalChain, resolution: string): Promise<string> {
  const prompt = buildPostmortemPrompt(chain, resolution);
  return llm(prompt);
}
