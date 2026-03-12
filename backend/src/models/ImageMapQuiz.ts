import mongoose, { Document, Schema } from 'mongoose';

export interface IRegion {
  id: string;
  name: string;
  points: string;
  hint?: string;
  description?: string;
  x?: number; 
  y?: number;
  width?: number;
  height?: number;
}

export interface IImageMapQuiz extends Document {
  title: string;
  description: string;
  imageUrl: string; 
  labeledImageUrl: string; 
  svgData?: string; 
  regions: IRegion[];
  difficulty: 'easy' | 'standard' | 'hard';
  category: string;
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  likes: number;
  plays: number;
  avgScore: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const regionSchema = new Schema<IRegion>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  points: {
    type: String,
    required: true
  },
  hint: String,
  description: String,
  x: Number,
  y: Number,
  width: Number,
  height: Number
});

const imageMapQuizSchema = new Schema<IImageMapQuiz>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  labeledImageUrl: {
    type: String,
    required: true
  },
  svgData: String,
  regions: [regionSchema],
  difficulty: {
    type: String,
    enum: ['easy', 'standard', 'hard'],
    default: 'standard'
  },
  category: {
    type: String,
    default: 'Anatomy'
  },
  tags: [String],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  plays: {
    type: Number,
    default: 0
  },
  avgScore: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

imageMapQuizSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IImageMapQuiz>('ImageMapQuiz', imageMapQuizSchema);