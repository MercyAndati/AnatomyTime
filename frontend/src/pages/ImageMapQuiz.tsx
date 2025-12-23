import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Bone, Eye, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string;
  icon: any;
  difficulty: string;
  regions: Array<{
    id: string;
    name: string;
    points: string;
  }>;
}

const availableQuizzes: Quiz[] = [
  {
    id: "brain",
    title: "Brain Anatomy",
    description: "Identify major brain structures",
    icon: Brain,
    difficulty: "Hard",
    regions: [
      { id: "frontal", name: "Frontal Lobe", points: "200,100 300,100 300,200 200,200" },
      { id: "parietal", name: "Parietal Lobe", points: "300,100 400,100 400,200 300,200" },
      { id: "temporal", name: "Temporal Lobe", points: "200,200 300,200 300,300 200,300" },
      { id: "occipital", name: "Occipital Lobe", points: "300,200 400,200 400,300 300,300" },
    ]
  },
  {
    id: "heart",
    title: "Heart Anatomy",
    description: "Label the chambers and vessels",
    icon: Heart,
    difficulty: "Standard",
    regions: [
      { id: "ra", name: "Right Atrium", points: "150,100 250,100 250,200 150,200" },
      { id: "rv", name: "Right Ventricle", points: "150,200 250,200 250,350 150,350" },
      { id: "la", name: "Left Atrium", points: "250,100 350,100 350,200 250,200" },
      { id: "lv", name: "Left Ventricle", points: "250,200 350,200 350,350 250,350" },
    ]
  },
  {
    id: "skeleton",
    title: "Skeletal System",
    description: "Identify major bones",
    icon: Bone,
    difficulty: "Easy",
    regions: [
      { id: "skull", name: "Skull", points: "200,50 300,50 300,150 200,150" },
      { id: "ribs", name: "Ribs", points: "180,150 320,150 320,280 180,280" },
      { id: "femur", name: "Femur", points: "200,350 250,350 250,500 200,500" },
      { id: "tibia", name: "Tibia", points: "250,350 300,350 300,500 250,500" },
    ]
  },
];

const ImageMapQuiz = () => {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentRegion, setCurrentRegion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const handleRegionClick = (regionId: string) => {
    if (showResults) return;
    
    const currentQ = selectedQuiz?.regions[currentRegion];
    const isCorrect = regionId === currentQ?.id;
    
    setAnswers(prev => ({ ...prev, [currentQ!.id]: isCorrect }));
    setSelectedAnswer(regionId);
    
    setTimeout(() => {
      if (currentRegion < (selectedQuiz?.regions.length || 0) - 1) {
        setCurrentRegion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setShowResults(true);
      }
    }, 1000);
  };

  const resetQuiz = () => {
    setCurrentRegion(0);
    setAnswers({});
    setShowResults(false);
    setSelectedAnswer(null);
  };

  const score = Object.values(answers).filter(Boolean).length;
  const total = selectedQuiz?.regions.length || 0;

  if (!selectedQuiz) {
    return (
      <div className="min-h-screen pb-20">
        <Navigation />
        
        <div className="container mx-auto px-4 pt-32">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Image Map Quizzes
              </h1>
              <p className="text-muted-foreground text-lg">
                Interactive anatomical diagrams - click regions to identify structures
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableQuizzes.map((quiz) => {
                const Icon = quiz.icon;
                return (
                  <Card 
                    key={quiz.id}
                    className="glass-card cursor-pointer hover:scale-105 transition-all duration-300 group"
                    onClick={() => setSelectedQuiz(quiz)}
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <Badge variant="outline" className="glass">
                          {quiz.difficulty}
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                        <p className="text-muted-foreground text-sm">
                          {quiz.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-glass-border">
                        <span className="text-sm text-muted-foreground">
                          {quiz.regions.length} regions
                        </span>
                        <Button variant="ghost" size="sm" className="group-hover:text-primary">
                          Start →
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-32">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedQuiz(null);
              resetQuiz();
            }}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quizzes
          </Button>

          {!showResults ? (
            <div className="glass-card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedQuiz.title}</h2>
                  <p className="text-muted-foreground">
                    Question {currentRegion + 1} of {total}
                  </p>
                </div>
                <Badge className="gradient-primary">
                  Score: {score}/{currentRegion}
                </Badge>
              </div>

              <div className="p-8 bg-muted/20 rounded-xl">
                <p className="text-center text-lg mb-6">
                  Click on: <span className="font-bold text-primary">
                    {selectedQuiz.regions[currentRegion].name}
                  </span>
                </p>
                
                <svg 
                  viewBox="0 0 500 600" 
                  className="w-full max-w-md mx-auto"
                >
                  <rect width="500" height="600" fill="hsl(var(--muted))" opacity="0.1" />
                  
                  {selectedQuiz.regions.map((region) => (
                    <polygon
                      key={region.id}
                      points={region.points}
                      fill={
                        selectedAnswer === region.id
                          ? region.id === selectedQuiz.regions[currentRegion].id
                            ? "hsl(var(--success))"
                            : "hsl(var(--destructive))"
                          : "hsl(var(--primary))"
                      }
                      opacity={selectedAnswer === region.id ? 0.8 : 0.3}
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-60 transition-opacity"
                      onClick={() => handleRegionClick(region.id)}
                    />
                  ))}
                </svg>
              </div>
            </div>
          ) : (
            <div className="glass-card space-y-6 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Quiz Complete!</h2>
                <p className="text-5xl font-bold gradient-text my-6">
                  {score} / {total}
                </p>
                <p className="text-muted-foreground">
                  {score === total ? "Perfect score! 🎉" : 
                   score >= total * 0.7 ? "Great job! 👏" : "Keep practicing! 💪"}
                </p>
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <h3 className="font-semibold text-lg">Review Answers:</h3>
                {selectedQuiz.regions.map((region) => (
                  <div 
                    key={region.id}
                    className="flex items-center justify-between p-3 rounded-lg glass"
                  >
                    <span>{region.name}</span>
                    {answers[region.id] ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <Button 
                  onClick={resetQuiz}
                  className="gradient-primary"
                >
                  Retake Quiz
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedQuiz(null);
                    resetQuiz();
                  }}
                >
                  Choose Another Quiz
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageMapQuiz;
