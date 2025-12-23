import { useState, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Quiz = () => {
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [difficulty, setDifficulty] = useState("standard");
  const [questionType, setQuestionType] = useState("multiple-choice");
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setFile(droppedFile);
      toast({
        title: "File uploaded",
        description: droppedFile.name,
      });
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-32">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Create Your Quiz
            </h1>
            <p className="text-muted-foreground text-lg">
              Upload your study materials or describe what you want to learn
            </p>
          </div>

          <div className="glass-card space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload Study Materials (Optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-glass-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer glass"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm font-medium">{file.name}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOCX, TXT, or images (Max 10MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-glass-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Describe Your Topic</Label>
              <Textarea
                id="description"
                placeholder="E.g., 'Create a quiz about the muscular system, focusing on major muscle groups and their functions'"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="glass min-h-[120px]"
              />
            </div>

            {/* Quiz Settings */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <Input
                  id="numQuestions"
                  type="number"
                  min="1"
                  max="50"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="input">Input Answer</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full gradient-primary h-12 text-lg">
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
