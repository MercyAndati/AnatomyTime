// frontend/src/pages/TakeQuiz.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QuizSession } from "@/components/quiz/QuizSession";
import { QuizResults } from "@/components/quiz/QuizResults";
import { Navigation } from "@/components/Navigation";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { Quiz, Question } from "@/types";

interface AttemptResult {
  attemptId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    pointsAwarded: number;
    maxPoints: number;
    feedback: string;
  }>;
}

type QuizState = "loading" | "taking" | "results";

export const TakeQuiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [state, setState] = useState<QuizState>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);

  const loadQuiz = useCallback(async () => {
    if (!id) {
      navigate("/quiz");
      return;
    }

    try {
      const quizData = await api.getQuiz(id);
      setQuiz(quizData);
      
      // Prepare questions for taking (remove correct answers)
      const quizQuestions = quizData.questions.map(q => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        points: q.points
      })) as Question[];
      
      setQuestions(quizQuestions);
      setState("taking");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load quiz",
        variant: "destructive",
      });
      navigate("/quiz");
    }
  }, [id, navigate]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleQuizComplete = async (submittedAnswers: Record<string, string>, time: number) => {
    setAnswers(submittedAnswers);
    setTimeSpent(time);
    setState("loading");

    try {
      // Convert answers to array format
      const answersArray = Object.entries(submittedAnswers).map(([questionId, userAnswer]) => ({
        questionId,
        userAnswer
      }));

      const result = await api.attemptQuiz(
        id!,
        answersArray,
        time,
        quiz?.isRapid || false
      );

      setAttemptResult(result);
      setState("results");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit quiz",
        variant: "destructive",
      });
      setState("taking");
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setAttemptResult(null);
    setState("taking");
  };

  const handleShare = async () => {
    try {
      const result = await api.shareQuiz(id!);
      toast({
        title: "Success!",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share quiz",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    // Quiz is already in dashboard
    toast({
      title: "Already Saved",
      description: "This quiz is in your dashboard",
    });
    navigate("/dashboard");
  };

  if (state === "loading" || !quiz) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (state === "taking") {
    return (
      <>
        <Navigation />
        <QuizSession
          quizId={id!}
          questions={questions}
          title={quiz.title}
          timeLimitMinutes={quiz.timeLimitMinutes}
          isRapid={quiz.isRapid}
          onComplete={handleQuizComplete}
        />
      </>
    );
  }

  if (state === "results" && attemptResult) {
    return (
      <>
        <Navigation />
        <QuizResults
          quizId={id!}
          questions={quiz.questions}
          answers={answers}
          score={attemptResult.score}
          totalPoints={attemptResult.totalPoints}
          percentage={attemptResult.percentage}
          timeSpent={timeSpent}
          questionResults={attemptResult.answers}
          onRetake={handleRetake}
          onShare={handleShare}
          onSave={handleSave}
        />
      </>
    );
  }

  return null;
};