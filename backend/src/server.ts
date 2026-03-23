import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import quizRoutes from './routes/quiz.routes';
import imageMapRoutes from './routes/imageMap.routes';
import flashcardRoutes from './routes/flashcard.routes';
import communityRoutes from './routes/community.routes';
import adminRoutes from './routes/admin.routes';
import noteRoutes from './routes/note.routes';
import feedbackRoutes from './routes/feedback.routes'; 
import { AIService } from './services/ai.service';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");

  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:3000";

  res.setHeader(
    "Content-Security-Policy",
    `frame-ancestors 'self' ${frontendUrl}`
  );

  next();
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize services and attach to app
app.locals.aiService = new AIService(); 

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/image-map', imageMapRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/feedback', feedbackRoutes); 

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    services: {
      ai: !!app.locals.aiService,
      database: mongoose.connection.readyState === 1
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large' });
  }
  
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Database connection with retry logic
const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/anatomytime');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (retries > 0) {
      console.log(`Retrying connection... (${retries} attempts left)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error('Failed to connect to MongoDB after multiple retries');
      process.exit(1);
    }
  }
};

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;