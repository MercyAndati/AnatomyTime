import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Feedback } from '../models/Feedback';

const router = express.Router();

// Middleware to verify token and attach user details
const verifyToken = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.userId = (decoded as any).userId;
    
    // Safely get the User model to fetch their name and admin status
    const User = mongoose.model('User');
    const user: any = await User.findById(req.userId);
    
    req.user = { 
      userId: req.userId, 
      name: user?.name || 'Unknown User', 
      isAdmin: user?.isAdmin || false 
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// POST: Submit new feedback
router.post('/', verifyToken, async (req: any, res) => {
  try {
    const { title, message, isPublic } = req.body;
    const feedback = new Feedback({
      userId: req.user.userId,
      authorName: req.user.name,
      title,
      message,
      isPublic
    });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// GET: Fetch feedback (Admins see all, Users see Public + their own Private)
router.get('/', verifyToken, async (req: any, res) => {
  try {
    const query = req.user.isAdmin 
      ? {} 
      : { $or: [{ isPublic: true }, { userId: req.user.userId }] };
    
    const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
    res.json({ feedbacks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
});

// DELETE: Remove feedback (Admins or the original author only)
router.delete('/:id', verifyToken, async (req: any, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

    // Security Check: Are they an admin OR the owner?
    if (!req.user.isAdmin && req.user.userId !== feedback.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this feedback' });
    }

    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete feedback' });
  }
});

export default router;