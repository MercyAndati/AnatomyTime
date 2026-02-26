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
  CommunityPostsResponse,
  Note
} from '@/types';

class ApiClient {
  private baseUrl: string;
  private defaultTimeout = 10000;
  getNoteFileUrl(fileName: string): string {
    return `${this.baseUrl}/notes/file/${fileName}`;
  }

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

  async likePost(postId: string, type: string, resourceId?: string): Promise<{ likes: number }> {
    // First try to like via community endpoint (syncs with resource)
    try {
      return await this.request<{ likes: number }>(`/community/${postId}/like`, {
        method: 'POST',
      });
    } catch (error) {
      // Fallback to direct resource like if community endpoint fails
      const targetId = resourceId || postId;
      let endpoint: string;

      if (type === 'image_map_share') {
        endpoint = `/image-map/${targetId}/like`;
      } else if (type === 'quiz_share') {
        endpoint = `/quiz/${targetId}/like`;
      } else if (type === 'flashcard_share') {
        endpoint = `/flashcards/${targetId}/like`;
      } else {
        throw new Error('Cannot like this post type');
      }

      return await this.request<{ likes: number }>(endpoint, { 
        method: 'POST' 
      });
    }
  }
  // Note endpoints
  async createNote(data: { title: string; content?: string; tags?: string }, file?: File): Promise<{ message: string; note: Note }> {
  if (file) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.content) formData.append('content', data.content); // Only if exists
    if (data.tags) formData.append('tags', data.tags);
    formData.append('file', file);
    
    return this.requestForm<{ message: string; note: Note }>('/notes/create', formData);
  } else {
    // For text-only notes, content is required
    if (!data.content) {
      throw new Error('Content is required when not uploading a file');
    }
    return this.request<{ message: string; note: Note }>('/notes/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

  async getMyNotes(): Promise<{ notes: Note[] }> {
    return this.request<{ notes: Note[] }>('/notes/my-notes');
  }

  async getNote(id: string): Promise<Note> {
    return this.request<Note>(`/notes/${id}`);
  }

  async shareNote(noteId: string): Promise<{ message: string; post: CommunityPost }> {
    return this.request<{ message: string; post: CommunityPost }>(`/notes/${noteId}/share`, {
      method: 'POST',
    });
  }

  async deleteNote(noteId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  async likeNote(noteId: string): Promise<{ likes: number }> {
    return this.request<{ likes: number }>(`/notes/${noteId}/like`, {
      method: 'POST',
    });
  }
}


export const api = new ApiClient();