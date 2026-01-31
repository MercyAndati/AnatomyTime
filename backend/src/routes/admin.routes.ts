import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import ImageMapQuiz from '../models/ImageMapQuiz';
import User from '../models/User';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to verify token
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

// Middleware to verify admin
const verifyAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error verifying admin status' });
  }
};

router.get('/health-test', (req, res) => {
  res.json({ status: 'OK', message: 'Admin routes working' });
});

// Create quiz with file uploads
router.post('/create-quiz', verifyToken, upload.fields([
  { name: 'unlabeledImage', maxCount: 1 },
  { name: 'labeledImage', maxCount: 1 }
]), async (req: any, res) => {
  try {
    const { title, description, regions, difficulty, category, tags } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    if (!req.files || !req.files['unlabeledImage'] || !req.files['labeledImage']) {
      return res.status(400).json({ error: 'Both unlabeled and labeled images are required' });
    }
    
    // Parse regions from JSON string
    let parsedRegions = [];
    try {
      parsedRegions = typeof regions === 'string' ? JSON.parse(regions) : regions;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid regions format' });
    }
    
    if (!Array.isArray(parsedRegions) || parsedRegions.length === 0) {
      return res.status(400).json({ error: 'At least one region is required' });
    }
    
    // Create the image map quiz
    const quiz = new ImageMapQuiz({
      title,
      description,
      imageUrl: `/uploads/${req.files['unlabeledImage'][0].filename}`,
      labeledImageUrl: `/uploads/${req.files['labeledImage'][0].filename}`,
      regions: parsedRegions,
      difficulty: difficulty || 'standard',
      category: category || 'Anatomy',
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
      createdBy: req.userId
    });
    
    await quiz.save();
    
    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description
      }
    });
  } catch (error: any) {
    console.error('Admin create quiz error:', error);
    res.status(500).json({ error: error.message || 'Error creating quiz' });
  }
});

// Delete quiz (admin only) - deletes quiz and uploaded files
router.delete('/quiz/:id', verifyToken, verifyAdmin, async (req: any, res) => {
  try {
    const quizId = req.params.id;
    
    // Find the quiz
    const quiz = await ImageMapQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Delete uploaded image files
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    if (quiz.imageUrl) {
      const imagePath = path.join(uploadsDir, path.basename(quiz.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Deleted image:', imagePath);
      }
    }
    
    if (quiz.labeledImageUrl) {
      const labeledImagePath = path.join(uploadsDir, path.basename(quiz.labeledImageUrl));
      if (fs.existsSync(labeledImagePath)) {
        fs.unlinkSync(labeledImagePath);
        console.log('Deleted labeled image:', labeledImagePath);
      }
    }
    
    // Delete quiz from database
    await ImageMapQuiz.findByIdAndDelete(quizId);
    
    res.json({ 
      message: 'Quiz and associated files deleted successfully' 
    });
  } catch (error: any) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: error.message || 'Error deleting quiz' });
  }
});

// Get all quizzes for admin management
router.get('/quizzes', verifyToken, verifyAdmin, async (req: any, res) => {
  try {
    const quizzes = await ImageMapQuiz.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ quizzes });
  } catch (error: any) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: error.message || 'Error fetching quizzes' });
  }
});

// Simple admin panel for you to create quizzes (legacy endpoint)
router.post('/create-image-map', async (req, res) => {
  try {
    const { title, description, imageUrl, labeledImageUrl, regions, difficulty, category } = req.body;
    
    // Hardcoded admin user ID (you'll replace with your actual admin ID)
    const ADMIN_USER_ID = 'your-admin-id-here'; // Get this from your database
    
    const quiz = new ImageMapQuiz({
      title,
      description,
      imageUrl,
      labeledImageUrl,
      regions: Array.isArray(regions) ? regions : JSON.parse(regions),
      difficulty: difficulty || 'standard',
      category: category || 'Anatomy',
      tags: [],
      createdBy: ADMIN_USER_ID
    });
    
    await quiz.save();
    
    res.json({ 
      success: true, 
      message: 'Quiz created successfully',
      quizId: quiz._id 
    });
  } catch (error) {
    console.error('Admin create error:', error);
    res.status(500).json({ success: false, message: 'Error creating quiz' });
  }
});

export default router;