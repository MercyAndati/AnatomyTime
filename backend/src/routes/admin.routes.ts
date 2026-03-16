import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import ImageMapQuiz from '../models/ImageMapQuiz';
import User from '../models/User';
import { imageMapStorage, cloudinary } from '../config/cloudinary';

const router = express.Router();

//Configure multer to use Cloudinary
const upload = multer({ 
  storage: imageMapStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware to verify token
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
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
    
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
    if (!req.files || !req.files['unlabeledImage'] || !req.files['labeledImage']) {
      return res.status(400).json({ error: 'Both unlabeled and labeled images are required' });
    }
    
    let parsedRegions = [];
    try {
      parsedRegions = typeof regions === 'string' ? JSON.parse(regions) : regions;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid regions format' });
    }
    
    if (!Array.isArray(parsedRegions) || parsedRegions.length === 0) {
      return res.status(400).json({ error: 'At least one region is required' });
    }
    
    // Save the Cloudinary URLs directly to the database
    const quiz = new ImageMapQuiz({
      title,
      description,
      imageUrl: req.files['unlabeledImage'][0].path,         
      labeledImageUrl: req.files['labeledImage'][0].path,   
      regions: parsedRegions,
      difficulty: difficulty || 'standard',
      category: category || 'Anatomy',
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],
      createdBy: req.userId
    });
    
    await quiz.save();
    
    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: { id: quiz._id, title: quiz.title, description: quiz.description }
    });
  } catch (error: any) {
    console.error('Admin create quiz error:', error);
    res.status(500).json({ error: error.message || 'Error creating quiz' });
  }
});

// Delete quiz and uploaded files
router.delete('/quiz/:id', verifyToken, verifyAdmin, async (req: any, res) => {
  try {
    const quizId = req.params.id;
    const quiz = await ImageMapQuiz.findById(quizId);
    
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
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
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        }
      } catch (err) {
        console.error("Cloudinary image deletion failed:", err);
      }
    };

    await deleteFromCloudinary(quiz.imageUrl);
    await deleteFromCloudinary(quiz.labeledImageUrl);
    
    await ImageMapQuiz.findByIdAndDelete(quizId);
    
    res.json({ message: 'Quiz and associated files deleted successfully' });
  } catch (error: any) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: error.message || 'Error deleting quiz' });
  }
});

// Get all quizzes for admin management
router.get('/quizzes', verifyToken, verifyAdmin, async (req: any, res) => {
  try {
    const quizzes = await ImageMapQuiz.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json({ quizzes });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching quizzes' });
  }
});

export default router;