import axios from 'axios';

export interface GradingResult {
  isCorrect: boolean;
  confidenceScore: number; // 0 to 1
  pointsAwarded: number;
  feedback: string;
}

export class AIGradingService {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, provider: 'gemini' | 'openai' | 'claude' = 'gemini') {
    this.apiKey = apiKey;
    this.baseURL = this.getBaseURL(provider);
  }

  private getBaseURL(provider: string): string {
    switch(provider) {
      case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      case 'openai': return 'https://api.openai.com/v1/chat/completions';
      default: return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }
  }

  async gradeFreeResponse(
    userAnswer: string,
    correctAnswer: string,
    questionText: string,
    maxPoints: number = 1
  ): Promise<GradingResult> {
    const prompt = `
    You are grading a student's free-response answer in an anatomy quiz.
    
    QUESTION: ${questionText}
    CORRECT ANSWER: ${correctAnswer}
    STUDENT'S ANSWER: ${userAnswer}
    
    Grade the student's answer with these rules:
    1. If the answer is essentially correct (even if wording differs), award FULL points (${maxPoints})
    2. If the answer is partially correct or contains some correct elements, award HALF points (${maxPoints/2})
    3. If the answer is incorrect or unrelated, award ZERO points
    
    Provide your response in this EXACT JSON format:
    {
      "confidenceScore": 0.95,
      "pointsAwarded": ${maxPoints},
      "feedback": "Brief, helpful feedback for the student",
      "isCorrect": true
    }
    
    confidenceScore should be between 0-1 (1 = very confident).
    pointsAwarded should be ${maxPoints}, ${maxPoints/2}, or 0.
    `;

    try {
      // Using Gemini API (free tier)
      const response = await axios.post(
        `${this.baseURL}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const resultText = response.data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // Apply your 3-tier scoring system
        let finalPoints = 0;
        if (result.pointsAwarded === maxPoints) {
          finalPoints = maxPoints;
        } else if (result.pointsAwarded === maxPoints / 2) {
          finalPoints = maxPoints / 2;
        }
        
        return {
          isCorrect: result.isCorrect,
          confidenceScore: result.confidenceScore,
          pointsAwarded: finalPoints,
          feedback: result.feedback
        };
      }
      
      throw new Error('Invalid response format from AI');
      
    } catch (error) {
      console.error('AI grading error:', error);
      // Fallback: Simple keyword matching
      return this.fallbackGrading(userAnswer, correctAnswer, maxPoints);
    }
  }

  private fallbackGrading(
    userAnswer: string,
    correctAnswer: string,
    maxPoints: number
  ): GradingResult {
    const userWords = userAnswer.toLowerCase().split(/\s+/);
    const correctWords = correctAnswer.toLowerCase().split(/\s+/);
    
    const commonWords = userWords.filter(word => 
      correctWords.includes(word) && word.length > 3
    );
    
    const similarity = commonWords.length / Math.max(userWords.length, correctWords.length);
    
    let pointsAwarded = 0;
    let feedback = '';
    
    if (similarity > 0.7) {
      pointsAwarded = maxPoints;
      feedback = 'Answer is correct!';
    } else if (similarity > 0.3) {
      pointsAwarded = maxPoints / 2;
      feedback = 'Partially correct. Review the material.';
    } else {
      feedback = 'Incorrect. Please review this topic.';
    }
    
    return {
      isCorrect: pointsAwarded === maxPoints,
      confidenceScore: similarity,
      pointsAwarded,
      feedback
    };
  }

  // Batch grade multiple free-response questions
  async batchGradeFreeResponse(
    questions: Array<{
      userAnswer: string;
      correctAnswer: string;
      questionText: string;
      maxPoints: number;
      questionId: string;
    }>
  ): Promise<Map<string, GradingResult>> {
    const results = new Map<string, GradingResult>();
    
    // Grade in parallel for speed
    const gradingPromises = questions.map(async (q) => {
      const result = await this.gradeFreeResponse(
        q.userAnswer,
        q.correctAnswer,
        q.questionText,
        q.maxPoints
      );
      results.set(q.questionId, result);
    });
    
    await Promise.all(gradingPromises);
    return results;
  }
}