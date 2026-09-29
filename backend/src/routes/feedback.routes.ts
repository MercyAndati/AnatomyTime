import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Feedback } from '../models/Feedback';

const router = express.Router();

const verifyToken = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.userId = (decoded as any).userId;
    
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