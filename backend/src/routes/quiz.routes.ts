import express from 'express';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import CommunityPost from '../models/CommunityPost';

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Middleware
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Generate quiz from prompt
router.post('/generate', verifyToken, async (req: any, res) => {
  try {
    const { 
      prompt, 
      title, 
      topic, 
      numQuestions = 10, 
      difficulty = 'standard',
      timeLimitMinutes, // For rapid-fire mode
      isRapid = false 
    } = req.body;

    if (!prompt && !topic) {
      return res.status(400).json({ message: 'Prompt or topic is required' });
    }

    // Prepare AI prompt
    const aiPrompt = `
    Generate ${numQuestions} ${difficulty} anatomy quiz questions based on: "${prompt || topic}".
    
    Rules:
    1. Return ONLY valid JSON in this exact format:
    {
      "questions": [
        {
          "id": "q1",
          "type": "multiple-choice",
          "text": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option B",
          "explanation": "Brief explanation of why this is correct",
          "points": 1
        },
        {
          "id": "q2", 
          "type": "free-response",
          "text": "Question text here",
          "correctAnswer": "Expected answer here",
          "explanation": "Brief explanation",
          "points": 1
        }
      ]
    }
    
    2. Mix multiple-choice and free-response questions (about 70% MC, 30% FR).
    3. Make questions challenging but fair for ${difficulty} level.
    4. Focus on anatomy: structures, functions, relationships.
    5. For free-response questions, the correctAnswer should be a concise key answer.
    `;

    // Call Gemini API
    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    const questions = parsedData.questions || [];

    // Create quiz in database
    const quiz = new Quiz({
      title: title || `Quiz: ${topic || prompt.substring(0, 50)}...`,
      topic: topic || 'General Anatomy',
      questions: questions.map((q: any, index: number) => ({
        id: q.id || `q${index + 1}`,
        type: q.type,
        text: q.text,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        points: q.points || 1
      })),
      difficulty,
      type: 'standard',
      createdBy: req.userId,
      sourcePrompt: prompt,
      timeLimitMinutes: isRapid ? (timeLimitMinutes || 5) : null, // Only set for rapid-fire
      isPublic: false
    });

    await quiz.save();

    res.json({
      message: 'Quiz generated successfully',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        topic: quiz.topic,
        questions: quiz.questions,
        totalPoints: quiz.totalPoints,
        timeLimitMinutes: quiz.timeLimitMinutes,
        isRapid: !!quiz.timeLimitMinutes
      }
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    
    // Fallback: Create dummy quiz if AI fails
    if (req.body.prompt || req.body.topic) {
      const dummyQuiz = new Quiz({
        title: req.body.title || 'Sample Quiz',
        topic: req.body.topic || 'Anatomy',
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            text: 'What is the largest organ in the human body?',
            options: ['Liver', 'Skin', 'Lungs', 'Brain'],
            correctAnswer: 'Skin',
            explanation: 'The skin is the largest organ by surface area and weight.',
            points: 1
          },
          {
            id: 'q2',
            type: 'free-response',
            text: 'How many bones are in the adult human body?',
            correctAnswer: '206',
            explanation: 'The adult human skeleton typically has 206 bones.',
            points: 1
          }
        ],
        difficulty: req.body.difficulty || 'standard',
        type: 'standard',
        createdBy: req.userId,
        timeLimitMinutes: req.body.isRapid ? (req.body.timeLimitMinutes || 5) : null,
        isPublic: false
      });
      
      await dummyQuiz.save();
      
      return res.json({
        message: 'Quiz generated (fallback mode)',
        quiz: dummyQuiz
      });
    }
    
    res.status(500).json({ message: 'Failed to generate quiz' });
  }
});

// Take a quiz (create attempt)
router.post('/:id/attempt', verifyToken, async (req: any, res) => {
  try {
    const { answers, timeSpent } = req.body;
    const quizId = req.params.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Calculate score
    let score = 0;
    const gradedAnswers = quiz.questions.map((q, index) => {
      const userAnswer = answers.find((a: any) => a.questionId === q.id)?.userAnswer || '';
      let isCorrect = false;
      let pointsAwarded = 0;
      let feedback = '';

      if (q.type === 'multiple-choice') {
        isCorrect = userAnswer === q.correctAnswer;
        pointsAwarded = isCorrect ? q.points : 0;
        feedback = isCorrect ? 'Correct!' : `Correct answer: ${q.correctAnswer}`;
      } else {
        // Free-response: simple exact match for now
        // In production, you'd use your AIGradingService here
        isCorrect = userAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
        pointsAwarded = isCorrect ? q.points : 0;
        feedback = isCorrect ? 'Correct!' : `Expected: ${q.correctAnswer}`;
      }

      score += pointsAwarded;

      return {
        questionId: q.id,
        userAnswer,
        pointsAwarded,
        maxPoints: q.points,
        isCorrect,
        feedback,
        gradedAt: new Date()
      };
    });

    const totalPoints = quiz.totalPoints;
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    // Save attempt
    const attempt = new QuizAttempt({
      user: req.userId,
      quizRef: quizId,
      quizType: 'ai-quiz',
      score,
      totalPoints,
      percentage,
      timeSpent: timeSpent || 0,
      timeLimit: quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : undefined,
      answers: gradedAnswers,
      status: 'completed'
    });

    await attempt.save();

    // Update quiz stats
    quiz.attempts += 1;
    quiz.avgScore = (quiz.avgScore * (quiz.attempts - 1) + percentage) / quiz.attempts;
    await quiz.save();

    res.json({
      score,
      totalPoints,
      percentage,
      answers: gradedAnswers,
      attemptId: attempt._id
    });

  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share quiz to community
router.post('/:id/share', verifyToken, async (req: any, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (quiz.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if already shared
    const existingPost = await CommunityPost.findOne({ quizId: quiz._id });
    if (existingPost) {
      return res.status(200).json({ 
        message: 'Already shared to community',
        alreadyShared: true 
      });
    }

    // Create community post
    const post = new CommunityPost({
      title: `Quiz: ${quiz.title}`,
      type: 'quiz_share',
      sharedBy: req.userId,
      quizId: quiz._id
    });

    await post.save();

    // Make quiz public
    quiz.isPublic = true;
    await quiz.save();

    res.json({ 
      message: 'Shared to community',
      post 
    });

  } catch (error) {
    console.error('Share quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's saved quizzes
router.get('/my-quizzes', verifyToken, async (req: any, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });

    res.json({ quizzes });
  } catch (error) {
    console.error('Get my quizzes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz attempt history
router.get('/attempts/:quizId', verifyToken, async (req: any, res) => {
  try {
    const attempts = await QuizAttempt.find({
      user: req.userId,
      quizRef: req.params.quizId,
      quizType: 'ai-quiz'
    }).sort({ createdAt: -1 });

    res.json({ attempts });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;