import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  id: string;
  type: 'multiple-choice' | 'free-response';
  text: string;
  imageUrl?: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
}

export interface IQuiz extends Document {
  title: string;
  description?: string;
  topic: string;
  questions: IQuestion[];
  totalPoints: number;
  difficulty: 'easy' | 'standard' | 'hard';
  type: 'standard'; // Only 'standard' now
  createdBy: mongoose.Types.ObjectId;
  sourcePrompt?: string;
  sourceFileUrl?: string;
  timeLimitMinutes?: number; // NEW: For rapid-fire (null = normal quiz)
  isPublic: boolean;
  tags: string[];
  likes: number;
  attempts: number;
  avgScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['multiple-choice', 'free-response'],
    required: true 
  },
  text: { type: String, required: true },
  imageUrl: String,
  options: [String],
  correctAnswer: { type: String, required: true },
  explanation: String,
  points: { type: Number, default: 1 }
});

const quizSchema = new Schema<IQuiz>({
  title: { type: String, required: true },
  description: String,
  topic: { type: String, required: true },
  questions: [questionSchema],
  totalPoints: { type: Number, default: 0 },
  difficulty: {
    type: String,
    enum: ['easy', 'standard', 'hard'],
    default: 'standard'
  },
  type: {
    type: String,
    enum: ['standard'],
    default: 'standard'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourcePrompt: String,
  sourceFileUrl: String,
  timeLimitMinutes: Number, // NEW
  isPublic: { type: Boolean, default: false },
  tags: [String],
  likes: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Auto-calculate total points before saving
// @ts-expect-error - Mongoose 9 types don't properly recognize 'save' as a valid hook event
quizSchema.pre('save', function(this: IQuiz, next: () => void) {
  this.totalPoints = this.questions.reduce(
    (sum: number, q: IQuestion) => sum + q.points, 0
  );
  next();
});

export default mongoose.model<IQuiz>('Quiz', quizSchema);