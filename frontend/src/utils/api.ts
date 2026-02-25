// frontend/src/utils/api.ts
import { 
  User, 
  Quiz, 
  FlashcardSet, 
  QuizAttempt, 
  CommunityPost,
  GenerateQuizResponse,
  GenerateFlashcardResponse,
  AuthResponse,
  CommunityPostsResponse
} from '@/types';

class ApiClient {
  private baseUrl: string;
  private defaultTimeout = 10000;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  private async requestForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('token');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
        body: formData,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Upload timeout - file may be too large');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  // Quiz endpoints
  async generateQuiz(data: {
    topic?: string;
    prompt?: string;
    numQuestions?: number;
    difficulty?: string;
    timeLimitMinutes?: number;
    isRapid?: boolean;
  }): Promise<GenerateQuizResponse> {
    return this.request<GenerateQuizResponse>('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateQuizFromFile(formData: FormData): Promise<GenerateQuizResponse> {
    return this.requestForm<GenerateQuizResponse>('/quiz/generate', formData);
  }

  async getMyQuizzes(): Promise<{ quizzes: Quiz[] }> {
    return this.request<{ quizzes: Quiz[] }>('/quiz/my-quizzes/list');
  }

  async getQuiz(id: string): Promise<Quiz> {
    return this.request<Quiz>(`/quiz/${id}`);
  }

  async attemptQuiz(
    quizId: string,
    answers: Array<{ questionId: string; userAnswer: string }>,
    timeSpent: number,
    isRapid: boolean = false
  ): Promise<{ 
    attemptId: string; 
    score: number; 
    totalPoints: number; 
    percentage: number; 
    answers: Array<{ questionId: string; isCorrect: boolean; pointsAwarded: number; maxPoints: number; feedback: string }> 
  }> {
    return this.request(`/quiz/${quizId}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeSpent, isRapid }),
    });
  }

  async getAttempts(quizId: string): Promise<{ attempts: QuizAttempt[] }> {
    return this.request<{ attempts: QuizAttempt[] }>(`/quiz/attempts/${quizId}`);
  }

  // Flashcard endpoints
  async generateFlashcards(data: {
    topic?: string;
    prompt?: string;
    numCards?: number;
    difficulty?: string;
    includeHints?: boolean;
  }): Promise<GenerateFlashcardResponse> {
    return this.request<GenerateFlashcardResponse>('/flashcards/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateFlashcardsFromFile(formData: FormData): Promise<GenerateFlashcardResponse> {
    return this.requestForm<GenerateFlashcardResponse>('/flashcards/generate', formData);
  }

  async getMyFlashcards(): Promise<{ sets: FlashcardSet[] }> {
    const response = await this.request<{ sets: (FlashcardSet & { _id?: string })[] }>(
      '/flashcards/my-sets/list'
    );

    // Transform _id to id if needed
    const transformedSets: FlashcardSet[] = response.sets.map((set) => ({
      ...set,
      id: set.id || (set as { _id?: string })._id || set.id,
    }));

    return { sets: transformedSets };
  }

  async getFlashcardSet(id: string): Promise<FlashcardSet> {
    return this.request<FlashcardSet>(`/flashcards/${id}`);
  }

  async shareFlashcardSet(setId: string): Promise<{ message: string; post: CommunityPost }> {
    return this.request<{ message: string; post: CommunityPost }>(`/flashcards/${setId}/share`, {
      method: 'POST',
    });
  }

  async deleteFlashcardSet(setId: string): Promise<{ message: string }> {
    return this.request(`/flashcards/${setId}`, {
      method: 'DELETE',
    });
  }

  // For recent activity - get user's attempts
  async getMyAttempts(): Promise<{ attempts: QuizAttempt[] }> {
    return this.request<{ attempts: QuizAttempt[] }>('/quiz/attempts/my-all'); // We'll need to add this endpoint
  }

  // Community endpoints
  async getCommunityPosts(category?: string): Promise<CommunityPostsResponse> {
    const url = category && category !== 'All' ? `/community?category=${category}` : '/community';
    return this.request<CommunityPostsResponse>(url);
  }

  async shareQuiz(quizId: string): Promise<{ message: string; post: CommunityPost }> {
    return this.request<{ message: string; post: CommunityPost }>(`/quiz/${quizId}/share`, {
      method: 'POST',
    });
  }

  async deleteQuiz(quizId: string): Promise<{ message: string }> {
    return this.request(`/quiz/${quizId}`, {
      method: 'DELETE',
    });
  }

  async deletePost(postId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/community/${postId}`, {
      method: 'DELETE',
    });
  }

  async likePost(resourceId: string, type: string): Promise<void> {
    let endpoint: string | undefined;

    if (type === 'image_map_share') {
      endpoint = `/image-map/${resourceId}/like`;
    } else if (type === 'quiz_share') {
      endpoint = `/quiz/${resourceId}/like`;
    } else {
      // No like endpoint for this type (e.g., notes/flashcards)
      return;
    }

    await this.request(endpoint, { method: 'POST' });
  }
}

export const api = new ApiClient();