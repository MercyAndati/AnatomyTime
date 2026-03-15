import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FlashcardSet from '../models/FlashCardSet';
import { AIService } from '../services/ai.service';
import CommunityPost from '../models/CommunityPost';

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
    cb(null, 'flashcard-' + uniqueSuffix + ext);
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
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const getAIService = (req: any): AIService => req.app.locals.aiService;

// Generate flashcards from prompt and/or file
router.post('/generate', verifyToken, upload.single('file'), async (req: any, res) => {
  const aiService = getAIService(req);
  let geminiFile: any = null;

  try {
    const { 
      prompt, 
      topic,
      focusTopic,
      numCards = 10, 
      difficulty = 'standard'
    } = req.body;

    if (!prompt && !req.file && !topic) {
      return res.status(400).json({ message: 'Please provide a prompt, topic, or upload study materials' });
    }

    const requestedCards = parseInt(numCards);
    if (isNaN(requestedCards) || requestedCards < 1 || requestedCards > 50) {
      return res.status(400).json({ 
        message: 'Invalid request', 
        error: 'Please request between 1 and 50 flashcards.' 
      });
    }

    // MEMORY SHIELD: capture massive copy-paste payloads
    if (prompt && prompt.length > 100000) {
      return res.status(400).json({ 
        message: 'Text payload too large', 
        error: 'Please paste a smaller section of notes (under 25,000 characters), or use the File Upload feature for entire textbook chapters.' 
      });
    }

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
    }

    if (req.file) {
      geminiFile = await aiService.uploadFileToGemini(
        req.file.path, 
        req.file.mimetype, 
        req.file.originalname
      );

      if (!geminiFile) throw new Error("Failed to upload file to AI servers.");

      console.log("Running AI file validation...");
      const validation = await aiService.validateFileContent(geminiFile.uri, geminiFile.mimeType);
      
      if (!validation.isAnatomy) {
        return res.status(400).json({
          message: 'Anatomy Content Not Detected',
          error: `The AI rejected this file: ${validation.reason}`
        });
      }
    }

    const focusInstruction = focusTopic 
      ? `\nCRITICAL INSTRUCTION: The user specifically requested to focus ONLY on: "${focusTopic}". Ignore irrelevant sections.` 
      : '';

    const aiPrompt = `
      You are an expert anatomy educator. Create a ${difficulty} difficulty set of flashcards.
      ${req.file ? `Base the flashcards ONLY on the provided document.` : `Base the flashcards on this topic: ${prompt || topic}`}
      ${focusInstruction}

      REQUIREMENTS:
      1. Create exactly ${requestedCards} flashcards.
      2. The "front" should ask a clear, specific question or state a term.
      3. The "back" should provide the medically accurate answer, definition, or explanation.
      4. Keep the "back" concise enough to be easily readable on a digital card (1-3 sentences).
      5. CRITICAL STRICT RULE: You must complete the entire JSON object. Pace your output length to guarantee the final closing brackets ']}' are printed.

      OUTPUT FORMAT (STRICT JSON):
      {
        "flashcards": [
          {
            "id": "c1",
            "front": "Question or Term here",
            "back": "Answer or Definition here"
          }
        ],
        "title": "Generate a short, specific 3-to-5 word title based on the core topic",
        "topic": "Generate a 1-to-2 word category (e.g., Neurology, Osteology)",
        "description": "A 1-sentence summary of what these flashcards cover."
      }

      Return ONLY valid JSON. No markdown formatting.
      `;

    const aiResponse = await aiService.generateContent(
      aiPrompt, 
      { temperature: 0.7, maxTokens: 8192 },
      geminiFile?.uri,
      geminiFile?.mimeType
    );

    let flashcardData;
    try {
      let cleanText = aiResponse.text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      const startIndex = cleanText.indexOf('{');
      const endIndex = cleanText.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Could not find JSON object in AI response');
      }
      
      const jsonString = cleanText.substring(startIndex, endIndex + 1);
      flashcardData = JSON.parse(jsonString);
      
      flashcardData.flashcards = flashcardData.flashcards.map((card: any, index: number) => ({
        id: card.id || `c${index + 1}`,
        front: card.front || 'Front content missing',
        back: card.back || 'Back content missing'
      }));

    } catch (parseError) {
      console.error("\nJSON PARSE FAILED");
      console.error("RAW AI OUTPUT:\n", aiResponse.text);
      throw new Error('AI response was invalid. Please try again.');
    }

    // Create flashcard set in database
    const flashcardSet = new FlashcardSet({
      title: flashcardData.title || 'Anatomy Flashcards',
      topic: flashcardData.topic || topic || 'General Anatomy',
      description: flashcardData.description || `Generated from ${req.file ? 'uploaded materials' : 'prompt'}`,
      flashcards: flashcardData.flashcards,
      createdBy: req.userId,
      isPublic: false,
    });

    await flashcardSet.save();

    res.status(201).json({
      message: 'Flashcards generated successfully',
      flashcardSet: {
        id: flashcardSet._id,
        title: flashcardSet.title,
        flashcards: flashcardSet.flashcards
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate flashcards';
    const statusCode = errorMessage.includes('SYSTEM_BUSY') ? 429 : 500;

    res.status(statusCode).json({ 
      message: errorMessage.replace('SYSTEM_BUSY: ', ''), 
      error: errorMessage 
    });
  } finally {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {} 
    }
    if (geminiFile) {
      await aiService.deleteFileFromGemini(geminiFile.name);
    }
  }
});

// Get my flashcard sets
router.get('/my-sets/list', verifyToken, async (req: any, res) => {
  try {
    const sets = await FlashcardSet.find({ createdBy: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedSets = sets.map(set => ({
      id: set._id,
      title: set.title,
      topic: set.topic,
      description: set.description,
      flashcards: set.flashcards,
      cardCount: set.flashcards.length, 
      isPublic: set.isPublic, 
      createdAt: set.createdAt
    }));

    res.json({ sets: sanitizedSets });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single flashcard set
router.get('/:id', async (req, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id)
      .populate('createdBy', 'name')
      .lean();

    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        userId = decoded.userId;
      } catch (err) {}
    }

    const isOwner = userId && set.createdBy._id.toString() === userId;

    if (!set.isPublic && !isOwner) {
      return res.status(403).json({ message: 'This flashcard set is private' });
    }

    res.json(set);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete flashcard set
router.delete('/:id', verifyToken, async (req: any, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (set.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await FlashcardSet.deleteOne({ _id: set._id });
    res.json({ message: 'Flashcard set deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Share flashcard set to community
router.post('/:id/share', verifyToken, async (req: any, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (set.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if it's already shared
    const existingPost = await CommunityPost.findOne({ resourceId: set._id });
    if (existingPost) {
      return res.status(200).json({ 
        message: 'Already shared to community',
        alreadyShared: true,
        post: existingPost
      });
    }

    const post = new CommunityPost({
      title: `Flashcards: ${set.title}`,
      type: 'flashcard_share',
      sharedBy: req.userId,
      flashcardSetId: set._id 
    });

    await post.save();

    set.isPublic = true;
    await set.save();

    res.status(201).json({ 
      message: 'Shared to community successfully',
      post 
    });

  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a flashcard set
router.post('/:id/like', verifyToken, async (req: any, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    set.likes += 1;
    await set.save();

    res.json({ likes: set.likes });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;