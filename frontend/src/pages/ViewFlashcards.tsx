import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FlashcardSession } from "@/components/flashcards/FlashcardSession";
import { Navigation } from "@/components/Navigation";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { FlashcardSet } from "@/types";

export const ViewFlashcards = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);

  const loadFlashcardSet = useCallback(async () => {
    if (!id) {
      navigate("/flashcards");
      return;
    }

    try {
      const data = await api.getFlashcardSet(id);
      setFlashcardSet(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load flashcards",
        variant: "destructive",
      });
      navigate("/flashcards");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadFlashcardSet();
  }, [loadFlashcardSet]);

  const handleShare = async () => {
    try {
      const result = await api.shareFlashcardSet(id!);
      toast({
        title: "Success!",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share flashcards",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Already Saved",
      description: "This flashcard set is in your dashboard",
    });
    navigate("/dashboard");
  };

  if (loading || !flashcardSet) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <FlashcardSession
        setId={id!}
        flashcards={flashcardSet.flashcards}
        title={flashcardSet.title}
        onShare={handleShare}
        onSave={handleSave}
      />
    </>
  );
};