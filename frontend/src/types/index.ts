// frontend/src/types/index.ts
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  isAdmin?: boolean;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'free-response';
  text: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  topic: string;
  description?: string;
  questions: Question[];
  totalPoints: number;
  difficulty: 'easy' | 'standard' | 'hard';
  timeLimitMinutes?: number;
  isRapid: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  mastered: boolean;
}

export interface FlashcardSet {
  id: string;
  title: string;
  topic: string;
  description?: string;
  flashcards: Flashcard[];
  createdBy: string;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeSpent: number;
  answers: Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    pointsAwarded: number;
    feedback?: string;
  }>;
  completedAt: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  // Backend community post type
  // (matches CommunityPost.type field in backend)
  type: 'quiz_share' | 'flashcard_share' | 'image_map_share' | 'note';
  likes: number;
  comments: number;
  createdAt: string;
  description?: string;
  resourceId?: string;
  // Additional stats populated from related resources
  questionCount?: number;
  downloads?: number;
  alreadyShared?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface GenerateQuizResponse {
  message: string;
  quiz: Quiz;
}

export interface GenerateFlashcardResponse {
  message: string;
  set: FlashcardSet;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CommunityPostsResponse {
  posts: CommunityPost[];
}