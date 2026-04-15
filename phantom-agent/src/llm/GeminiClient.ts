import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiClient {
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { temperature: 0.2 },
    });
  }

  async plan(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    if (!text) throw new Error('Gemini returned an empty response');
    return text;
  }
}
