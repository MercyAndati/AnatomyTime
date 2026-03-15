// backend/src/routes/note.routes.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import Note from '../models/Note';
import CommunityPost from '../models/CommunityPost';
import { noteStorage, cloudinary } from '../config/cloudinary';

const router = express.Router();

const upload = multer({
  storage: noteStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.') as any, false);
    }
  }
});

// Middleware
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
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
    
    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!content && !req.file) return res.status(400).json({ message: 'Please provide either content or a file' });

    // req.file.path now contains the secure Cloudinary URL!
    const note = new Note({
      title,
      content: content || '',
      fileUrl: req.file ? req.file.path : undefined, 
      fileType: req.file ? req.file.mimetype : undefined,
      createdBy: req.userId,
      tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
      isPublic: true
    });

    await note.save();

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
      note
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's notes
router.get('/my-notes', verifyToken, async (req: any, res) => {
  try {
    const notes = await Note.find({ createdBy: req.userId }).sort({ createdAt: -1 });
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('createdBy', 'name email');
    if (!note) return res.status(404).json({ message: 'Note not found' });

    note.downloads += 1;
    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a note
router.post('/:id/like', verifyToken, async (req: any, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    note.likes += 1;
    await note.save();
    res.json({ likes: note.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete note (and wipe from Cloudinary)
router.delete('/:id', verifyToken, async (req: any, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    if (note.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await CommunityPost.deleteMany({ noteId: note._id });

    // Clean up Cloudinary
    if (note.fileUrl) {
      try {
        // Extract the public_id from the Cloudinary URL
        // Example URL: https://res.cloudinary.com/demo/raw/upload/v1234/anatomytime/notes/note-123.pdf
        const urlParts = note.fileUrl.split('/');
        const folderIndex = urlParts.findIndex(part => part === 'anatomytime');
        if (folderIndex !== -1) {
          let publicId = urlParts.slice(folderIndex).join('/');
          
          // If it's a raw file (PDF/Doc), we need the extension. If it's an image, we strip it.
          const isRaw = note.fileUrl.includes('/raw/upload/');
          if (!isRaw && publicId.includes('.')) {
              publicId = publicId.substring(0, publicId.lastIndexOf('.'));
          }

          await cloudinary.uploader.destroy(publicId, { resource_type: isRaw ? 'raw' : 'image' });
        }
      } catch (err) {
        console.error("Cloudinary cleanup failed:", err);
      }
    }

    await Note.deleteOne({ _id: note._id });
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;