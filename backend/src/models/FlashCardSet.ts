import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  imageUrl?: string;
  mastered: boolean;
}

export interface IFlashcardSet extends Document {
  title: string;
  description?: string;
  topic: string;
  flashcards: IFlashcard[];
  createdBy: mongoose.Types.ObjectId;
  sourcePrompt?: string;
  isPublic: boolean;
  tags: string[];
  likes: number;
  studies: number;
  createdAt: Date;
  updatedAt: Date;
}

const flashcardSchema = new Schema<IFlashcard>({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  hint: String,
  imageUrl: String,
  mastered: { type: Boolean, default: false }
});

const flashcardSetSchema = new Schema<IFlashcardSet>({
  title: { type: String, required: true },
  description: String,
  topic: { type: String, required: true },
  flashcards: [flashcardSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sourcePrompt: String,
  isPublic: { type: Boolean, default: false },
  tags: [String],
  likes: { type: Number, default: 0 },
  studies: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IFlashcardSet>('FlashcardSet', flashcardSetSchema);