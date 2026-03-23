import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shuffle, Share2, Bookmark, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Flashcard } from "@/types";

interface FlashcardSessionProps {
  setId: string;
  flashcards: Flashcard[];
  title: string;
  onShare: () => void;
  onSave: () => void;
}

export const FlashcardSession = ({
  flashcards,
  title,
  onShare,
  onSave,
}: FlashcardSessionProps) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState(flashcards);
  const [mastered, setMastered] = useState<Record<string, boolean>>({});

  const currentCard = shuffledCards[currentIndex];
  const progress = ((currentIndex + 1) / shuffledCards.length) * 100;

  const handleShuffle = () => {
    setShuffledCards([...flashcards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const toggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!currentCard) return;
    setMastered(prev => ({
      ...prev,
      [currentCard.id]: !prev[currentCard.id]
    }));
  };

  const masteredCount = Object.values(mastered).filter(Boolean).length;

  //convert AI Markdown bold (**text**) into actual bold React text
  const formatText = (text?: string) => {
    if (!text) return null;
    // Splits the string by ** ** and maps it to normal or bold text
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-extrabold text-primary">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <h1 className="text-xl sm:text-2xl font-bold truncate pr-2">{title}</h1>
            
          </div>
          
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
            <span>Card {currentIndex + 1} of {shuffledCards.length}</span>
            <span>Mastered: {masteredCount}/{shuffledCards.length}</span>
          </div>
        </div>

        {/* Flashcard*/}
        <div 
          className="cursor-pointer perspective-1000 mb-8"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`relative transition-transform duration-500 transform-style-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}>
            
            {/* Front */}
            <Card className={`p-6 sm:p-8 md:p-12 min-h-[250px] md:min-h-[300px] flex flex-col items-center justify-center text-center backface-hidden shadow-lg ${
              isFlipped ? "invisible" : ""
            }`}>
              <div className="w-full max-w-full overflow-y-auto no-scrollbar max-h-[400px]">
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 uppercase tracking-wider font-semibold">Front</p>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-medium leading-relaxed break-words">
                  {formatText(currentCard?.front)}
                </h2>
                {currentCard?.hint && !isFlipped && (
                  <div className="mt-6 inline-block bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                    <p className="text-xs sm:text-sm text-primary font-medium flex items-center gap-2">
                      💡 Hint: {currentCard.hint}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Back */}
            <Card className={`p-6 sm:p-8 md:p-12 min-h-[250px] md:min-h-[300px] flex flex-col items-center justify-center text-center absolute inset-0 rotate-y-180 backface-hidden shadow-lg border-primary/30 ${
              !isFlipped ? "invisible" : ""
            }`}>
              <div className="w-full max-w-full overflow-y-auto no-scrollbar max-h-[400px]">
                <p className="text-xs sm:text-sm text-primary mb-4 uppercase tracking-wider font-semibold">Back / Answer</p>
                <h2 className="text-lg sm:text-xl md:text-2xl leading-relaxed break-words text-foreground">
                  {formatText(currentCard?.back)}
                </h2>
              </div>
            </Card>
            
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-between gap-3 w-full">
          <Button
            variant="outline"
            className="w-[45%] sm:w-auto h-12 sm:h-10 order-2 sm:order-1"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Button
            variant={mastered[currentCard?.id] ? "default" : "secondary"}
            className={`w-full sm:w-auto h-12 sm:h-10 order-1 sm:order-2 shadow-sm ${mastered[currentCard?.id] ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            onClick={toggleMastered}
          >
            {mastered[currentCard?.id] ? (
              <><Check className="h-4 w-4 mr-2"/> Mastered</>
            ) : "Mark as Mastered"}
          </Button>

          <Button
            variant="outline"
            className="w-[45%] sm:w-auto h-12 sm:h-10 order-3"
            onClick={handleNext}
            disabled={currentIndex === shuffledCards.length - 1}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4 sm:ml-2" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 hidden sm:block">
          Click card to flip • Use arrow keys to navigate
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 p-5">
              <Button variant="outline" size="sm" onClick={handleShuffle} className="flex-1 sm:flex-none">
                <Shuffle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Shuffle</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onShare} className="flex-1 sm:flex-none">
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onSave} className="flex-1 sm:flex-none">
                <Bookmark className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};