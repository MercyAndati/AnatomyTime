// frontend/src/components/quiz/QuizSession.tsx
import { useState, useEffect,useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Clock, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Question } from "@/types";

interface QuizSessionProps {
  quizId: string;
  questions: Question[];
  title: string;
  timeLimitMinutes?: number;
  isRapid?: boolean;
  onComplete: (answers: Record<string, string>, timeSpent: number) => void;
}

export const QuizSession = ({
  quizId,
  questions,
  title,
  timeLimitMinutes,
  isRapid = false,
  onComplete,
}: QuizSessionProps) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes ? timeLimitMinutes * 60 : 0);
  const [startTime] = useState(Date.now());
  const handleTimeUp = useCallback(()=>{
    const timeSpent=Math.floor((Date.now()-startTime)/1000);
    onComplete(answers, timeSpent);
  },[answers, onComplete, startTime]);

  // Timer effect
  useEffect(() => {
    if (!timeLimitMinutes || !isRapid) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimitMinutes, isRapid, handleTimeUp]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isAnswered = Boolean(answers[currentQuestion?.id]);

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{title}</h1>
            {isRapid && timeLimitMinutes && (
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5" />
                <span className={timeLeft < 60 ? "text-destructive" : ""}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </div>
          
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        {/* Question */}
        <div className="border rounded-lg p-6 bg-card mb-6">
          <h2 className="text-xl mb-6">{currentQuestion?.text}</h2>

          {currentQuestion?.type === "multiple-choice" ? (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {currentQuestion.options?.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Input
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isAnswered}
              className="bg-primary text-primary-foreground"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isAnswered}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};