import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Sparkles, Loader2, Target, FileText, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/utils/api";

const Flashcards = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [focusTopic, setFocusTopic] = useState(""); 
  const [numCards, setNumCards] = useState("10");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiresFocusTopic = file ? file.size > 10 * 1024 * 1024 : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 150 * 1024 * 1024) { 
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 150MB",
        variant: "destructive"
      });
      return; 
    }

    setFile(selectedFile);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFile(null);
    setFocusTopic("");
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!notes && !file) {
      toast({
        title: "Missing information",
        description: "Please enter notes, a topic, or upload a file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setFileError(null);

    try {
      let response;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('numCards', numCards);
        formData.append('includeHints', 'true');
        if (focusTopic) formData.append('focusTopic', focusTopic);
        
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

      navigate(`/flashcards/${response.flashcardSet.id}`);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to generate flashcards";
      
      if (file) {
        setFileError(errMsg);
      } else {
        toast({
          title: "Generation Failed",
          description: errMsg,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const parsedNum = parseInt(numCards);
  const isNumInvalid = isNaN(parsedNum) || parsedNum < 1 || parsedNum > 50;

  const isGenerateDisabled = 
    loading || 
    (!notes && !file) || 
    (requiresFocusTopic && !focusTopic.trim()) ||
    !!fileError ||
    isNumInvalid;

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Generate Flashcards</h1>
          <p className="text-muted-foreground mt-1">
            Turn your notes or documents into interactive flashcards instantly
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
              accept=".pdf,.docx,.ppt,.pptx,.txt"
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                  fileError ? 'bg-destructive/10 border-destructive/20' : 'bg-muted/50 border-primary/20'
                }`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    {fileError ? (
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{file.name}</span>
                      <span className="text-xs text-muted-foreground block">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={removeFile} className="hover:text-destructive flex-shrink-0 ml-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {fileError && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-md text-sm border border-destructive/20 flex flex-col gap-2">
                    <div className="flex items-start gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>File Processing Failed</p>
                    </div>
                    <p className="opacity-90 ml-6">{fileError}</p>
                    <p className="ml-6 mt-1 text-xs opacity-80 font-medium">Please remove this file and paste your notes below instead.</p>
                  </div>
                )}

                {!fileError && (
                  <div className={`p-4 rounded-md border transition-colors ${
                    requiresFocusTopic && !focusTopic 
                      ? 'bg-destructive/5 border-destructive/30' 
                      : 'bg-primary/5 border-primary/10'
                  }`}>
                    <Label className="text-sm flex items-center gap-2 mb-2">
                      <Target className={`h-4 w-4 ${requiresFocusTopic && !focusTopic ? 'text-destructive' : 'text-primary'}`} />
                      Narrow down the topic {requiresFocusTopic && <span className="text-destructive font-bold">(Required for large files)</span>}
                    </Label>
                    <Input 
                      placeholder="E.g., 'Focus only on the muscles of the arm'"
                      value={focusTopic}
                      onChange={(e) => setFocusTopic(e.target.value)}
                      className={`bg-background ${requiresFocusTopic && !focusTopic ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {requiresFocusTopic && !focusTopic && (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        This file is very large. You must specify a focus topic to guide the AI.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors bg-muted/30"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, PPTX, DOCX, TXT (Max 150MB)</p>
              </div>
            )}
          </div>

          {!file && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">OR</span>
                </div>
              </div>

              <div className="border rounded-lg p-6 bg-card">
                <h2 className="text-sm font-medium mb-3">Paste Notes OR Describe Topic</h2>
                <Textarea
                  placeholder="Paste your extensive notes here (no length limit) or describe the topic..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[150px] resize-y"
                />
              </div>
            </>
          )}

          <div className="border rounded-lg p-6 bg-card">
            <Label className="text-sm">Number of Flashcards</Label>
            <Input
              type="number"
              min="1"
              max="50"
              value={numCards}
              onChange={(e) => setNumCards(e.target.value)}
              className={`mt-1 max-w-xs ${isNumInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {isNumInvalid && (
              <p className="text-xs text-destructive mt-1 font-medium">
                Please enter a number between 1 and 50.
              </p>
            )}
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className="w-full h-12 text-base gradient-primary relative overflow-hidden"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Processing...</span>
                </div>
                {file && file.size > 10 * 1024 * 1024 && (
                  <span className="text-xs font-normal opacity-80 mt-0.5">
                    Large files can take 1-2 minutes to analyze. Please don't close this page.
                  </span>
                )}
              </div>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Flashcards
              </>
            )}
          </Button>
        </div>
      </div>
      {/* AI Disclaimer Footer */}
      <div className="mt-8 text-center px-4">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          AI-generated content is intended as a study aid, not a replacement for official medical texts.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Looking for diagram identification? Visit our hand-crafted <span onClick={() => navigate('/image-map')} className="text-primary hover:underline cursor-pointer">Image Map module</span>.
        </p>
      </div>
    </div>
  );
};

export default Flashcards;