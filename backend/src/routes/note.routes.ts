import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Note from '../models/Note';
import CommunityPost from '../models/CommunityPost';
import User from '../models/User';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/notes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'note-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword', // doc
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/vnd.ms-powerpoint', // ppt
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: PDF, DOCX, PPTX, TXT, Images') as any, false);
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

// Create a note
router.post('/create', verifyToken, upload.single('file'), async (req: any, res) => {
  try {
    const { title, content, tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        message: 'Title is required' 
      });
    }
    
    if (!content && !req.file) {
      return res.status(400).json({ 
        message: 'Please provide either content or a file' 
      });
    }

    const note = new Note({
      title,
      content: content || '',
      fileUrl: req.file ? `/uploads/notes/${req.file.filename}` : undefined,
      fileType: req.file ? req.file.mimetype : undefined,
      createdBy: req.userId,
      tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
      isPublic: true
    });

    await note.save();

    // Create community post with noteId reference
    const communityPost = new CommunityPost({
      title: note.title,
      content: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
      type: 'note',
      sharedBy: req.userId,
      noteId: note._id,
    });

    await communityPost.save();

    res.status(201).json({
      message: 'Note created and shared successfully',
      note: {
        id: note._id,
        title: note.title,
        content: note.content,
        fileUrl: note.fileUrl,
        fileType: note.fileType,
        tags: note.tags,
        createdAt: note.createdAt
      }
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's notes
router.get('/my-notes', verifyToken, async (req: any, res) => {
  try {
    const notes = await Note.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });

    res.json({ notes });
  } catch (error) {
    console.error('Get my notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Increment download count when viewed
    note.downloads += 1;
    await note.save();

    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve note files with correct content type
router.get('/file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/notes', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    
    // Set correct content type based on file extension
    const mimeTypes: { [key: string]: string } = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Error serving file' });
  }
});

// Like a note
router.post('/:id/like', verifyToken, async (req: any, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    note.likes += 1;
    await note.save();

    res.json({ likes: note.likes });
  } catch (error) {
    console.error('Like note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete note
router.delete('/:id', verifyToken, async (req: any, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check if user owns this note
    if (note.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete associated community post
    await CommunityPost.deleteMany({ noteId: note._id });

    // Delete associated file if exists
    if (note.fileUrl) {
      const filePath = path.join(__dirname, '../..', note.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Note.deleteOne({ _id: note._id });

    res.json({ message: 'Note and associated files deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;