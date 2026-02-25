import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIResponse {
  text: string;
  model: string;
  timestamp: Date;
}

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('✅ AI Service initialized via AI Studio');
  }

  async generateContent(
    prompt: string, 
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    const { temperature = 0.7, maxTokens = 2048 } = options;

    try {
      console.log('🚀 Sending request to Google AI Studio...');
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      });

      const response = await result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from AI');
      }

      console.log('✅ AI response received');
      
      return {
        text: text,
        model: 'gemini-2.5-flash',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(`AI Service failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}