import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import ImageMapQuiz from '../models/ImageMapQuiz';

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

// Upload images for image map quiz
router.post('/image-map', verifyToken, upload.fields([
  { name: 'unlabeledImage', maxCount: 1 },
  { name: 'labeledImage', maxCount: 1 }
]), async (req: any, res) => {
  try {
    const { title, description, regions, difficulty, category, tags } = req.body;
    
    if (!req.files || !req.files['unlabeledImage'] || !req.files['labeledImage']) {
      return res.status(400).json({ message: 'Both unlabeled and labeled images are required' });
    }
    
    // Parse regions from JSON string
    let parsedRegions = [];
    try {
      parsedRegions = JSON.parse(regions);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid regions format' });
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
      tags: tags ? tags.split(',') : [],
      createdBy: req.userId
    });
    
    await quiz.save();
    
    res.status(201).json({
      message: 'Image map quiz created successfully',
      quiz
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve uploaded images statically
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

export default router;