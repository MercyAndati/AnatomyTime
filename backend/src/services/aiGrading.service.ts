import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GradingResult {
  isCorrect: boolean;
  confidenceScore: number;
  pointsAwarded: number;
  maxPoints: number;
  feedback: string;
}

export class AIGradingService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('✅ Grading Service initialized via AI Studio');
  }

  async gradeFreeResponse(
    userAnswer: string,
    correctAnswer: string,
    questionText: string,
    maxPoints: number = 1
  ): Promise<GradingResult> {
    
    const prompt = `
    You are grading a student's anatomy answer. Be fair but accurate.
    
    Question: ${questionText}
    Expected answer: ${correctAnswer}
    Student's answer: ${userAnswer}
    
    Return a JSON object with:
    - pointsAwarded: number (0, ${maxPoints/2}, or ${maxPoints})
    - feedback: string (brief, constructive feedback)
    
    JSON:
    `;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');
      
      const result_data = JSON.parse(jsonMatch[0]);
      
      return {
        isCorrect: result_data.pointsAwarded === maxPoints,
        confidenceScore: 0.9,
        pointsAwarded: result_data.pointsAwarded || 0,
        maxPoints,
        feedback: result_data.feedback || 'Graded by AI'
      };
      
    } catch (error) {
      console.error('AI grading error:', error);
      throw new Error(`Grading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchGradeFreeResponse(
    questions: Array<{
      questionId: string;
      userAnswer: string;
      correctAnswer: string;
      questionText: string;
      maxPoints: number;
    }>
  ): Promise<Map<string, GradingResult>> {
    const results = new Map<string, GradingResult>();
    
    for (const q of questions) {
      try {
        const result = await this.gradeFreeResponse(
          q.userAnswer, q.correctAnswer, q.questionText, q.maxPoints
        );
        results.set(q.questionId, result);
      } catch (error) {
        console.error(`Grading failed for question ${q.questionId}:`, error);
        results.set(q.questionId, {
          isCorrect: false,
          confidenceScore: 0,
          pointsAwarded: 0,
          maxPoints: q.maxPoints,
          feedback: 'Grading temporarily unavailable'
        });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
  }
}