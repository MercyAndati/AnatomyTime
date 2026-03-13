import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import CommunityPost from '../models/CommunityPost';
import { AIService } from '../services/ai.service';
import { AIGradingService } from '../services/aiGrading.service';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'quiz-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 130 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
      'application/vnd.ms-powerpoint',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: PDF, DOCX, PPTX, TXT') as any, false);
    }
  }
});

// Middleware
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get services from app locals
const getAIService = (req: any): AIService => req.app.locals.aiService;
const getGradingService = (req: any): AIGradingService => { return new AIGradingService(); };

// Generate quiz from prompt and/or file
router.post('/generate', verifyToken, upload.single('file'), async (req: any, res) => {
  const aiService = getAIService(req);

  let geminiFile: any = null;

  try {
    const { 
      prompt, 
      title, 
      topic,
      focusTopic,
      questionType = 'mixed',
      numQuestions = 10, 
      difficulty = 'standard',
      timeLimitMinutes,
      isRapid = false
    } = req.body;

    if (!prompt && !req.file && !topic) {
      return res.status(400).json({ message: 'Please provide a prompt, topic, or upload study materials' });
    }

    const requestedQuestions = parseInt(numQuestions);
    if (isNaN(requestedQuestions) || requestedQuestions < 1 || requestedQuestions > 50) {
      return res.status(400).json({ 
        message: 'Invalid request', 
        error: 'Please request between 1 and 50 questions.' 
      });
    }

    // MEMORY SHIELD: capture massive copy-paste payloads
    if (prompt && prompt.length > 100000) {
      return res.status(400).json({ 
        message: 'Text payload too large', 
        error: 'Please paste a smaller section of notes (under 25,000 characters), or use the File Upload feature for entire textbook chapters.' 
      });
    }

    //text only request
    if (!req.file) {
      const contentToValidate = prompt || topic || '';
      
      console.log("Running AI validation check on text input...");
      const validation = await aiService.validateTextContent(contentToValidate);
      
      if (!validation.isAnatomy) {
        return res.status(400).json({
          message: 'Content validation failed',
          error: `The AI rejected this text: ${validation.reason}`
        });
      }
      console.log("AI Text validation approved the notes!");
    }

    // file upload pipeline
    if (req.file) {
      // 1. Upload to Gemini
      geminiFile = await aiService.uploadFileToGemini(
        req.file.path, 
        req.file.mimetype, 
        req.file.originalname
      );

      if (!geminiFile) throw new Error("Failed to upload file to AI servers.");

      // 2. The AI file Validation
      console.log("Running AI file validation...");
      const validation = await aiService.validateFileContent(geminiFile.uri, geminiFile.mimeType);
      
      if (!validation.isAnatomy) {
        return res.status(400).json({
          message: 'Anatomy Content Not Detected',
          error: `The AI rejected this file: ${validation.reason}`
        });
      }
      console.log("AI file validator approved the file!");
    }

    // content generaton
    const focusInstruction = focusTopic 
      ? `\nCRITICAL INSTRUCTION: The user specifically requested to focus ONLY on: "${focusTopic}". Ignore irrelevant sections.` 
      : '';

    const aiPrompt = `
      You are an expert anatomy educator. Create a ${difficulty} difficulty anatomy quiz.
      ${req.file ? `Base the quiz ONLY on the provided document.` : `Base the quiz on this topic: ${prompt || topic}`}
      ${focusInstruction}

      REQUIREMENTS:
      1. Create exactly ${numQuestions} questions.
      2. QUESTION TYPES: ${
        questionType === 'multiple-choice' ? 'Generate ONLY multiple-choice questions.' : 
        questionType === 'free-response' ? 'Generate ONLY free-response questions.' : 
        'Mix both multiple-choice and free-response questions.'
      }
      3. EXPLANATIONS: Produce appropriate explanations where necessary. If the question is easy/direct, use 1 brief sentence. If it is a hard question requiring context, use 2-3 sentences max. DO NOT write massive paragraphs.
      4. CRITICAL STRICT RULE: You must complete the entire JSON object. Pace your output length to guarantee the final closing brackets ']}' are printed.

      OUTPUT FORMAT (STRICT JSON):
      {
        "questions": [
          {
            "id": "q1",
            "type": "multiple-choice", 
            "text": "Question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"], 
            "correctAnswer": "The exact correct answer here", 
            "explanation": "Brief, appropriate explanation here.",
            "points": 1
          }
        ],
        "title": "Generate a short, specific 3-to-5 word title based on the core topic of the document or prompt",
        "topic": "Generate a 1-to-2 word category (e.g., Neurology, Osteology)",
        "difficulty": "${difficulty}"
      }

      Return ONLY valid JSON. No markdown formatting.
      `;

    const aiResponse = await aiService.generateContent(
      aiPrompt, 
      { temperature: 0.7, maxTokens: 8192 }, 
      geminiFile?.uri,
      geminiFile?.mimeType
    );

    //PARSE AND SANITIZE JSON
    let quizData;
    try {
      // 1. Strip out Markdown formatting that AI sometimes adds
      let cleanText = aiResponse.text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      
      // 2. Safely extract the JSON object
      const startIndex = cleanText.indexOf('{');
      const endIndex = cleanText.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Could not find JSON object in AI response');
      }
      
      const jsonString = cleanText.substring(startIndex, endIndex + 1);
      quizData = JSON.parse(jsonString);
      
      // 3.Ensure every question has the required DB fields
      quizData.questions = quizData.questions.map((q: any, index: number) => ({
        ...q,
        id: q.id || `q${index + 1}`,
        type: q.type || 'multiple-choice',
        correctAnswer: q.correctAnswer || q.answer || 'Answer not provided by AI', 
        options: Array.isArray(q.options) ? q.options : [],
        explanation: q.explanation || 'No explanation provided.',
        points: q.points || 1
      }));

    } catch (parseError) {
      console.error("\nJSON PARSE FAILED");
      console.error("RAW AI OUTPUT THAT CAUSED THE CRASH:\n", aiResponse.text);
      throw new Error('AI response was invalid. Please try again.');
    }

    // Create quiz in database
    const quiz = new Quiz({
      title: title || quizData.title || 'Anatomy Quiz',
      topic: quizData.topic || topic || 'General Anatomy',
      description: `Generated from ${prompt ? 'prompt' : 'uploaded materials'}`,
      questions: quizData.questions,
      totalPoints: quizData.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0),
      difficulty,
      type: 'standard',
      createdBy: req.userId,
      timeLimitMinutes: isRapid ? (timeLimitMinutes ? parseInt(timeLimitMinutes) : 5) : null,
      isPublic: false,
    });

    await quiz.save();

    res.status(201).json({
      message: 'Quiz generated successfully',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        questions: quiz.questions,
        totalPoints: quiz.totalPoints,
        timeLimitMinutes: quiz.timeLimitMinutes,
      }
    });

  } catch (error) {
    //Catch the custom Rate Limit error or standard errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate quiz';
    
    // If it's a rate limit error, send a 429 status code back to the frontend
    const statusCode = errorMessage.includes('SYSTEM_BUSY') ? 429 : 500;

    res.status(statusCode).json({ 
      message: errorMessage.replace('SYSTEM_BUSY: ', ''), 
      error: errorMessage 
    });
  } finally {
    //delete files to save space!
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {} // Delete local Multer file
    }
    if (geminiFile) {
      await aiService.deleteFileFromGemini(geminiFile.name);
    }
  }
});

