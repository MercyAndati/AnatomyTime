import express from 'express';
import jwt from 'jsonwebtoken';
import Quiz from '../models/Quiz';
import ImageMapQuiz from '../models/ImageMapQuiz';
import FlashcardSet from '../models/FlashCardSet';
import CommunityPost from '../models/CommunityPost';
import User from '../models/User';

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

// Get community posts (aggregated from CommunityPost collection)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;

    // Build query for CommunityPost
    let query: any = {};
    
    if (category && category !== 'All') {
      // Map frontend categories to CommunityPost types
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

    // Text search
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Fetch community posts with populated references
    const posts = await CommunityPost.find(query)
      .populate('sharedBy', 'name')
      .populate('quizId')
      .populate('flashcardSetId')
      .populate('imageMapQuizId')
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
        type: post.type, // Keep original type for backend operations
        typeDisplay: typeDisplayMap[post.type] || post.type, // Display-friendly type
        likes: post.upvotes || 0,
        comments: post.comments?.length || 0,
        createdAt: post.createdAt,
        description: post.content || '',
        alreadyShared: true // Since it's from CommunityPost, it's already shared
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
          return {
            ...baseData,
            questionCount: 0,
            downloads: 0,
            resourceId: null
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

// Delete a community post (admin or owner)
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

    // Get the resource type and ID before deleting
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
    }

    // Delete the community post
    await CommunityPost.deleteOne({ _id: post._id });

    // Optionally make the resource private again (only if admin is deleting)
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

export default router;