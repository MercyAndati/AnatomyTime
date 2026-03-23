import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import { Question } from "@/types";
import { Textarea } from "@/components/ui/textarea";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Convert minutes to seconds for the timer
  const totalSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : 0;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [startTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use callback to prevent multiple triggers
  const handleTimeUp = useCallback(() => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent);
  }, [answers, onComplete, startTime, isSubmitting]);

  useEffect(() => {
    if (!timeLimitMinutes || !isRapid || isSubmitting) return;

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
  }, [timeLimitMinutes, isRapid, handleTimeUp, isSubmitting]);

  const currentQuestion = questions[currentIndex];
  
  // Calculate progress for both bars
  const questionProgress = ((currentIndex + 1) / questions.length) * 100;
  const timeProgress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onComplete(answers, timeSpent);
  };

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isAnswered = Boolean(answers[currentQuestion?.id]);

  if (isSubmitting) {
    return (
      <div className="min-h-screen pb-20 flex flex-col items-center justify-center">
        <div className="container mx-auto px-4 max-w-md text-center animate-in fade-in zoom-in duration-300">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {timeLeft <= 0 ? "Time's Up!" : "Submitting Quiz..."}
          </h2>
          <p className="text-muted-foreground text-lg">
            {timeLeft <= 0 
              ? "Pencils down! We are sending your answers to the AI professor for grading." 
              : "Analyzing your free-response answers and calculating your score..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        
        {/* Quiz Title */}
        <h1 className="text-2xl font-bold mb-6">{title}</h1>

        <div className="border rounded-xl p-6 bg-card mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            {isRapid && timeLimitMinutes && (
              <div className={`flex items-center gap-2 font-bold ${timeLeft < 60 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          <div className="space-y-5">
            {/* Question Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Progress</span>
                <span>{Math.round(questionProgress)}%</span>
              </div>
              <Progress value={questionProgress} className="h-2" />
            </div>

            {/* Time Remaining Progress Bar (Only visible in Rapid Mode) */}
            {isRapid && timeLimitMinutes && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>Time Remaining</span>
                  <span className={timeLeft < 60 ? "text-destructive" : ""}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                {/* Changes color to red when under 1 minute */}
                <Progress 
                  value={timeProgress} 
                  className={`h-2 ${timeLeft < 60 ? '[&>div]:bg-destructive' : '[&>div]:bg-blue-500'}`} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Question Card */}
        <div className="border rounded-xl p-6 bg-card mb-6 shadow-sm">
          <h2 className="text-lg font-medium mb-6 leading-relaxed">
            {currentQuestion?.text}
          </h2>

          {currentQuestion?.type === "multiple-choice" ? (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {currentQuestion.options?.map((option, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    answers[currentQuestion.id] === option 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50 border-transparent bg-muted/20"
                  }`}
                  onClick={() => handleAnswer(option)}
                >
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer font-normal text-base">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your detailed answer here..."
              className="w-full min-h-[150px] resize-y p-4 text-base leading-relaxed"
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0 || isSubmitting}
            className="h-11 px-6"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isAnswered || isSubmitting}
              className="h-11 px-6 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isAnswered || isSubmitting}
              className="h-11 px-6 shadow-sm"
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