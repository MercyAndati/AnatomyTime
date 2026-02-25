// frontend/src/pages/Rapid.tsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Zap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/utils/api";

const Rapid = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [difficulty, setDifficulty] = useState("standard");
  const [questionType, setQuestionType] = useState("mixed");
  const [timer, setTimer] = useState("1");
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
    if (!description && !file) {
      toast({
        title: "Missing information",
        description: "Please enter a topic or upload a file",
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
        formData.append('numQuestions', numQuestions);
        formData.append('difficulty', difficulty);
        formData.append('timeLimitMinutes', timer);
        formData.append('isRapid', 'true');
        
        response = await api.generateQuizFromFile(formData);
      } else {
        response = await api.generateQuiz({
          prompt: description,
          numQuestions: parseInt(numQuestions),
          difficulty,
          timeLimitMinutes: parseInt(timer),
          isRapid: true
        });
      }

      toast({
        title: "Success!",
        description: response.message,
      });

      navigate(`/quiz/${response.quiz.id}`);

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate quiz",
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
          <h1 className="text-3xl font-bold">Test Your Recall Speed</h1>
          <p className="text-muted-foreground mt-1">
            Answer as many questions as possible against the clock
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

          {/* Topic Description */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-medium mb-3">Describe Your Topic</h2>
            <Textarea
              placeholder="E.g., 'Create a quiz about the muscular system, focus on major groups and their function'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* 4-Column Settings Grid */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-sm">Number of Questions</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Question Type</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="free-response">Input Answer</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Timer (minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={timer}
                  onChange={(e) => setTimer(e.target.value)}
                  className="mt-1"
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={loading || (!description && !file)}
            className="w-full h-12 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Quiz
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Rapid;