// Get my quizzes
router.get('/my-quizzes/list', verifyToken, async (req: any, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedQuizzes = quizzes.map(quiz => ({
      id: quiz._id,
      title: quiz.title,
      topic: quiz.topic,
      description: quiz.description,
      questions: quiz.questions.map(q => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options || [],
        points: q.points
      })),
      totalPoints: quiz.totalPoints,
      difficulty: quiz.difficulty,
      timeLimitMinutes: quiz.timeLimitMinutes,
      isRapid: !!quiz.timeLimitMinutes,
      isPublic: quiz.isPublic,
      tags: quiz.tags,
      attempts: quiz.attempts,
      avgScore: Math.round(quiz.avgScore),
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt
    }));

    res.json({ quizzes: sanitizedQuizzes });
  } catch (error) {
    console.error('Get my quizzes error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Server error';
    res.status(500).json({ message: errorMessage });
  }
});

// Get all quizzes (public)
router.get('/', async (req, res) => {
  try {
    const { topic, difficulty, search, limit = 20, page = 1 } = req.query;

    let query: any = { isPublic: true };

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        query = {
          $or: [
            { isPublic: true },
            { createdBy: decoded.userId }
          ]
        };
      } catch (err) {}
    }

    if (topic) query.topic = { $regex: topic, $options: 'i' };
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.$text = { $search: search };
    }

    const quizzes = await Quiz.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Quiz.countDocuments(query);

    const sanitizedQuizzes = quizzes.map(quiz => ({
      id: quiz._id,
      title: quiz.title,
      topic: quiz.topic,
      description: quiz.description,
      questionCount: quiz.questions.length,
      difficulty: quiz.difficulty,
      timeLimitMinutes: quiz.timeLimitMinutes,
      createdBy: quiz.createdBy,
      attempts: quiz.attempts,
      avgScore: Math.round(quiz.avgScore),
      likes: quiz.likes,
      createdAt: quiz.createdAt
    }));

    res.json({
      quizzes: sanitizedQuizzes,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });

  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single quiz
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    let hasAttempted = false;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        userId = decoded.userId;
        
        const attemptExists = await QuizAttempt.exists({
          user: userId,
          quizRef: quiz._id,
          quizType: 'ai-quiz'
        });
        hasAttempted = !!attemptExists;
      } catch (err) {}
    }

    const isOwner = userId && quiz.createdBy._id.toString() === userId;

    if (!quiz.isPublic && !isOwner) {
      return res.status(403).json({ message: 'Quiz is private' });
    }

    await Quiz.findByIdAndUpdate(quiz._id, { $inc: { attempts: 1 } });

    if (!isOwner && !hasAttempted) {
      const sanitizedQuestions = quiz.questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options || [],
        correctAnswer: '',
        explanation: '',
        points: q.points,
        _id: q._id
      }));
      quiz.questions = sanitizedQuestions;
    }

    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Take a quiz
