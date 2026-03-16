import express from 'express';
import jwt from 'jsonwebtoken';
import ImageMapQuiz from '../models/ImageMapQuiz';
import QuizAttempt from '../models/QuizAttempt';
import User from '../models/User';
import { cloudinary } from '../config/cloudinary';

const router = express.Router();

// Middleware to verify token
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.userId = (decoded as any).userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all image map quizzes
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, search, limit = 20, page = 1 } = req.query;

    let query: any = { isPublic: true };

    // Check for optional auth token to show private quizzes
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        const userId = (decoded as any).userId;
        query = {
          $or: [
            { isPublic: true },
            { createdBy: userId }
          ]
        };
      } catch (err) {
      }
    }

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    if (search) {
      query = {
        ...query,
        $text: { $search: search as string }
      };
    }

    const quizzes = await ImageMapQuiz.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await ImageMapQuiz.countDocuments(query);

    res.json({
      quizzes,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single image map quiz
router.get('/:id', async (req, res) => {
  try {
    const quiz = await ImageMapQuiz.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    quiz.plays += 1;
    await quiz.save();

    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create image map quiz
router.post('/', verifyToken, async (req: any, res: any) => {
  try {
    const { title, description, svgData, regions, difficulty, category, tags } = req.body;

    const quiz = new ImageMapQuiz({
      title,
      description,
      svgData,
      regions,
      difficulty: difficulty || 'standard',
      category: category || 'Anatomy',
      tags: tags || [],
      createdBy: req.userId
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit quiz attempt
router.post('/:id/attempt', verifyToken, async (req: any, res: any) => {
  try {
    const { answers, timeSpent } = req.body;
    const quizId = req.params.id;

    const quiz = await ImageMapQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    let correctCount = 0;
    let totalPoints = 0;
    const gradedAnswers = answers.map((answer: any) => {
      const region = quiz.regions.find(r => r.id === answer.questionId);
      const isCorrect = region?.name.toLowerCase() === answer.userAnswer.toLowerCase();

      if (isCorrect) correctCount++;
      
      const pointsAwarded = isCorrect ? 1 : 0;
      totalPoints += 1;

      return {
        questionId: answer.questionId,
        userAnswer: answer.userAnswer,
        pointsAwarded,
        maxPoints: 1,
        isCorrect,
        feedback: isCorrect ? 'Correct!' : `Correct answer: ${region?.name || 'Unknown'}`,
        gradedAt: new Date()
      };
    });

    const score = correctCount;
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    const attempt = new QuizAttempt({
      user: req.userId,
      quizRef: quizId,
      quizType: 'image-map-quiz',
      score,
      totalPoints,
      percentage,
      timeSpent: timeSpent || 0,
      answers: gradedAnswers,
      status: 'completed'
    });

    await attempt.save();

    quiz.plays += 1;
    quiz.avgScore = (quiz.avgScore * (quiz.plays - 1) + percentage) / quiz.plays;
    await quiz.save();

    res.json({
      score,
      totalPoints,
      correctCount,
      percentage,
      answers: gradedAnswers,
      attemptId: attempt._id
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete
router.delete('/:id', verifyToken, async (req: any, res: any) => {
  try {
    const quiz = await ImageMapQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is creator or admin
    if (quiz.createdBy.toString() !== req.userId) {
      const user = await User.findById(req.userId);
      if (!user?.isAdmin && quiz.createdBy.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    //Cloudinary deletion
    const deleteFromCloudinary = async (url: string) => {
      if (!url || !url.includes('cloudinary.com')) return;
      try {
        const urlParts = url.split('/');
        const folderIndex = urlParts.findIndex(part => part === 'anatomytime');
        
        if (folderIndex !== -1) {
          let publicId = urlParts.slice(folderIndex).join('/');
          if (publicId.includes('.')) {
            publicId = publicId.substring(0, publicId.lastIndexOf('.'));
          }
          
          console.log(`\n[Cloudinary] Attempting to destroy public_id: "${publicId}"`);
          
          const result = await cloudinary.uploader.destroy(publicId, { 
            resource_type: 'image',
            invalidate: true 
          });
          
          console.log(`[Cloudinary] Response for ${publicId}:`, result);
        }
      } catch (err) {
        console.error("\n[Cloudinary] API Error:", err);
      }
    };

    await deleteFromCloudinary(quiz.imageUrl);
    await deleteFromCloudinary(quiz.labeledImageUrl);

    await ImageMapQuiz.deleteOne({ _id: quiz._id });

    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share quiz
router.put('/:id/share', verifyToken, async (req: any, res: any) => {
  try {
    const quiz = await ImageMapQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const user = await User.findById(req.userId);

    if (quiz.createdBy.toString() !== req.userId && !user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (quiz.isPublic) {
      return res.status(200).json({ message: 'Quiz is already in the community', alreadyShared: true });
    }

    quiz.isPublic = true;
    await quiz.save();

    res.json({ message: 'Quiz shared to community', isPublic: quiz.isPublic });
  } catch (error) {
    console.error('Share quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unshare quiz
router.put('/:id/unshare', verifyToken, async (req: any, res: any) => {
  try {
    const quiz = await ImageMapQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const user = await User.findById(req.userId);

    if (quiz.createdBy.toString() !== req.userId && !user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    quiz.isPublic = false;
    await quiz.save();

    res.json({ message: 'Quiz removed from community', isPublic: quiz.isPublic });
  } catch (error) {
    console.error('Unshare quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a quiz
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    const quiz = await ImageMapQuiz.findById(req.params.id);
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