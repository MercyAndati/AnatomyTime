import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, Heart, Bone, Eye, ArrowLeft, CheckCircle, 
  XCircle, Trash2, Target, Clock, BarChart, 
  HelpCircle, Maximize2, ZoomIn, ZoomOut, X 
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const ImageMapQuiz = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scaleFactor, setScaleFactor] = useState({ x: 1, y: 1 });

  // Score tracking
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState(0);

  // Interaction State
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  //Full Screen Image Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch all quizzes
  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Timer for quiz
  useEffect(() => {
    let interval: number;
    
    if (selectedQuiz && !showResults && !showReview) {
      interval = window.setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - quizStartTime) / 1000));
      }, 1000);
    }
    
    return () => window.clearInterval(interval);
  }, [selectedQuiz, showResults, showReview, quizStartTime]);

  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${BACKEND_URL}/api/image-map`, { headers });
      setQuizzes(response.data.quizzes || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete quiz
  const deleteQuiz = async (e: React.MouseEvent, quizId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this quiz? This cannot be undone.")) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`${BACKEND_URL}/api/image-map/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setQuizzes(prev => prev.filter(q => q._id !== quizId));
      toast({
        title: "Quiz deleted",
        description: "Quiz has been removed successfully",
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive",
      });
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

  // Start quiz
  const startQuiz = (quiz: Quiz) => {
    const quizCopy = { ...quiz, regions: shuffleArray(quiz.regions) };
    setSelectedQuiz(quizCopy);
    setCurrentRegion(0);
    setUserAnswers({});
    setGradedAnswers({});
    setSelectedAnswer(null);
    setClickedRegions({});
    setShowReview(false);
    setShowResults(false);
    setIsImageModalOpen(false); 
    setImageZoom(1);          
    setScore(0);
    setTotal(quiz.regions.length);
    setQuizStartTime(Date.now());
    setTimeSpent(0);
    setImageLoaded(false);
    setIsTransitioning(false);
    setImageSize({ width: 0, height: 0 });
    setDisplaySize({ width: 0, height: 0 });
    setScaleFactor({ x: 1, y: 1 });
  };

  // Handle region click
  const handleRegionClick = (regionId: string) => {
    if (showResults || showReview || !selectedQuiz || isTransitioning) return;

    setIsTransitioning(true);
    const currentQ = selectedQuiz.regions[currentRegion];

    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: regionId
    }));

    const isCorrect = regionId === currentQ.id;
    setGradedAnswers(prev => ({
      ...prev,
      [currentQ.id]: isCorrect
    }));

    setClickedRegions(prev => ({
      ...prev,
      [regionId]: isCorrect ? 'correct' : 'incorrect'
    }));

    setSelectedAnswer(regionId);

    setTimeout(() => {
      if (currentRegion < selectedQuiz.regions.length - 1) {
        setCurrentRegion(prev => prev + 1);
        setSelectedAnswer(null);
        setClickedRegions({});
        setIsTransitioning(false);
      } else {
        const finalGradedAnswers = { ...gradedAnswers, [currentQ.id]: isCorrect };
        const finalUserAnswers = { ...userAnswers, [currentQ.id]: regionId };
        submitQuiz(finalGradedAnswers, finalUserAnswers);
        setIsTransitioning(false);
      }
    }, 1200); 
  };

  // Submit quiz to backend
  const submitQuiz = async (
    finalGradedAnswers?: Record<string, boolean>,
    finalUserAnswers?: Record<string, string>
  ) => {
    if (!selectedQuiz) return;

    const answersToGrade = finalGradedAnswers || gradedAnswers;
    const answersToSubmit = finalUserAnswers || userAnswers;

    try {
      const token = localStorage.getItem('token');
      const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);

      const correctCount = Object.values(answersToGrade).filter(Boolean).length;
      const localScore = correctCount;
      const localTotal = selectedQuiz.regions.length;

      setScore(localScore);
      setTotal(localTotal);
      setShowResults(true);

      if (token) {
        await axios.post(
          `${BACKEND_URL}/api/image-map/${selectedQuiz._id}/attempt`,
          {
            answers: Object.entries(answersToSubmit).map(([questionId, userAnswer]) => ({
              questionId,
              userAnswer
            })),
            timeSpent
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setShowResults(true);
    }
  };

  const resetQuiz = () => {
    if (!selectedQuiz) return;
    startQuiz(selectedQuiz);
  };

  const handleImageLoad = () => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    const container = imageContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;
    
    setImageSize({ width: naturalWidth, height: naturalHeight });
    setDisplaySize({ width: displayWidth, height: displayHeight });
    setScaleFactor({ x: scale, y: scale });
    setImageLoaded(true);
  };

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && imageLoaded) {
        handleImageLoad();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded]);

  useEffect(() => {
    if (id) {
      const fetchQuizById = async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/image-map/${id}`);
          setSelectedQuiz(response.data);
        } catch (error) {
          console.error('Error fetching quiz by ID:', error);
        }
      };
      fetchQuizById();
    }
  }, [id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRegionPoints = (region: Region) => {
    if (!region.points || !scaleFactor.x || !scaleFactor.y) return null;
    
    try {
      const pointsArray = region.points.split(' ').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      }).filter(p => !isNaN(p.x) && !isNaN(p.y));
      
      if (pointsArray.length === 0) return null;
      
      const minX = Math.min(...pointsArray.map(p => p.x));
      const maxX = Math.max(...pointsArray.map(p => p.x));
      const minY = Math.min(...pointsArray.map(p => p.y));
      const maxY = Math.max(...pointsArray.map(p => p.y));
      
      const scaledMinX = minX * scaleFactor.x;
      const scaledMaxX = maxX * scaleFactor.x;
      const scaledMinY = minY * scaleFactor.y;
      const scaledMaxY = maxY * scaleFactor.y;
      
      const cx = (scaledMinX + scaledMaxX) / 2;
      const cy = (scaledMinY + scaledMaxY) / 2;
      const radius = Math.max(scaledMaxX - scaledMinX, scaledMaxY - scaledMinY) / 2;
      
      return { cx, cy, radius };
    } catch (error) {
      console.error('Error parsing region points:', error);
      return null;
    }
  };

  const renderFullScreenModal = () => {
    if (!isImageModalOpen || !selectedQuiz) return null;

    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-primary/20 bg-card/50 shadow-sm">
          <div className="flex items-center gap-1 md:gap-3 bg-muted/50 p-1 md:p-1.5 rounded-lg border border-primary/10">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.25))}
              className="hover:bg-background h-8 w-8 md:h-10 md:w-10"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <span className="text-xs md:text-sm font-semibold w-12 text-center select-none">
              {Math.round(imageZoom * 100)}%
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setImageZoom(prev => Math.min(4, prev + 0.25))}
              className="hover:bg-background h-8 w-8 md:h-10 md:w-10"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div className="w-px h-6 bg-primary/20 mx-1 hidden sm:block"></div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setImageZoom(1)} 
              className="hidden sm:flex hover:bg-background text-xs"
            >
              Reset
            </Button>
          </div>

          <Button 
            variant="destructive" 
            size={isMobile ? "sm" : "default"} 
            onClick={() => { setIsImageModalOpen(false); setImageZoom(1); }}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </Button>
        </div>

        {/* Modal Image Container (Handles the overflow scrolling) */}
        <div className="flex-1 overflow-auto p-4 flex items-start justify-center cursor-grab active:cursor-grabbing custom-scrollbar">
          <div className="min-w-full flex justify-center h-max pb-10">
            <img
              src={getImageUrl(selectedQuiz.labeledImageUrl)}
              alt="Full screen labeled"
              className="transition-all duration-200 rounded-lg shadow-2xl border border-primary/20 bg-white"
              style={{ 
                width: `${imageZoom * 100}%`,
                maxWidth: imageZoom <= 1 ? '100%' : 'none',
                height: 'auto',
                objectFit: 'contain'
              }}
              draggable="false"
            />
          </div>
        </div>
      </div>
    );
  };


  // If no quiz selected, show quiz selection
  if (!selectedQuiz) {
    return (
      <div className="min-h-screen pb-20">
        <Navigation />

        <div className="container mx-auto px-4 pt-32">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Image Map Quizzes
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Interactive anatomical diagrams - click regions to identify structures
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading quizzes...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No quizzes available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                      className="glass-card cursor-pointer hover:scale-[1.02] transition-all duration-300 group"
                      onClick={() => startQuiz(quiz)}
                    >
                      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                          </div>
                          <Badge variant="outline" className="glass text-xs md:text-sm">
                            {quiz.difficulty}
                          </Badge>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 md:h-8 md:w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={(e) => deleteQuiz(e, quiz._id)}
                          title="Delete Quiz"
                        >
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>

                        <div>
                          <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 line-clamp-1">
                            {quiz.title}
                          </h3>
                          <p className="text-muted-foreground text-xs md:text-sm line-clamp-2">
                            {quiz.description}
                          </p>
                        </div>

                        <div className="space-y-1 md:space-y-2">
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground">Regions:</span>
                            <span>{quiz.regions?.length || 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground">Avg Score:</span>
                            <span>{quiz.avgScore}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-muted-foreground">Plays:</span>
                            <span>{quiz.plays}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-glass-border">
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {quiz.category}
                          </span>
                          <Button variant="ghost" size="sm" className="text-xs md:text-sm group-hover:text-primary">
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
      </div>
    );
  }

  // quiz completed and showing review
  if (showReview) {
    return (
      <div className="min-h-screen pb-20">
        <Navigation />
        {renderFullScreenModal()}

        <div className="container mx-auto px-4 pt-24 md:pt-32">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedQuiz(null);
                setShowReview(false);
              }}
              className="mb-4 md:mb-6"
              size={isMobile ? "sm" : "default"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>

            <div className="glass-card space-y-4 md:space-y-6">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Quiz Review</h2>
                <p className="text-muted-foreground text-base md:text-lg">
                  Score: {score} / {total} ({Math.round((score / total) * 100)}%)
                </p>
              </div>

              {/*Clickable Labeled Image for Review Mode */}
              <div 
                className="mt-2 md:mt-4 relative group cursor-pointer overflow-hidden rounded-lg border-2 border-primary/20 bg-muted/10"
                onClick={() => setIsImageModalOpen(true)}
              >
                <img
                  src={getImageUrl(selectedQuiz.labeledImageUrl)}
                  alt={`${selectedQuiz.title} - Labeled`}
                  className="w-full transition-all duration-300 group-hover:scale-[1.01] group-hover:opacity-60"
                />
                <div className="absolute top-3 right-3 md:inset-0 md:flex items-center justify-center opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge className="bg-black/80 text-white shadow-xl flex items-center gap-1.5 md:gap-2 py-1.5 px-3 backdrop-blur-md md:scale-125">
                    <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="text-xs md:text-sm font-medium">
                      {isMobile ? "Tap to Enlarge" : "Click to Enlarge"}
                    </span>
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                {selectedQuiz.regions.map((region, index) => (
                  <div key={region.id} className="glass rounded-lg md:rounded-xl p-3 md:p-4">
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <h3 className="font-semibold text-base md:text-lg">Question {index + 1}</h3>
                      <div className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm ${gradedAnswers[region.id]
                        ? 'bg-green-500/20 text-green-700'
                        : 'bg-red-500/20 text-red-700'
                        }`}>
                        {gradedAnswers[region.id] ? '✓ Correct' : '✗ Incorrect'}
                      </div>
                    </div>

                    <p className="mb-1 md:mb-2 text-sm md:text-base">
                      <strong>Question:</strong> Identify: {region.name}
                    </p>

                    <div className="flex flex-col md:flex-row md:gap-4 mb-2 md:mb-4 space-y-1 md:space-y-0">
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">Your Answer:</p>
                        <p className="text-sm md:text-base">{userAnswers[region.id] || 'No answer'}</p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">Correct Answer:</p>
                        <p className="text-sm md:text-base font-semibold text-green-600">{region.name}</p>
                      </div>
                    </div>

                    {region.description && (
                      <div className="mt-2 md:mt-4 p-2 md:p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs md:text-sm text-muted-foreground">{region.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-center pt-2 md:pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowReview(false)}
                  size={isMobile ? "sm" : "default"}
                  className="md:flex-1"
                >
                  Back to Results
                </Button>
                <Button
                  onClick={resetQuiz}
                  className="gradient-primary md:flex-1"
                  size={isMobile ? "sm" : "default"}
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

  // Main quiz taking screen with sidebar layout
  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      {renderFullScreenModal()}

      <div className="container mx-auto px-4 pt-24 md:pt-32">
        <div className="animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedQuiz(null);
              setShowReview(false);
              setShowResults(false);
            }}
            className="mb-4 md:mb-6"
            size={isMobile ? "sm" : "default"}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quizzes
          </Button>

          {!showResults ? (
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
              {/* Sidebar - Question & Info */}
              <div className="lg:w-80 flex-shrink-0">
                <div className="glass-card p-4 md:p-6 sticky top-24 z-50">
                  <div className="space-y-4 md:space-y-6">
                    {/* Quiz Header */}
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 line-clamp-2">
                        {selectedQuiz.title}
                      </h2>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm md:text-base">
                          Question {currentRegion + 1} of {selectedQuiz.regions.length}
                        </p>
                        <Badge className="gradient-primary text-xs md:text-sm">
                          Score: {Object.values(gradedAnswers).filter(Boolean).length}/{currentRegion}
                        </Badge>
                      </div>
                    </div>

                    {/* Current Question */}
                    <div className="p-3 md:p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/20 p-2 rounded-full flex-shrink-0">
                          <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs md:text-sm text-muted-foreground mb-1">Find this structure:</p>
                          <p className="text-lg md:text-xl font-bold text-primary mb-2 md:mb-3">
                            {selectedQuiz.regions[currentRegion].name}
                          </p>
                          
                          {selectedQuiz.regions[currentRegion].description && (
                            <div className="mt-2 p-2 bg-muted/20 rounded-lg">
                              <p className="text-xs md:text-sm text-muted-foreground">
                                {selectedQuiz.regions[currentRegion].description}
                              </p>
                            </div>
                          )}
                          
                          {selectedQuiz.regions[currentRegion].hint && (
                            <div className="mt-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <p className="text-xs md:text-sm text-blue-600 flex items-start gap-2">
                                <HelpCircle className="h-3 w-3 md:h-4 md:w-4 mt-0.5 flex-shrink-0" />
                                <span>{selectedQuiz.regions[currentRegion].hint}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Time:</span>
                        </div>
                        <span className="font-medium">{formatTime(timeSpent)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <BarChart className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Accuracy:</span>
                        </div>
                        <span className="font-medium">
                          {currentRegion > 0 
                            ? `${Math.round((Object.values(gradedAnswers).filter(Boolean).length / currentRegion) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{currentRegion + 1}/{selectedQuiz.regions.length}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 md:gap-2">
                        {selectedQuiz.regions.map((_, index) => (
                          <div
                            key={index}
                            className={`h-1.5 md:h-2 rounded-full transition-all ${
                              index < currentRegion
                                ? gradedAnswers[selectedQuiz.regions[index].id]
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                                : index === currentRegion
                                ? 'bg-primary animate-pulse'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Instructions for Mobile */}
                    {isMobile && (
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-xs text-muted-foreground text-center">
                          Tap on the highlighted areas in the image
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Image Area */}
              <div className="flex-1">
                <div className="glass-card p-4 md:p-6 relative">
                  {/* Mobile Question Header - Fixed at top */}
                  {isMobile && (
                    <div className="sticky top-20 z-40 mb-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-primary/20 shadow-lg">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/20 p-1.5 rounded-full">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Find:</p>
                          <p className="font-bold text-primary text-sm">
                            {selectedQuiz.regions[currentRegion].name}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {currentRegion + 1}/{selectedQuiz.regions.length}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    ref={imageContainerRef}
                    className="relative bg-muted/10 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ 
                      minHeight: isMobile ? '300px' : '500px',
                      maxWidth: '100%'
                    }}
                  >
                    {/* Loading State */}
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-4 text-muted-foreground">Loading image...</p>
                        </div>
                      </div>
                    )}

                    {/* Main Image */}
                    <img
                      ref={imageRef}
                      src={getImageUrl(selectedQuiz.imageUrl)}
                      alt={selectedQuiz.title}
                      className={`${imageLoaded ? 'block' : 'hidden'} max-w-full h-auto`}
                      onLoad={handleImageLoad}
                      style={{
                        maxWidth: '100%',
                        height: 'auto'
                      }}
                    />

                    {/* SVG Overlay - properly scaled */}
                    {imageLoaded && displaySize.width > 0 && selectedQuiz.regions?.length > 0 && (
                      <svg
                        className="absolute top-0 left-0 w-full h-full"
                        viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
                        style={{ 
                          pointerEvents: isTransitioning ? 'none' : 'all',
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {selectedQuiz.regions.map((region) => {
                          const points = getRegionPoints(region);
                          if (!points) return null;

                          let fillColor = "rgba(123, 237, 245, 0.3)"; 
                          let strokeColor = "rgba(14, 87, 245, 0.8)";
                          let strokeWidth = 1;

                          if (clickedRegions[region.id] === 'correct') {
                            fillColor = "rgba(34, 197, 94, 0.5)";
                            strokeColor = "rgb(34, 197, 94)";
                            strokeWidth = 3;
                          } else if (clickedRegions[region.id] === 'incorrect') {
                            fillColor = "rgba(239, 68, 68, 0.5)";
                            strokeColor = "rgb(239, 68, 68)";
                            strokeWidth = 3;
                          }

                          return (
                            <circle
                              key={region.id}
                              cx={points.cx}
                              cy={points.cy}
                              r={points.radius}
                              fill={fillColor}
                              stroke={strokeColor}
                              strokeWidth={strokeWidth}
                              className="cursor-pointer transition-all duration-300 hover:fill-white/40"
                              onClick={() => handleRegionClick(region.id)}
                              style={{
                                filter: clickedRegions[region.id] 
                                  ? 'drop-shadow(0 0 8px currentColor)' 
                                  : 'none',
                                cursor: isTransitioning ? 'not-allowed' : 'pointer'
                              }}
                            />
                          );
                        })}
                      </svg>
                    )}

                    {/* Transition Overlay */}
                    {isTransitioning && (
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-300">
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white"></div>
                            {clickedRegions[selectedQuiz.regions[currentRegion].id] && (
                              <div className={`absolute inset-0 flex items-center justify-center text-2xl ${
                                clickedRegions[selectedQuiz.regions[currentRegion].id] === 'correct' 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {clickedRegions[selectedQuiz.regions[currentRegion].id] === 'correct' ? '✓' : '✗'}
                              </div>
                            )}
                          </div>
                          <p className="text-white font-medium text-sm">
                            {clickedRegions[selectedQuiz.regions[currentRegion].id] === 'correct' 
                              ? 'Correct!' 
                              : 'Incorrect'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Instructions */}
                  {isMobile && (
                    <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                      <p className="text-xs text-center text-muted-foreground">
                        💡 Tap on the highlighted areas to select your answer
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Results Section
            <div className="glass-card space-y-4 md:space-y-6 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold">Quiz Complete!</h2>
                <p className="text-4xl md:text-5xl font-bold gradient-text my-4 md:my-6">
                  {score} / {total}
                </p>
                <p className="text-muted-foreground text-base md:text-lg">
                  {score === total ? "Perfect score! 🎉" :
                    score >= total * 0.7 ? "Great job! 👏" : "Keep practicing! 💪"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Time: {formatTime(timeSpent)} • Accuracy: {Math.round((score / total) * 100)}%
                </p>
              </div>

              {/* Clickable Labeled Image for Results Page */}
              <div 
                className="mt-2 md:mt-4 relative group cursor-pointer max-w-lg mx-auto overflow-hidden rounded-lg border-2 border-primary/20 bg-muted/10"
                onClick={() => setIsImageModalOpen(true)}
              >
                <img
                  src={getImageUrl(selectedQuiz.labeledImageUrl)}
                  alt={`${selectedQuiz.title} - Labeled`}
                  className="w-full transition-all duration-300 group-hover:scale-[1.01] group-hover:opacity-60"
                />
                <div className="absolute top-3 right-3 md:inset-0 md:flex items-center justify-center opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge className="bg-black/80 text-white shadow-xl flex items-center gap-1.5 md:gap-2 py-1.5 px-3 backdrop-blur-md md:scale-125">
                    <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="text-xs md:text-sm font-medium">
                      {isMobile ? "Tap to Enlarge" : "Click to Enlarge"}
                    </span>
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3 max-w-md mx-auto">
                <h3 className="font-semibold text-lg md:text-xl">Review Answers:</h3>
                {selectedQuiz.regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between p-3 rounded-lg glass"
                  >
                    <span className="text-sm md:text-base">{region.name}</span>
                    {gradedAnswers[region.id] ? (
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-center pt-2 md:pt-4">
                <Button
                  onClick={() => setShowReview(true)}
                  className="gradient-primary"
                  size={isMobile ? "sm" : "default"}
                >
                  Review Details
                </Button>
                <Button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                      toast({
                        title: "Login Required",
                        description: "Please login to share quizzes",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    const userData = localStorage.getItem('user');
                    if (!userData) {
                      toast({
                        title: "Login Required",
                        description: "Please login to share quizzes",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    const user = JSON.parse(userData);
                    const userId = user._id || user.id;
                    
                    if (!userId) {
                      toast({
                        title: "Error",
                        description: "Unable to get user information",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    const response = await axios.post(
                      `${BACKEND_URL}/api/community/share`,
                      {
                        type: 'image_map_share',
                        resourceId: selectedQuiz._id,
                        title: `Image Map: ${selectedQuiz.title}`,
                        sharedBy: userId
                      },
                      {
                        headers: { Authorization: `Bearer ${token}` }
                      }
                    );
                    
                    if (response.data.alreadyShared) {
                      toast({
                        title: "Already Shared",
                        description: "This quiz is already in the community",
                      });
                    } else {
                      toast({
                        title: "Shared to Community",
                        description: "Your quiz is now visible to everyone!",
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
                size={isMobile ? "sm" : "default"}
              >
                Share to Community
              </Button>
                <Button
                  onClick={resetQuiz}
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                >
                  Retake Quiz
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