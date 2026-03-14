import express from 'express';
import jwt from 'jsonwebtoken';
import Quiz from '../models/Quiz';
import ImageMapQuiz from '../models/ImageMapQuiz';
import FlashcardSet from '../models/FlashCardSet';
import CommunityPost from '../models/CommunityPost';
import User from '../models/User';
import Note from '../models/Note';
import fs from 'fs';
import path from 'path';

const router = express.Router();

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

// Get community posts
router.get('/', async (req, res) => {
  try {
    const { category, search, sortBy ='latest' } = req.query;

    let query: any = {};
    
    if (category && category !== 'All') {
      const categoryMap: { [key: string]: string } = {
        'Quiz': 'quiz_share',
        'Flashcards': 'flashcard_share',
        'Image Map': 'image_map_share',
        'Notes': 'note'
      };
      
      if (categoryMap[category as string]) {
        query.type = categoryMap[category as string];
      }
    }

    if (search) {
      query.$or=[
        {title:{ $regex: search, $options: 'i'}},
        {content:{$regex: search, $options: 'i'}}
      ];
    }

    let sortOptions: any={};
    if (sortBy === 'popular') {
      sortOptions = { upvotes: -1, createdAt: -1 };
    } else if (sortBy === 'most_commented') {
      sortOptions = { comments: -1, createdAt: -1 };
    } else {
      sortOptions = { createdAt: -1 }; 
    }
    
    // Fetch community posts with populated references
    const posts = await CommunityPost.find(query)
      .populate('sharedBy', 'name')
      .populate('quizId')
      .populate('flashcardSetId')
      .populate('imageMapQuizId')
      .populate('noteId')
      .sort({ createdAt: -1 })
      .limit(50);

    // Map backend types to frontend display types
    const typeDisplayMap: { [key: string]: string } = {
      'quiz_share': 'Quiz',
      'flashcard_share': 'Flashcards',
      'image_map_share': 'Image Map',
      'note': 'Notes'
    };

    // Transform to frontend format
    const transformedPosts = posts.map(post => {
      let baseData = {
        id: post._id,
        author: (post.sharedBy as any)?.name || 'Unknown',
        title: post.title,
        type: post.type,
        typeDisplay: typeDisplayMap[post.type] || post.type,
        likes: post.upvotes || 0,
        comments: post.comments?.length || 0,
        createdAt: post.createdAt,
        description: post.content || '',
        alreadyShared: true
      };

      // Add resource-specific data
      switch (post.type) {
        case 'quiz_share':
          const quiz = post.quizId as any;
          return {
            ...baseData,
            questionCount: quiz?.questions?.length || 0,
            downloads: quiz?.attempts || 0,
            resourceId: quiz?._id
          };
          
        case 'flashcard_share':
          const flashcardSet = post.flashcardSetId as any;
          return {
            ...baseData,
            questionCount: flashcardSet?.flashcards?.length || 0,
            downloads: flashcardSet?.studies || 0,
            resourceId: flashcardSet?._id
          };
          
        case 'image_map_share':
          const imageQuiz = post.imageMapQuizId as any;
          return {
            ...baseData,
            questionCount: imageQuiz?.regions?.length || 0,
            downloads: imageQuiz?.plays || 0,
            resourceId: imageQuiz?._id
          };
          
        case 'note':
          const note = post.noteId as any;

          return {
            ...baseData,
            description: note?.content || '',
            downloads: note?.downloads || 0,
            resourceId: note?._id,
            fileUrl: note?.fileUrl,
            fileType: note?.fileType
        };
          
        default:
          return baseData;
      }
    });

    res.json({ posts: transformedPosts });

  } catch (error) {
    console.error('Get community posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a community post (for sharing resources)
router.post('/share', async (req, res) => {
  try {
    const { type, resourceId, title, content, sharedBy } = req.body;

    // Check if already shared
    let existingPost;
    switch (type) {
      case 'quiz_share':
        existingPost = await CommunityPost.findOne({ quizId: resourceId });
        break;
      case 'flashcard_share':
        existingPost = await CommunityPost.findOne({ flashcardSetId: resourceId });
        break;
      case 'image_map_share':
        existingPost = await CommunityPost.findOne({ imageMapQuizId: resourceId });
        break;
    }

    if (existingPost) {
      return res.status(200).json({ 
        message: 'Already shared to community',
        alreadyShared: true,
        post: existingPost
      });
    }

    // Create community post
    const postData: any = {
      title: title || 'Shared Resource',
      type,
      sharedBy,
      content
    };

    // Set the appropriate resource ID
    switch (type) {
      case 'quiz_share':
        postData.quizId = resourceId;
        break;
      case 'flashcard_share':
        postData.flashcardSetId = resourceId;
        break;
      case 'image_map_share':
        postData.imageMapQuizId = resourceId;
        break;
    }

    const post = new CommunityPost(postData);
    await post.save();

    // Make the resource public
    switch (type) {
      case 'quiz_share':
        await Quiz.findByIdAndUpdate(resourceId, { isPublic: true });
        break;
      case 'flashcard_share':
        await FlashcardSet.findByIdAndUpdate(resourceId, { isPublic: true });
        break;
      case 'image_map_share':
        await ImageMapQuiz.findByIdAndUpdate(resourceId, { isPublic: true });
        break;
    }

    res.status(201).json({ 
      message: 'Shared to community successfully',
      post 
    });

  } catch (error) {
    console.error('Share to community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a community post
router.delete('/:id', verifyToken, async (req: any, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is owner or admin
    const user = await User.findById(req.userId);
    const isOwner = post.sharedBy.toString() === req.userId;
    const isAdmin = user?.isAdmin || false;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    let resourceId: string | null = null;
    let resourceType: string = '';
    
    if (post.quizId) {
      resourceId = post.quizId.toString();
      resourceType = 'quiz';
    } else if (post.flashcardSetId) {
      resourceId = post.flashcardSetId.toString();
      resourceType = 'flashcard';
    } else if (post.imageMapQuizId) {
      resourceId = post.imageMapQuizId.toString();
      resourceType = 'imageMap';
    }else if (post.noteId) {
      resourceId = post.noteId.toString();
      resourceType = 'note';
    }

    if (post.type === 'note' && post.noteId) {
      const note = await Note.findById(post.noteId);
      if (note) {
        if (note.fileUrl) {
          const filePath = path.join(__dirname, '../..', note.fileUrl);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        await Note.deleteOne({ _id: note._id });
      }
    }
    // Delete the community post
    await CommunityPost.deleteOne({ _id: post._id });

    //make the resource private again (only if admin is deleting)
    if (isAdmin && resourceId) {
      switch (resourceType) {
        case 'quiz':
          await Quiz.findByIdAndUpdate(resourceId, { isPublic: false });
          break;
        case 'flashcard':
          await FlashcardSet.findByIdAndUpdate(resourceId, { isPublic: false });
          break;
        case 'imageMap':
          await ImageMapQuiz.findByIdAndUpdate(resourceId, { isPublic: false });
          break;
      }
    }

    res.json({ 
      message: 'Community post deleted successfully',
      resourceId,
      resourceType
    });

  } catch (error) {
    console.error('Delete community post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a community post
router.post('/:id/like', verifyToken, async (req: any, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.upvotes += 1;
    await post.save();

    // Also increment like on the original resource
    if (post.type === 'quiz_share' && post.quizId) {
      await Quiz.findByIdAndUpdate(post.quizId, { $inc: { likes: 1 } });
    } else if (post.type === 'flashcard_share' && post.flashcardSetId) {
      await FlashcardSet.findByIdAndUpdate(post.flashcardSetId, { $inc: { likes: 1 } });
    } else if (post.type === 'image_map_share' && post.imageMapQuizId) {
      await ImageMapQuiz.findByIdAndUpdate(post.imageMapQuizId, { $inc: { likes: 1 } });
    }

    res.json({ likes: post.upvotes });
  } catch (error) {
    console.error('Like community post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;