// backend/src/routes/quiz.routes.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import CommunityPost from '../models/CommunityPost';
import { AIService } from '../services/ai.service';
import { ContentFilterService } from '../services/contentFilter.service';
import { FileExtractorService } from '../services/fileExtractor.service';
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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: PDF, DOCX, TXT') as any, false);
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
const getContentFilter = (req: any): ContentFilterService => req.app.locals.contentFilter;
const getFileExtractor = (req: any): FileExtractorService => req.app.locals.fileExtractor;
const getGradingService = (req: any): AIGradingService => { return new AIGradingService(); };

// Generate quiz from prompt and/or file
router.post('/generate', verifyToken, upload.single('file'), async (req: any, res) => {
  const aiService = getAIService(req);
  const contentFilter = getContentFilter(req);
  const fileExtractor = getFileExtractor(req);

  try {
    const { 
      prompt, 
      title, 
      topic, 
      numQuestions = 10, 
      difficulty = 'standard',
      timeLimitMinutes,
      isRapid = false
    } = req.body;

    let extractedContent = '';
    let fileMetadata = null;

    // Extract text from uploaded file
    if (req.file) {
      try {
        const result = await fileExtractor.extractText(
          req.file.path,
          req.file.mimetype,
          req.file.originalname
        );
        extractedContent = result.text;
        fileMetadata = result.metadata;
        
        console.log('Extracted content length:', extractedContent.length);
        console.log('First 200 chars:', extractedContent.substring(0, 200));
      } catch (extractError) {
        const errorMessage = extractError instanceof Error ? extractError.message : 'Unknown error';
        return res.status(400).json({ 
          message: 'Failed to extract text from file',
          error: errorMessage 
        });
      }
    }

    // Validate input
    if (!prompt && !extractedContent && !topic) {
      return res.status(400).json({ 
        message: 'Please provide a prompt, topic, or upload study materials' 
      });
    }

    // For file uploads, ONLY validate the extracted content
    let contentToValidate = '';
    let aiPromptContent = '';

    if (extractedContent) {
      contentToValidate = extractedContent;
      aiPromptContent = extractedContent;
      console.log('Validating file content only');
    } else {
      contentToValidate = prompt || `Create a quiz about ${topic || 'human anatomy'}`;
      aiPromptContent = prompt || `Create a quiz about ${topic || 'human anatomy'}`;
      console.log('Validating prompt/topic');
    }

    console.log('Content to validate length:', contentToValidate.length);
    console.log('Content preview:', contentToValidate.substring(0, 100));

    // CONTENT FILTERING
    const filterResult = await contentFilter.filterContent(contentToValidate);

    // If we have file content, do a quick anatomy check
    if (extractedContent) {
      const anatomyKeywords = [
        'heart', 'brain', 'bone', 'muscle', 'nerve', 'artery', 'vein',
        'skull', 'spine', 'rib', 'lung', 'liver', 'kidney', 'stomach',
        'anatomy', 'skeleton', 'cardiac', 'neuron', 'aorta', 'blood',
        'femur', 'tibia', 'humerus', 'clavicle', 'chamber', 'ventricle',
        'atrium', 'cranial', 'spinal', 'thoracic', 'abdominal'
      ];
      
      const hasAnatomyTerms = anatomyKeywords.some(term => 
        extractedContent.toLowerCase().includes(term)
      );
      
      console.log('Has anatomy terms:', hasAnatomyTerms);
      
      if (!hasAnatomyTerms) {
        return res.status(400).json({
          message: 'Content validation failed',
          error: 'No anatomy terminology detected in the uploaded file',
          suggestions: [
            'Ensure your file contains anatomy-related content',
            'Include terms like: heart, brain, bones, muscles, etc.',
            'Try uploading anatomy study notes or textbook excerpts'
          ]
        });
      }
    }

    // If filter fails but we have file content, do secondary check
    if (!filterResult.isValid && extractedContent) {
      console.log('Filter failed but we have file content - doing secondary check');
      
      const anatomyKeywords = [
        'heart', 'brain', 'bone', 'muscle', 'nerve', 'artery', 'vein',
        'anatomy', 'skeleton', 'cardiac', 'neuron', 'aorta', 'blood',
        'chamber', 'ventricle', 'atrium', 'spinal', 'thoracic'
      ];
      
      const foundTerms = anatomyKeywords.filter(term => 
        extractedContent.toLowerCase().includes(term)
      );
      
      if (foundTerms.length >= 3) {
        console.log('Secondary check passed - found anatomy terms:', foundTerms);
        filterResult.isValid = true;
        filterResult.detectedTopics = ['Anatomy'];
        filterResult.confidence = 0.8;
      } else {
        return res.status(400).json({
          message: 'Content validation failed',
          error: 'Uploaded file does not contain sufficient anatomy content',
          detectedTerms: foundTerms,
          suggestions: [
            'Please upload anatomy study materials',
            'Include terms like: heart, brain, bones, muscles',
            'Make sure the file contains actual anatomy text'
          ]
        });
      }
    }

    // If still not valid after checks
    if (!filterResult.isValid) {
      return res.status(400).json({
        message: 'Content validation failed',
        error: filterResult.reason || 'Please provide anatomy-related content',
        detectedTopics: filterResult.detectedTopics || [],
        suggestions: filterResult.suggestions || [
          'Try topics like: heart anatomy, skeletal system, brain structure',
          'Upload anatomy study materials'
        ]
      });
    }

    // Prepare AI prompt
    const aiPrompt = `
You are an expert anatomy educator. Create a ${difficulty} difficulty anatomy quiz.

SOURCE CONTENT:
${aiPromptContent}

DETECTED ANATOMY TOPICS:
${filterResult.detectedTopics?.join(', ') || 'Anatomy'}

REQUIREMENTS:
1. Create ${numQuestions} questions about human anatomy ONLY
2. Focus on: ${filterResult.detectedTopics?.join(', ') || 'human anatomy'}
3. Include structures, functions, and anatomical relationships
4. Questions must be clinically relevant
5. Mix multiple-choice and free-response questions

OUTPUT FORMAT (STRICT JSON):
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "text": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Detailed explanation why this is correct",
      "points": 1
    },
    {
      "id": "q2",
      "type": "free-response",
      "text": "Question text here",
      "correctAnswer": "Expected key answer",
      "explanation": "Detailed explanation",
      "points": 1
    }
  ],
  "title": "Quiz title based on content",
  "topic": "${filterResult.detectedTopics?.[0] || 'Anatomy'}",
  "difficulty": "${difficulty}"
}

Return ONLY valid JSON. No other text.
`;

    // Generate quiz with AI
    const aiResponse = await aiService.generateContent(aiPrompt, {
      temperature: 0.7,
      maxTokens: 4000
    });

    // Parse AI response
    let quizData;
    try {
      const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');
      
      quizData = JSON.parse(jsonMatch[0]);
      
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error('Missing questions array');
      }

      // Validate each question has required fields
      quizData.questions = quizData.questions.map((q: any, index: number) => ({
        id: q.id || `q${index + 1}`,
        type: q.type || 'multiple-choice',
        text: q.text || 'Anatomy question',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        points: q.points || 1
      }));

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('AI response was invalid. Please try again.');
    }

    // Validate generated content
    const validationResult = await contentFilter.validateAIContent(quizData);
    if (!validationResult.isValid) {
      console.warn('Quiz validation issues:', validationResult.issues);
    }

    // Create quiz in database
    const quiz = new Quiz({
      title: title || quizData.title || topic || filterResult.detectedTopics?.[0] || 'Anatomy Quiz',
      topic: quizData.topic || topic || filterResult.detectedTopics?.[0] || 'General Anatomy',
      description: `Generated from ${prompt ? 'prompt' : 'uploaded materials'}`,
      questions: quizData.questions,
      totalPoints: quizData.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0),
      difficulty,
      type: 'standard',
      createdBy: req.userId,
      sourcePrompt: prompt,
      sourceFileUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      timeLimitMinutes: isRapid ? (timeLimitMinutes ? parseInt(timeLimitMinutes) : 5) : null,
      isPublic: false,
      tags: [quizData.topic || topic || 'anatomy', difficulty, ...(filterResult.detectedTopics || [])].filter(Boolean)
    });

    await quiz.save();

    // Clean up uploaded file
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    res.status(201).json({
      message: 'Quiz generated successfully',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        topic: quiz.topic,
        questions: quiz.questions.map((q: any) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.options || [],
          points: q.points
        })),
        totalPoints: quiz.totalPoints,
        timeLimitMinutes: quiz.timeLimitMinutes,
        isRapid: !!quiz.timeLimitMinutes
      },
      metadata: {
        wordCount: fileMetadata?.wordCount,
        fileType: fileMetadata?.fileType,
        aiModel: aiResponse.model,
        anatomyTopics: filterResult.detectedTopics
      }
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    
    // Clean up uploaded file
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate quiz';
    res.status(500).json({ 
      message: 'Failed to generate quiz',
      error: errorMessage 
    });
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
      if (timeSpent > timeLimitSeconds) {
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