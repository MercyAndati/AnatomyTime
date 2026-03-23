import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, FileText, Clock, Trash2, RotateCcw,Sparkles,BookOpen,BarChart } from "lucide-react";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Quiz, FlashcardSet, QuizAttempt } from "@/types";

interface DashboardStats {
  totalQuizzes: number;
  totalFlashcards: number;
  totalAttempts: number;
  averageScore: number;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardSet[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    totalFlashcards: 0,
    totalAttempts: 0,
    averageScore: 0
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Fetch Quizzes
      const quizzesRes = await api.getMyQuizzes();
      setQuizzes(quizzesRes.quizzes);
      
      // Fetch Flashcards
      const flashcardsRes = await api.getMyFlashcards();
      setFlashcards(flashcardsRes.sets);
      
      // Fetch Quiz Attempts
      const attemptsRes = await api.getMyAttempts();
      const userAttempts = attemptsRes.attempts || [];
      setAttempts(userAttempts);
      
      // Calculate Stats
      const totalQuizzes = quizzesRes.quizzes.length;
      const totalFlashcards = flashcardsRes.sets.length;
      const attemptCount = userAttempts.length;

      // Calculate sum of all percentages
      const totalScoreSum = userAttempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0);
      
      setStats({
        totalQuizzes,
        totalFlashcards,
        totalAttempts: attemptCount,
        averageScore: attemptCount > 0 ? Math.round(totalScoreSum / attemptCount) : 0
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? It will be removed from your dashboard and the community.")) return;
    
    try {
      await api.deleteQuiz(quizId);
      setQuizzes(quizzes.filter(q => q.id !== quizId));
      toast({ title: "Deleted", description: "Quiz deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete quiz", variant: "destructive" });
    }
  };

  const handleDeleteFlashcard = async (setId: string) => {
    if (!confirm("Are you sure you want to delete this flashcard set? It will be removed from your dashboard and the community.")) return;
    
    try {
      await api.deleteFlashcardSet(setId);
      setFlashcards(flashcards.filter(f => f.id !== setId));
      toast({ title: "Deleted", description: "Flashcard set deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete flashcard set", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {user?.name || user?.email}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your learning progress
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalQuizzes}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Quizzes</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalFlashcards}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Flashcards</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalAttempts}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Attempts</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.averageScore}%</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Avg. Score</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="quizzes" className="space-y-4">
          {/*flex wrap for mobile*/}
          <TabsList className="w-full h-auto flex-wrap justify-start p-1 gap-1">
            <TabsTrigger value="quizzes" className="flex-1 sm:flex-none">My Quizzes</TabsTrigger>
            <TabsTrigger value="flashcards" className="flex-1 sm:flex-none">My Flashcards</TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="space-y-4">
            {quizzes.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
                <p className="text-muted-foreground mb-4">Create your first quiz to start learning</p>
                <Button onClick={() => navigate("/quiz")}>
                  <Sparkles className="h-4 w-4 mr-2" /> Create Quiz
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0"> 
                        <h3 className="font-semibold mb-1 truncate text-base sm:text-lg">{quiz.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                          <span>{quiz.questions.length} Qs</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="capitalize">{quiz.difficulty}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/quiz/${quiz.id}`)}>
                          <RotateCcw className="h-4 w-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden text-xs">Retake</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteQuiz(quiz.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="flashcards" className="space-y-4">
            {flashcards.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
                <p className="text-muted-foreground mb-4">Create your first flashcard set</p>
                <Button onClick={() => navigate("/flashcards")}>
                  <Sparkles className="h-4 w-4 mr-2" /> Create Flashcards
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {flashcards.map((set) => (
                  <Card key={set.id || Math.random()} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 truncate text-base sm:text-lg">{set.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                          <span>{set.flashcards?.length || 0} cards</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{new Date(set.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/flashcards/${set.id}`)}>
                          <BookOpen className="h-4 w-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden text-xs">Study</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteFlashcard(set.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};