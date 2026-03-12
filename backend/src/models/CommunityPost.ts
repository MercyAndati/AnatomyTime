import mongoose, { Document, Schema } from 'mongoose';

export interface ICommunityPost extends Document {
  title: string;
  content?: string;
  type: 'note' | 'quiz_share' | 'flashcard_share' | 'image_map_share';
  sharedBy: mongoose.Types.ObjectId;
  quizId?: mongoose.Types.ObjectId;
  flashcardSetId?: mongoose.Types.ObjectId;
  imageMapQuizId?: mongoose.Types.ObjectId;
  upvotes: number;
  upvotedBy: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  noteId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const communityPostSchema = new Schema<ICommunityPost>({
  title: { type: String, required: true },
  content: String,
  type: {
    type: String,
    enum: ['note', 'quiz_share', 'flashcard_share', 'image_map_share'],
    required: true
  },
  sharedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
  flashcardSetId: { type: Schema.Types.ObjectId, ref: 'FlashcardSet' },
  imageMapQuizId: { type: Schema.Types.ObjectId, ref: 'ImageMapQuiz' },
  noteId: { type: Schema.Types.ObjectId, ref: 'Note' },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true });

communityPostSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<ICommunityPost>('CommunityPost', communityPostSchema);