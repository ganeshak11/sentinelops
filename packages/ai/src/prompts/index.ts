import { CausalChain } from '@sentinelops/graph';

// TODO: Member 2 — tune these prompts for accuracy and grounding

export function buildNarrativePrompt(chain: CausalChain): string {
  return `You are an SRE writing an incident summary.

CAUSAL CHAIN:
${JSON.stringify(chain.probableCauses, null, 2)}

BLAST RADIUS:
${JSON.stringify(chain.blastRadius, null, 2)}

TIMELINE:
${JSON.stringify(chain.timeline, null, 2)}

Write:
1. A 2-3 sentence incident summary (what happened, likely cause, impact)
2. Immediate remediation steps (max 3, be specific)
3. A postmortem outline (timeline, root cause, action items)

Rules:
- Do not speculate beyond the provided data
- Use probabilistic language ("likely", "probable", "evidence suggests")
- Be concise — the on-call engineer is under pressure`;
}

export function buildPostmortemPrompt(chain: CausalChain, resolution: string): string {
  return `You are an SRE writing a postmortem document.

INCIDENT DATA:
${JSON.stringify(chain, null, 2)}

RESOLUTION:
${resolution}

Write a structured postmortem with:
- Executive summary (2 sentences)
- Timeline of events
- Root cause analysis
- Impact assessment
- Action items to prevent recurrence (max 5)

Use Markdown format.`;
}
