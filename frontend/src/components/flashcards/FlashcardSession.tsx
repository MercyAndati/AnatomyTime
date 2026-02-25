// frontend/src/components/flashcards/FlashcardSession.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shuffle, RotateCcw, Share2, Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { Flashcard } from "@/types";

interface FlashcardSessionProps {
  setId: string;
  flashcards: Flashcard[];
  title: string;
  onShare: () => void;
  onSave: () => void;
}

export const FlashcardSession = ({
  setId,
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

  const toggleMastered = () => {
    setMastered(prev => ({
      ...prev,
      [currentCard.id]: !prev[currentCard.id]
    }));
  };

  const masteredCount = Object.values(mastered).filter(Boolean).length;

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShuffle}>
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle
              </Button>
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={onSave}>
                <Bookmark className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
          
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Card {currentIndex + 1} of {shuffledCards.length}</span>
            <span>Mastered: {masteredCount}/{shuffledCards.length}</span>
          </div>
        </div>

        {/* Flashcard */}
        <div 
          className="cursor-pointer perspective-1000 mb-6"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`relative transition-transform duration-500 transform-style-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}>
            {/* Front */}
            <Card className={`p-12 min-h-[300px] flex items-center justify-center text-center backface-hidden ${
              isFlipped ? "invisible" : ""
            }`}>
              <div>
                <p className="text-sm text-muted-foreground mb-4">Front</p>
                <h2 className="text-2xl">{currentCard?.front}</h2>
                {currentCard?.hint && !isFlipped && (
                  <p className="text-sm text-muted-foreground mt-4">
                    💡 Hint: {currentCard.hint}
                  </p>
                )}
              </div>
            </Card>

            {/* Back */}
            <Card className={`p-12 min-h-[300px] flex items-center justify-center text-center absolute inset-0 rotate-y-180 backface-hidden ${
              !isFlipped ? "invisible" : ""
            }`}>
              <div>
                <p className="text-sm text-muted-foreground mb-4">Back</p>
                <h2 className="text-2xl">{currentCard?.back}</h2>
              </div>
            </Card>
          </div>
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

          <Button
            variant={mastered[currentCard?.id] ? "default" : "outline"}
            onClick={toggleMastered}
          >
            {mastered[currentCard?.id] ? "✓ Mastered" : "Mark as Mastered"}
          </Button>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === shuffledCards.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Keyboard shortcuts hint */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Click card to flip • Use arrow keys to navigate
        </p>
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