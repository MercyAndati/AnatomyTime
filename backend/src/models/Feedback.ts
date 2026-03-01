import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isPublic: { type: Boolean, default: true }
}, { timestamps: true });

export const Feedback = mongoose.model('Feedback', feedbackSchema);