router.post('/:id/attempt', verifyToken, async (req: any, res) => {
  const gradingService = getGradingService(req);

  try {
    const { answers, timeSpent, isRapid = false } = req.body;
    const quizId = req.params.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.timeLimitMinutes && isRapid) {
      const timeLimitSeconds = quiz.timeLimitMinutes * 60;
      //Added a 30-second grace period to account for network latency and auto-submit delays
      if (timeSpent > timeLimitSeconds + 30) {
        return res.status(400).json({ 
          message: 'Time limit exceeded',
          timeLimit: quiz.timeLimitMinutes,
          timeSpent: Math.floor(timeSpent / 60),
          timeLimitSeconds
        });
      }
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }

    let totalScore = 0;
    const gradedAnswers = [];
    const freeResponseQuestions = [];

    for (const answer of answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      if (question.type === 'multiple-choice') {
        const isCorrect = answer.userAnswer === question.correctAnswer;
        const pointsAwarded = isCorrect ? question.points : 0;
        totalScore += pointsAwarded;

        gradedAnswers.push({
          questionId: question.id,
          userAnswer: answer.userAnswer,
          pointsAwarded,
          maxPoints: question.points,
          isCorrect,
          feedback: isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${question.correctAnswer}`,
          gradedAt: new Date()
        });
      } else {
        freeResponseQuestions.push({
          questionId: question.id,
          userAnswer: answer.userAnswer,
          correctAnswer: question.correctAnswer,
          questionText: question.text,
          maxPoints: question.points
        });
      }
    }

    if (freeResponseQuestions.length > 0) {
      const gradedFR = await gradingService.batchGradeFreeResponse(freeResponseQuestions);
      
      for (const [questionId, result] of gradedFR) {
        totalScore += result.pointsAwarded;
        
        const answer = answers.find((a: any) => a.questionId === questionId);
        gradedAnswers.push({
          questionId,
          userAnswer: answer?.userAnswer || '',
          pointsAwarded: result.pointsAwarded,
          maxPoints: result.maxPoints,
          isCorrect: result.isCorrect,
          feedback: result.feedback,
          gradedAt: new Date()
        });
      }
    }

    const totalPoints = quiz.totalPoints;
    const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

    const attempt = new QuizAttempt({
      user: req.userId,
      quizRef: quizId,
      quizType: 'ai-quiz',
      score: totalScore,
      totalPoints,
      percentage,
      timeSpent: timeSpent || 0,
      timeLimit: quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : undefined,
      answers: gradedAnswers,
      status: 'completed',
      completedAt: new Date()
    });

    await attempt.save();

    const allAttempts = await QuizAttempt.find({ 
      quizRef: quizId, 
      quizType: 'ai-quiz' 
    });
    
    const avgPercentage = allAttempts.reduce((sum, a) => sum + a.percentage, 0) / allAttempts.length;
    
    await Quiz.findByIdAndUpdate(quizId, {
      $inc: { attempts: 1 },
      avgScore: Math.round(avgPercentage)
    });

    res.json({
      attemptId: attempt._id,
      score: totalScore,
      totalPoints,
      percentage,
      answers: gradedAnswers.map(a => ({
        questionId: a.questionId,
        isCorrect: a.isCorrect,
        pointsAwarded: a.pointsAwarded,
        maxPoints: a.maxPoints,
        feedback: a.feedback
      })),
      completedAt: attempt.completedAt
    });

  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Get ALL user attempts for the Dashboard stats
router.get('/attempts/my-all', verifyToken, async (req: any, res) => {
  try {
    const attempts = await QuizAttempt.find({ 
      user: req.userId,
      quizType: 'ai-quiz' 
    }).lean();
    res.json({ attempts });
  } catch (error) {
    console.error('Get all attempts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz attempts
router.get('/attempts/:quizId', verifyToken, async (req: any, res) => {
  try {
    const attempts = await QuizAttempt.find({
      user: req.userId,
      quizRef: req.params.quizId,
      quizType: 'ai-quiz'
    }).sort({ createdAt: -1 }).lean();

    res.json({ attempts });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share quiz to community
router.post('/:id/share', verifyToken, async (req: any, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const existingPost = await CommunityPost.findOne({ quizId: quiz._id });
    if (existingPost) {
      return res.status(200).json({ 
        message: 'Already shared to community',
        alreadyShared: true,
        post: existingPost
      });
    }

    const post = new CommunityPost({
      title: `Quiz: ${quiz.title}`,
      type: 'quiz_share',
      sharedBy: req.userId,
      quizId: quiz._id
    });

    await post.save();

    quiz.isPublic = true;
    await quiz.save();

    res.status(201).json({ 
      message: 'Shared to community successfully',
      post 
    });

  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete quiz
router.delete('/:id', verifyToken, async (req: any, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await CommunityPost.deleteMany({ quizId: quiz._id });
    await QuizAttempt.deleteMany({ quizRef: quiz._id, quizType: 'ai-quiz' });
    await Quiz.deleteOne({ _id: quiz._id });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a quiz
router.post('/:id/like', verifyToken, async (req: any, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    quiz.likes += 1;
    await quiz.save();

    res.json({ likes: quiz.likes });
  } catch (error) {
    console.error('Like quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
export default router;