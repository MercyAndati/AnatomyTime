// backend/src/routes/flashcard.routes.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FlashcardSet from '../models/FlashCardSet';
import CommunityPost from '../models/CommunityPost';
import { AIService } from '../services/ai.service';
import { ContentFilterService } from '../services/contentFilter.service';
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
    cb(null, 'flashcard-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
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
      cb(new Error('Invalid file type. Supported: PDF, DOCX, TXT, Images') as any, false);
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

const getAIService = (req: any): AIService => req.app.locals.aiService;
const getContentFilter = (req: any): ContentFilterService => req.app.locals.contentFilter;
const getFileExtractor = (req: any): FileExtractorService => req.app.locals.fileExtractor;

// Generate flashcards
router.post('/generate', verifyToken, upload.single('file'), async (req: any, res) => {
  const aiService = getAIService(req);
  const contentFilter = getContentFilter(req);
  const fileExtractor = getFileExtractor(req);

  try {
    const { 
      prompt, 
      title, 
      topic, 
      numCards = 10,
      difficulty = 'standard',
      includeHints = true 
    } = req.body;

    let extractedContent = '';
    let fileMetadata = null;

    if (req.file) {
      try {
        const result = await fileExtractor.extractText(
          req.file.path,
          req.file.mimetype,
          req.file.originalname
        );
        
        extractedContent = result.text;
        fileMetadata = result.metadata;
        
        const keywords = await fileExtractor.extractKeywords(extractedContent, 10);
        
        console.log('File extracted:', {
          fileName: fileMetadata.fileName,
          wordCount: fileMetadata.wordCount,
          keywords
        });
      } catch (extractError) {
        const errorMessage = extractError instanceof Error ? extractError.message : 'Unknown error';
        return res.status(400).json({ 
          message: 'Failed to extract text from file',
          error: errorMessage 
        });
      }
    }

    if (!prompt && !extractedContent && !topic) {
      return res.status(400).json({ 
        message: 'Please provide a prompt, topic, or upload study materials' 
      });
    }

    const combinedContent = [
      prompt || `Create flashcards about ${topic || 'human anatomy'}`,
      extractedContent ? `Based on these study notes:\n${extractedContent}` : ''
    ].filter(Boolean).join('\n\n');

    const filterResult = await contentFilter.filterContent(combinedContent);
    
    if (!filterResult.isValid) {
      return res.status(400).json({
        message: 'Content validation failed',
        error: filterResult.reason,
        suggestions: filterResult.suggestions,
        detectedTopics: filterResult.detectedTopics
      });
    }

    const aiPrompt = `
You are an expert anatomy educator. Create ${numCards} high-quality anatomy flashcards.

SOURCE CONTENT:
${combinedContent}

REQUIREMENTS:
1. Focus strictly on human anatomy
2. Detected anatomy topics: ${filterResult.detectedTopics.join(', ') || 'General Anatomy'}
3. Difficulty level: ${difficulty}
4. ${includeHints ? 'Include helpful hints for each card' : 'Do not include hints'}

OUTPUT FORMAT (STRICT JSON):
{
  "flashcards": [
    {
      "id": "card1",
      "front": "What is the [question about anatomy]?",
      "back": "Detailed answer here",
      "hint": "Optional hint here"
    }
  ],
  "topic": "Specific anatomy topic covered",
  "difficulty": "${difficulty}",
  "totalCards": ${numCards},
  "keyConcepts": ["concept1", "concept2"]
}

Return ONLY valid JSON. No other text.
`;

    const aiResponse = await aiService.generateContent(aiPrompt, {
      temperature: 0.7,
      maxTokens: 3000
    });

    let flashcardData;
    try {
      const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }
      
      flashcardData = JSON.parse(jsonMatch[0]);
      
      if (!flashcardData.flashcards || !Array.isArray(flashcardData.flashcards)) {
        throw new Error('Missing flashcards array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('AI response was invalid. Please try again.');
    }

    const validationResult = await contentFilter.validateAIContent(flashcardData);
    if (!validationResult.isValid) {
      console.warn('AI content validation issues:', validationResult.issues);
    }

    const flashcardSet = new FlashcardSet({
      title: title || `Flashcards: ${flashcardData.topic || topic || 'Anatomy'}`,
      topic: flashcardData.topic || topic || 'General Anatomy',
      description: `Generated from ${prompt ? 'prompt' : 'uploaded materials'}`,
      flashcards: flashcardData.flashcards.map((card: any, index: number) => ({
        id: card.id || `card${Date.now()}-${index}`,
        front: card.front,
        back: card.back,
        hint: card.hint || '',
        mastered: false
      })),
      createdBy: req.userId,
      sourcePrompt: prompt,
      sourceFileUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      sourceFileMetadata: fileMetadata,
      isPublic: false,
      tags: [flashcardData.topic || topic || 'anatomy', difficulty, ...(flashcardData.keyConcepts || [])].filter(Boolean),
      studies: 0
    });

    await flashcardSet.save();

    console.log('Flashcards generated:', {
      setId: flashcardSet._id,
      userId: req.userId,
      cardCount: flashcardSet.flashcards.length,
      fileUsed: !!req.file,
      aiModel: aiResponse.model
    });

    res.status(201).json({
      message: 'Flashcards generated successfully',
      set: {
        id: flashcardSet._id,
        title: flashcardSet.title,
        topic: flashcardSet.topic,
        flashcards: flashcardSet.flashcards,
        tags: flashcardSet.tags,
        createdAt: flashcardSet.createdAt
      },
      metadata: {
        wordCount: fileMetadata?.wordCount,
        fileType: fileMetadata?.fileType,
        aiModel: aiResponse.model,
        validationIssues: validationResult.issues.length > 0 ? validationResult.issues : undefined
      }
    });

  } catch (error) {
    console.error('Flashcard generation error:', error);
    
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate flashcards';
    res.status(500).json({ 
      message: 'Failed to generate flashcards',
      error: errorMessage 
    });
  }
});

// Get all flashcard sets
router.get('/', async (req: any, res) => {
  try {
    const { topic, difficulty, tags, search, limit = 20, page = 1 } = req.query;

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
    if (tags) query.tags = { $in: (tags as string).split(',') };
    if (search) {
      query.$text = { $search: search as string };
    }

    const sets = await FlashcardSet.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await FlashcardSet.countDocuments(query);

    res.json({
      sets,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });

  } catch (error) {
    console.error('Get flashcard sets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single flashcard set
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID exists and is valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ 
        message: 'Invalid flashcard set ID' 
      });
    }

    // Check if it's a valid MongoDB ObjectId format
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) {
      return res.status(400).json({ 
        message: 'Invalid flashcard set ID format' 
      });
    }

    const set = await FlashcardSet.findById(id)
      .populate('createdBy', 'name email');

    if (!set) {
      return res.status(404).json({ 
        message: 'Flashcard set not found' 
      });
    }

    // Increment study count
    set.studies += 1;
    await set.save();

    res.json(set);
  } catch (error) {
    console.error('Get flashcard set error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update flashcard mastery
router.put('/:id/card/:cardId', verifyToken, async (req: any, res) => {
  try {
    const { mastered } = req.body;
    const set = await FlashcardSet.findById(req.params.id);

    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (set.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const cardIndex = set.flashcards.findIndex(card => card.id === req.params.cardId);
    if (cardIndex === -1) {
      return res.status(404).json({ message: 'Card not found' });
    }

    set.flashcards[cardIndex].mastered = mastered;
    await set.save();

    res.json({ 
      message: 'Card updated', 
      card: set.flashcards[cardIndex] 
    });

  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share flashcards to community
router.post('/:id/share', verifyToken, async (req: any, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (set.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const existingPost = await CommunityPost.findOne({ flashcardSetId: set._id });
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

// Get user's flashcard sets
router.get('/user/:userId', async (req, res) => {
  try {
    const sets = await FlashcardSet.find({ 
      createdBy: req.params.userId,
      isPublic: true 
    })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({ sets });
  } catch (error) {
    console.error('Get user sets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my flashcard sets
router.get('/my-sets/list', verifyToken, async (req: any, res) => {
  try {
    const sets = await FlashcardSet.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });

    res.json({ sets });
  } catch (error) {
    console.error('Get my sets error:', error);
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

    await CommunityPost.deleteMany({ flashcardSetId: set._id });
    await FlashcardSet.deleteOne({ _id: set._id });

    res.json({ message: 'Flashcard set deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//like flashcard in community
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
    console.error('Like flashcard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
export default router;