// backend/src/routes/upload.routes.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { FileExtractorService } from '../services/fileExtractor.service';

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
    cb(null, 'upload-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type') as any, false);
    }
  }
});

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

// Upload and extract text from file
router.post('/extract', verifyToken, upload.single('file'), async (req: any, res) => {
  const fileExtractor = req.app.locals.fileExtractor as FileExtractorService;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await fileExtractor.extractText(
      req.file.path,
      req.file.mimetype,
      req.file.originalname
    );

    // Extract keywords for preview
    const keywords = await fileExtractor.extractKeywords(result.text, 15);

    res.json({
      message: 'File processed successfully',
      data: {
        text: result.text.substring(0, 1000) + '...', // Preview
        fullLength: result.text.length,
        metadata: result.metadata,
        keywords,
        sections: result.sections
      }
    });

    } catch (error) {
    console.error('Upload extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    
    res.status(500).json({ 
      message: 'Failed to process file',
      error: errorMessage 
    });
  }
});

// Validate file before upload
router.post('/validate', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileExtractor = req.app.locals.fileExtractor as FileExtractorService;
    const contentFilter = req.app.locals.contentFilter;

    // Extract text
    const result = await fileExtractor.extractText(
      req.file.path,
      req.file.mimetype,
      req.file.originalname
    );

    // Validate content
    const filterResult = await contentFilter.filterContent(result.text);

    // Clean up
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({
      valid: filterResult.isValid,
      message: filterResult.reason || 'File is valid',
      metadata: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        wordCount: result.metadata.wordCount
      },
      anatomyTopics: filterResult.detectedTopics,
      suggestions: filterResult.suggestions
    });

    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      
      res.status(500).json({ 
        message: 'Validation failed',
        error: errorMessage 
      });
    }
});

// Get supported file types
router.get('/supported-types', (req, res) => {
  res.json({
    types: [
      { mime: 'application/pdf', extension: '.pdf', name: 'PDF Document' },
      { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx', name: 'Word Document' },
      { mime: 'text/plain', extension: '.txt', name: 'Text File' },
      { mime: 'image/jpeg', extension: '.jpg,.jpeg', name: 'JPEG Image' },
      { mime: 'image/png', extension: '.png', name: 'PNG Image' },
      { mime: 'image/gif', extension: '.gif', name: 'GIF Image' },
      { mime: 'image/webp', extension: '.webp', name: 'WebP Image' }
    ],
    maxSize: '50MB'
  });
});

export default router;