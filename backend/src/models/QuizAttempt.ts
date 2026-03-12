import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  questionId: string;
  userAnswer: string;
  confidenceScore?: number;
  pointsAwarded: number;
  maxPoints: number;
  isCorrect: boolean;
  feedback?: string;
  gradedAt: Date;
}

export interface IQuizAttempt extends Document {
  user: mongoose.Types.ObjectId;
  quizRef: mongoose.Types.ObjectId;
  quizType: 'ai-quiz' | 'image-map-quiz';
  score: number;
  totalPoints: number;
  percentage: number;
  timeSpent: number;
  timeLimit?: number;
  answers: IAnswer[];
  status: 'in-progress' | 'grading' | 'completed' | 'time-up'|'failed';
  gradingStartedAt?: Date;
  completedAt?: Date;
  reviewed: boolean;
}

const answerSchema = new Schema<IAnswer>({
  questionId: { type: String, required: true },
  userAnswer: { type: String, required: true },
  confidenceScore: Number,
  pointsAwarded: { type: Number, default: 0 },
  maxPoints: { type: Number, required: true },
  isCorrect: { type: Boolean, default: false },
  feedback: String,
  gradedAt: { type: Date, default: Date.now }
});

const quizAttemptSchema = new Schema<IQuizAttempt>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizRef: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  quizType: {
    type: String,
    enum: ['ai-quiz', 'image-map-quiz'],
    required: true
  },
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, required: true },
  percentage: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  timeLimit: Number,
  answers: [answerSchema],
  status: {
    type: String,
    enum: ['in-progress', 'grading', 'completed', 'time-up', 'failed'],
    default: 'in-progress'
  },
  gradingStartedAt: Date,
  completedAt: Date,
  reviewed: { type: Boolean, default: false }
}, {
  timestamps: true
});

quizAttemptSchema.pre('save', function() {
  if (this.totalPoints > 0) {
    this.percentage = Math.round((this.score / this.totalPoints) * 100);
  }
});

export default mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);