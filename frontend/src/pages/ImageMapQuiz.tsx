import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Bone, Eye, ArrowLeft, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

// Define interfaces based on backend models
interface Region {
  id: string;
  name: string;
  points: string;
  hint?: string;
  description?: string;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  regions: Region[];
  category: string;
  tags: string[];
  likes: number;
  plays: number;
  avgScore: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  imageUrl: string;
  labeledImageUrl: string;
}

const ImageMapQuiz = () => {
  const { id } = useParams(); // For when viewing a specific quiz
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentRegion, setCurrentRegion] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Answer tracking
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [gradedAnswers, setGradedAnswers] = useState<Record<string, boolean>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [clickedRegions, setClickedRegions] = useState<Record<string, 'correct' | 'incorrect' | null>>({});
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Score tracking
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);



  // Fetch all quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      // First, try to fetch from backend
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get('http://localhost:5000/api/image-map', { headers });
      const quizzes = response.data.quizzes || [];
      console.log('Fetched quizzes:', quizzes.length, 'quizzes');
      quizzes.forEach((quiz: Quiz, index: number) => {
        console.log(`Quiz ${index + 1}:`, {
          id: quiz._id,
          title: quiz.title,
          regionsCount: quiz.regions?.length || 0,
          hasRegions: !!quiz.regions && Array.isArray(quiz.regions)
        });
      });
      setQuizzes(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      // setQuizzes([]); // Optional: clear quizzes on error if desired, but state init is [] anyway
    } finally {
      setLoading(false);
    }
  };


  // Delete quiz
  const deleteQuiz = async (e: React.MouseEvent, quizId: string) => {
    e.stopPropagation(); // Prevent card click
    if (!window.confirm("Are you sure you want to delete this quiz? This cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`http://localhost:5000/api/image-map/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from state
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Failed to delete quiz');
    }
  };

  // Helper to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // State for preventing double clicks/transitions
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Start quiz
  const startQuiz = (quiz: Quiz) => {
    // Clone and shuffle regions for randomization
    const quizCopy = { ...quiz, regions: shuffleArray(quiz.regions) };
    setSelectedQuiz(quizCopy);
    setCurrentRegion(0);
    setUserAnswers({});
    setGradedAnswers({});
    setSelectedAnswer(null);
    setClickedRegions({});
    setShowReview(false);
    setShowResults(false);
    setScore(0);
    setTotal(quiz.regions.length);
    setQuizStartTime(Date.now());
    setIsTransitioning(false);
  };

  // Handle region click
  const handleRegionClick = (regionId: string) => {
    if (showResults || showReview || !selectedQuiz || isTransitioning) return;

    setIsTransitioning(true);
    const currentQ = selectedQuiz.regions[currentRegion];

    // Save user answer
    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: regionId
    }));

    // Check if correct immediately
    const isCorrect = regionId === currentQ.id;
    setGradedAnswers(prev => ({
      ...prev,
      [currentQ.id]: isCorrect
    }));

    // Update clicked regions with color feedback
    setClickedRegions(prev => ({
      ...prev,
      [regionId]: isCorrect ? 'correct' : 'incorrect'
    }));

    setSelectedAnswer(regionId);

    // Move to next question or show results
    setTimeout(() => {
      if (currentRegion < selectedQuiz.regions.length - 1) {
        setCurrentRegion(prev => prev + 1);
        setSelectedAnswer(null);
        // Clear clicked regions for next question
        setClickedRegions({});
        setIsTransitioning(false); // Enable clicks for next question
      } else {
        // Pass the final state to submitQuiz because state updates are async
        const finalGradedAnswers = {
          ...gradedAnswers,
          [currentQ.id]: isCorrect
        };
        const finalUserAnswers = {
          ...userAnswers,
          [currentQ.id]: regionId
        };

        // We don't reset isTransitioning here immediately because showResults will change the view
        submitQuiz(finalGradedAnswers, finalUserAnswers);
        setIsTransitioning(false);
      }
    }, 1500); // Slightly longer to see the feedback
  };

  // Submit quiz to backend
  const submitQuiz = async (
    finalGradedAnswers?: Record<string, boolean>,
    finalUserAnswers?: Record<string, string>
  ) => {
    if (!selectedQuiz) return;

    // Use passed final state or fallback to current state (though fallback usually misses last update)
    const answersToGrade = finalGradedAnswers || gradedAnswers;
    const answersToSubmit = finalUserAnswers || userAnswers;

    try {
      const token = localStorage.getItem('token');
      const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000); // Convert to seconds

      // Calculate score locally first
      const correctCount = Object.values(answersToGrade).filter(Boolean).length;
      const localScore = correctCount;
      const localTotal = selectedQuiz.regions.length;

      setScore(localScore);
      setTotal(localTotal);
      setShowResults(true);

      // If user is logged in, submit to backend
      if (token) {
        await axios.post(
          `http://localhost:5000/api/image-map/${selectedQuiz._id}/attempt`,
          {
            answers: Object.entries(answersToSubmit).map(([questionId, userAnswer]) => ({
              questionId,
              userAnswer
            })),
            timeSpent
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }

    } catch (error) {
      console.error('Error submitting quiz:', error);
      // Still show results even if backend fails
      setShowResults(true);
    }
  };

  // Reset quiz
  const resetQuiz = () => {
    if (!selectedQuiz) return;
    startQuiz(selectedQuiz);
  };

  // If viewing a specific quiz by ID
  useEffect(() => {
    if (id) {
      // Fetch specific quiz by ID
      const fetchQuizById = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/image-map/${id}`);
          const quizData = response.data;
          console.log('Fetched quiz:', {
            id: quizData._id,
            title: quizData.title,
            regionsCount: quizData.regions?.length || 0,
            regions: quizData.regions?.map((r: Region) => ({
              id: r.id,
              name: r.name,
              points: r.points
            }))
          });
          setSelectedQuiz(quizData);
        } catch (error) {
          console.error('Error fetching quiz by ID:', error);
        }
      };
      fetchQuizById();
    }
  }, [id]);

  // If no quiz selected, show quiz selection
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

            {loading ? (
              <div className="text-center py-12">
                <p>Loading quizzes...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => {
                  let Icon = Brain;
                  switch (quiz.category.toLowerCase()) {
                    case 'neuroanatomy': Icon = Brain; break;
                    case 'cardiovascular': Icon = Heart; break;
                    case 'skeletal': Icon = Bone; break;
                    default: Icon = Eye;
                  }

                  return (
                    <Card
                      key={quiz._id}
                      className="glass-card cursor-pointer hover:scale-105 transition-all duration-300 group"
                      onClick={() => startQuiz(quiz)}
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

                        {/* Admin delete button - simple check, ideally check token/user role */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => deleteQuiz(e, quiz._id)}
                          title="Delete Quiz"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div>
                          <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                          <p className="text-muted-foreground text-sm">
                            {quiz.description}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Regions:</span>
                            <span>{quiz.regions?.length || 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Avg Score:</span>
                            <span>{quiz.avgScore}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Plays:</span>
                            <span>{quiz.plays}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-glass-border">
                          <span className="text-sm text-muted-foreground">
                            {quiz.category}
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
            )}
          </div>
        </div>
      </div >
    );
  }

  // If quiz is completed and showing review
  if (showReview) {
    return (
      <div className="min-h-screen pb-20">
        <Navigation />

        <div className="container mx-auto px-4 pt-32">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedQuiz(null);
                setShowReview(false);
              }}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>

            <div className="glass-card space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Quiz Review</h2>
                <p className="text-muted-foreground">
                  Score: {score} / {total} ({Math.round((score / total) * 100)}%)
                </p>
              </div>

              {/* Show labeled image in review mode */}
              <div className="mt-4">
                <img
                  src={`http://localhost:5000${selectedQuiz.labeledImageUrl}`}
                  alt={`${selectedQuiz.title} - Labeled`}
                  className="w-full max-w-md mx-auto rounded-lg border-2 border-primary/20"
                />
              </div>

              <div className="space-y-4">
                {selectedQuiz.regions.map((region, index) => (
                  <div key={region.id} className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Question {index + 1}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm ${gradedAnswers[region.id]
                        ? 'bg-green-500/20 text-green-700'
                        : 'bg-red-500/20 text-red-700'
                        }`}>
                        {gradedAnswers[region.id] ? '✓ Correct' : '✗ Incorrect'}
                      </div>
                    </div>

                    <p className="mb-2">
                      <strong>Question:</strong> Identify: {region.name}
                    </p>

                    <div className="flex gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Your Answer:</p>
                        <p>{userAnswers[region.id] || 'No answer'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Correct Answer:</p>
                        <p className="font-semibold text-green-600">{region.name}</p>
                      </div>
                    </div>

                    {region.description && (
                      <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">{region.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowReview(false)}
                >
                  Back to Results
                </Button>
                <Button
                  onClick={resetQuiz}
                  className="gradient-primary"
                >
                  Retake Quiz
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main quiz taking screen
  return (
    <div className="min-h-screen pb-20">
      <Navigation />

      <div className="container mx-auto px-4 pt-32">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedQuiz(null);
              setShowReview(false);
              setShowResults(false);
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
                    Question {currentRegion + 1} of {selectedQuiz.regions.length}
                  </p>
                </div>
                <Badge className="gradient-primary">
                  Score: {Object.values(gradedAnswers).filter(Boolean).length}/{currentRegion}
                </Badge>
              </div>

              {/* Quiz taking screen with real image */}
              <div className="p-8 bg-muted/20 rounded-xl relative">
                <p className="text-center text-lg mb-6">
                  Click on: <span className="font-bold text-primary">
                    {selectedQuiz.regions[currentRegion].name}
                  </span>
                </p>

                <div className="relative max-w-md mx-auto">
                  {/* Display the unlabeled image */}
                  <img
                    src={`http://localhost:5000${selectedQuiz.imageUrl}`}
                    alt={selectedQuiz.title}
                    className="w-full rounded-lg"
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      const naturalWidth = img.naturalWidth;
                      const naturalHeight = img.naturalHeight;
                      console.log('Image loaded:', {
                        naturalWidth,
                        naturalHeight,
                        displayWidth: img.width,
                        displayHeight: img.height,
                        regionsCount: selectedQuiz.regions?.length || 0
                      });
                      setImageSize({ width: naturalWidth, height: naturalHeight });
                    }}
                  />

                  {/* SVG overlay for clickable regions */}
                  {imageSize.width > 0 && imageSize.height > 0 && selectedQuiz.regions && selectedQuiz.regions.length > 0 && (
                    <svg
                      viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                      className="absolute top-0 left-0 w-full h-full"
                      style={{ pointerEvents: 'all' }}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {selectedQuiz.regions.map((region, index) => {
                        if (!region.points) {
                          console.warn(`Region ${index} (${region.name}) has no points`);
                          return null;
                        }

                        // Parse points to validate
                        const pointsArray = region.points.split(' ').map(p => {
                          const [x, y] = p.split(',').map(Number);
                          if (isNaN(x) || isNaN(y)) {
                            console.warn(`Invalid point in region ${region.name}: ${p}`);
                            return null;
                          }
                          return { x, y };
                        }).filter(p => p !== null) as { x: number; y: number }[];

                        if (pointsArray.length < 3) {
                          console.warn(`Region ${region.name} has invalid points: ${region.points}`);
                          return null;
                        }

                        // Check if coordinates are outside image bounds
                        const maxX = Math.max(...pointsArray.map(p => p.x));
                        const maxY = Math.max(...pointsArray.map(p => p.y));
                        const minX = Math.min(...pointsArray.map(p => p.x));
                        const minY = Math.min(...pointsArray.map(p => p.y));

                        // If coordinates are way outside bounds, they might be from a scaled/zoomed view
                        // Try to detect and scale them proportionally
                        let scaledPoints = region.points;
                        if (imageSize.width > 0 && imageSize.height > 0) {
                          // Check if coordinates are significantly larger than image (likely wrong coordinate system)
                          if (maxX > imageSize.width * 1.5 || maxY > imageSize.height * 1.5) {
                            // Find the scale factor that would fit the coordinates
                            const scaleX = imageSize.width / (maxX || 1);
                            const scaleY = imageSize.height / (maxY || 1);
                            const scale = Math.min(scaleX, scaleY);

                            // Only scale if it's a reasonable scale factor (between 0.1 and 10)
                            if (scale > 0.1 && scale < 10) {
                              console.warn(`Region ${region.name} coordinates out of bounds. Scaling by ${scale.toFixed(2)}`);
                              scaledPoints = pointsArray.map(p =>
                                `${Math.round(p.x * scale)},${Math.round(p.y * scale)}`
                              ).join(' ');
                            }
                          }
                        }

                        // Log first few regions for debugging
                        if (index < 3) {
                          console.log(`Region ${index + 1} (${region.name}):`, {
                            points: region.points,
                            scaledPoints: scaledPoints !== region.points ? scaledPoints : 'none',
                            parsed: pointsArray,
                            viewBox: `${imageSize.width} x ${imageSize.height}`,
                            bounds: {
                              minX, maxX, minY, maxY
                            },
                            needsScaling: maxX > imageSize.width || maxY > imageSize.height
                          });
                        }

                        // Determine fill color based on state
                        let fillColor = "rgba(255, 255, 255, 0.3)"; // Default: translucent white
                        let strokeColor = "rgba(255, 255, 255, 0.6)";
                        let strokeWidth = 2;

                        if (clickedRegions[region.id] === 'correct') {
                          fillColor = "rgba(34, 197, 94, 0.5)"; // Green for correct
                          strokeColor = "rgb(34, 197, 94)";
                          strokeWidth = 3;
                        } else if (clickedRegions[region.id] === 'incorrect') {
                          fillColor = "rgba(239, 68, 68, 0.5)"; // Red for incorrect
                          strokeColor = "rgb(239, 68, 68)";
                          strokeWidth = 3;
                        }

                        return (
                          <polygon
                            key={region.id || `region-${index}`}
                            points={scaledPoints}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            className="cursor-pointer transition-all duration-300"
                            onClick={() => handleRegionClick(region.id)}
                            style={{
                              filter: clickedRegions[region.id] ? 'drop-shadow(0 0 8px currentColor)' : 'none'
                            }}
                          />
                        );
                      })}
                    </svg>
                  )}

                  {/* Debug info - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded z-10">
                      <div>Regions: {selectedQuiz.regions?.length || 0}</div>
                      <div>Image: {imageSize.width} × {imageSize.height}</div>
                      <div>ViewBox: {imageSize.width || 0} × {imageSize.height || 0}</div>
                    </div>
                  )}
                </div>

                {selectedQuiz.regions[currentRegion].hint && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Hint: {selectedQuiz.regions[currentRegion].hint}
                  </div>
                )}
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

              {/* Show labeled image in results */}
              <div className="mt-4">
                <img
                  src={`http://localhost:5000${selectedQuiz.labeledImageUrl}`}
                  alt={`${selectedQuiz.title} - Labeled`}
                  className="w-full max-w-md mx-auto rounded-lg border-2 border-primary/20"
                />
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <h3 className="font-semibold text-lg">Review Answers:</h3>
                {selectedQuiz.regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between p-3 rounded-lg glass"
                  >
                    <span>{region.name}</span>
                    {gradedAnswers[region.id] ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={() => setShowReview(true)}
                  className="gradient-primary"
                >
                  Review Details
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // Share quiz
                      const token = localStorage.getItem('token');
                      const response = await axios.put(`http://localhost:5000/api/image-map/${selectedQuiz._id}/share`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                      });

                      if (response.data.alreadyShared) {
                        toast({
                          title: "Already Shared",
                          description: "This quiz is already in the community!",
                          variant: "default",
                        });
                      } else {
                        toast({
                          title: "Shared to Community",
                          description: "Your quiz is now visible to everyone!",
                          variant: "default",
                        });
                      }
                    } catch (err) {
                      console.error("Error sharing quiz:", err);
                      toast({
                        title: "Share Failed",
                        description: "Could not share quiz. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  Share to Community
                </Button>
                <Button
                  onClick={resetQuiz}
                  variant="outline"
                >
                  Retake Quiz
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedQuiz(null);
                    setShowResults(false);
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