import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function geminiCompletion(prompt: string, modelName: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
