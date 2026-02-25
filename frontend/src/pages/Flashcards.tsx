// frontend/src/pages/Flashcards.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/utils/api";

const Flashcards = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [numCards, setNumCards] = useState("10");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      toast({
        title: "File uploaded",
        description: selectedFile.name,
      });
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!notes && !file) {
      toast({
        title: "Missing information",
        description: "Please enter notes or upload a file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let response;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('numCards', numCards);
        formData.append('includeHints', 'true');
        
        response = await api.generateFlashcardsFromFile(formData);
      } else {
        response = await api.generateFlashcards({
          prompt: notes,
          numCards: parseInt(numCards),
          includeHints: true
        });
      }

      toast({
        title: "Success!",
        description: response.message,
      });

      navigate(`/flashcards/${response.set.id}`);

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate flashcards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Generate Flashcards</h1>
          <p className="text-muted-foreground mt-1">
            Turn your notes into interactive flashcards instantly
          </p>
        </div>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-medium mb-3">Upload study materials (Optional)</h2>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
            
            {file ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT (Max 10MB)</p>
              </div>
            )}
          </div>

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">OR</span>
            </div>
          </div>

          {/* Notes Input */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-medium mb-3">Paste notes OR Describe Your Topic</h2>
            <Textarea
              placeholder="Paste your notes or describe the topic you want flashcards for..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Number of Flashcards */}
          <div className="border rounded-lg p-6 bg-card">
            <Label className="text-sm">Number of Flashcards</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={numCards}
              onChange={(e) => setNumCards(e.target.value)}
              className="mt-1 max-w-xs"
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={loading || (!notes && !file)}
            className="w-full h-12 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Flashcards
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Flashcards;