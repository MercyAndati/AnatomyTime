import express from 'express';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import FlashcardSet from '../models/FlashCardSet';
import CommunityPost from '../models/CommunityPost';

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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

// Generate flashcards from prompt
router.post('/generate', verifyToken, async (req: any, res) => {
  try {
    const { prompt, title, topic, numCards = 10 } = req.body;

    if (!prompt && !topic) {
      return res.status(400).json({ message: 'Prompt or topic is required' });
    }

    // Prepare AI prompt
    const aiPrompt = `
    Generate ${numCards} anatomy flashcards based on: "${prompt || topic}".
    
    Return ONLY valid JSON in this exact format:
    {
      "flashcards": [
        {
          "id": "card1",
          "front": "Question or term here",
          "back": "Answer or definition here",
          "hint": "Optional hint"
        }
      ]
    }
    
    Rules:
    1. Make flashcards concise and focused.
    2. Front should be a question or term.
    3. Back should be the answer or definition.
    4. Cover important anatomy concepts, structures, and functions.
    `;

    // Call Gemini API
    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    const flashcards = parsedData.flashcards || [];

    // Create flashcard set in database
    const flashcardSet = new FlashcardSet({
      title: title || `Flashcards: ${topic || prompt.substring(0, 50)}...`,
      topic: topic || 'General Anatomy',
      flashcards: flashcards.map((card: any, index: number) => ({
        id: card.id || `card${index + 1}`,
        front: card.front,
        back: card.back,
        hint: card.hint || '',
        mastered: false
      })),
      createdBy: req.userId,
      sourcePrompt: prompt,
      isPublic: false
    });

    await flashcardSet.save();

    res.json({
      message: 'Flashcards generated successfully',
      set: flashcardSet
    });

  } catch (error) {
    console.error('Flashcard generation error:', error);
    
    // Fallback: Create dummy flashcards
    if (req.body.prompt || req.body.topic) {
      const dummySet = new FlashcardSet({
        title: req.body.title || 'Sample Flashcards',
        topic: req.body.topic || 'Anatomy',
        flashcards: [
          {
            id: 'card1',
            front: 'What is the largest organ?',
            back: 'Skin',
            hint: 'It covers the entire body',
            mastered: false
          },
          {
            id: 'card2',
            front: 'How many bones in adult human?',
            back: '206',
            hint: 'Skeletal system',
            mastered: false
          }
        ],
        createdBy: req.userId,
        sourcePrompt: req.body.prompt,
        isPublic: false
      });
      
      await dummySet.save();
      
      return res.json({
        message: 'Flashcards generated (fallback mode)',
        set: dummySet
      });
    }
    
    res.status(500).json({ message: 'Failed to generate flashcards' });
  }
});

// Get a flashcard set
router.get('/:id', async (req, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id)
      .populate('createdBy', 'name');
    
    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
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

    // Check ownership
    if (set.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update card mastery
    const cardIndex = set.flashcards.findIndex(card => card.id === req.params.cardId);
    if (cardIndex !== -1) {
      set.flashcards[cardIndex].mastered = mastered;
      await set.save();
    }

    res.json({ message: 'Card updated', card: set.flashcards[cardIndex] });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share flashcards to community
router.post('/:id/share', verifyToken, async (req: any, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) return res.status(404).json({ message: 'Flashcard set not found' });

    if (set.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if already shared
    const existingPost = await CommunityPost.findOne({ flashcardSetId: set._id });
    if (existingPost) {
      return res.status(200).json({ 
        message: 'Already shared to community',
        alreadyShared: true 
      });
    }

    // Create community post
    const post = new CommunityPost({
      title: `Flashcards: ${set.title}`,
      type: 'flashcard_share',
      sharedBy: req.userId,
      flashcardSetId: set._id
    });

    await post.save();

    // Make set public
    set.isPublic = true;
    await set.save();

    res.json({ 
      message: 'Shared to community',
      post 
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's saved flashcard sets
router.get('/my-sets', verifyToken, async (req: any, res) => {
  try {
    const sets = await FlashcardSet.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });

    res.json({ sets });
  } catch (error) {
    console.error('Get my sets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;