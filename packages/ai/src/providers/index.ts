import { geminiCompletion } from './gemini';

export async function llm(prompt: string): Promise<string> {
  const model = process.env.LLM_MODEL || 'gemini-2.0-flash';
  return geminiCompletion(prompt, model);
}
