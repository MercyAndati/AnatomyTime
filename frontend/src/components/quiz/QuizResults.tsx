// frontend/src/components/quiz/QuizResults.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, RotateCcw, Share2, Bookmark, Clock, Trophy } from "lucide-react";
import { Question } from "@/types";
import { toast } from "@/hooks/use-toast";

interface QuizResultsProps {
  quizId: string;
  questions: Question[];
  answers: Record<string, string>;
  score: number;
  totalPoints: number;
  percentage: number;
  timeSpent: number;
  questionResults: Array<{
    questionId: string;
    isCorrect: boolean;
    pointsAwarded: number;
    maxPoints: number;
    feedback?: string;
  }>;
  onRetake: () => void;
  onShare: () => void;
  onSave: () => void;
}

export const QuizResults = ({
  quizId,
  questions,
  answers,
  score,
  totalPoints,
  percentage,
  timeSpent,
  questionResults,
  onRetake,
  onShare,
  onSave,
}: QuizResultsProps) => {
  const navigate = useNavigate();
  const [showAnswers, setShowAnswers] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const handleSave = () => {
    // Quiz is already saved in DB when generated
    // Just show confirmation
    toast({
      title: "Saved to Dashboard",
      description: "This quiz has been added to your dashboard",
    });
  navigate("/dashboard");
};
  const getGradeMessage = (percentage: number) => {
    if (percentage >= 90) return "Excellent!";
    if (percentage >= 80) return "Great job!";
    if (percentage >= 70) return "Good work!";
    if (percentage >= 60) return "Keep practicing!";
    return "Need more review";
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        {/* Score Overview */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-muted-foreground">{getGradeMessage(percentage)}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold mb-1">{percentage}%</div>
            <p className="text-sm text-muted-foreground">Score</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold mb-1">{score}/{totalPoints}</div>
            <p className="text-sm text-muted-foreground">Correct Answers</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold mb-1">{formatTime(timeSpent)}</div>
            <p className="text-sm text-muted-foreground">Time Spent</p>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <Button onClick={onRetake} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
          <Button onClick={onShare} variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share to Community
          </Button>
          <Button onClick={onSave} variant="outline">
            <Bookmark className="h-4 w-4 mr-2" />
            Save Quiz
          </Button>
          <Button onClick={() => setShowAnswers(!showAnswers)}>
            {showAnswers ? "Hide Answers" : "Review Answers"}
          </Button>
        </div>

        {/* Detailed Review */}
        {showAnswers && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Question Review</h2>
            {questions.map((question, idx) => {
              const result = questionResults.find(r => r.questionId === question.id);
              const userAnswer = answers[question.id];
              
              return (
                <Card key={question.id} className="p-6">
                  <div className="flex items-start gap-3">
                    {result?.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        {idx + 1}. {question.text}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={result?.isCorrect ? "text-green-600" : "text-red-600"}>
                            {userAnswer || "No answer"}
                          </span>
                        </div>
                        
                        {!result?.isCorrect && question.correctAnswer && (
                          <div>
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="font-medium">{question.correctAnswer}</span>
                          </div>
                        )}
                        
                        {question.explanation && (
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <p className="text-sm">{question.explanation}</p>
                          </div>
                        )}
                        
                        {result?.feedback && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {result.feedback}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium">
                      {result?.pointsAwarded}/{result?.maxPoints} pts
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};