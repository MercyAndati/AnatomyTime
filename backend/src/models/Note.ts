import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  title: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  tags: string[];
  likes: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  fileUrl: String,
  fileType: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  tags: [String],
  likes: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 }
}, { timestamps: true });

// Add text index for search
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

export default mongoose.model<INote>('Note', noteSchema);