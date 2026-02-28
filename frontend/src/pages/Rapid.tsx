import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Zap, Loader2, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/utils/api";

const Rapid = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [focusTopic, setFocusTopic] = useState(""); // ✅ Added Focus Topic
  const [numQuestions, setNumQuestions] = useState("10");
  const [difficulty, setDifficulty] = useState("standard");
  const [questionType, setQuestionType] = useState("mixed");
  const [timer, setTimer] = useState("1");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 130 * 1024 * 1024) { // Increased to 130MB
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 130MB",
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
    setFocusTopic("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!description && !file) {
      toast({
        title: "Missing information",
        description: "Please enter a topic, paste notes, or upload a file",
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
        if (focusTopic) formData.append('focusTopic', focusTopic); // ✅ Send focus topic
        
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
      const errMsg = error instanceof Error ? error.message : "Failed to generate quiz";
      
      if (errMsg.toLowerCase().includes('extract') || errMsg.toLowerCase().includes('parse')) {
        toast({
          title: "File Processing Failed",
          description: "We couldn't read the text in that file. Please copy and paste your notes directly into the text box below.",
          variant: "destructive",
          duration: 6000,
        });
        removeFile();
      } else {
        toast({
          title: "Validation Error",
          description: errMsg,
          variant: "destructive",
        });
      }
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
              accept=".pdf,.docx,.ppt,.pptx,.txt" // ✅ Added PPT
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-md border border-primary/20">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <Button size="sm" variant="ghost" onClick={removeFile} className="hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
                  <Label className="text-sm flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    Narrow down the topic (Highly Recommended for large PPTs)
                  </Label>
                  <Input 
                    placeholder="E.g., 'Focus only on the respiratory system'"
                    value={focusTopic}
                    onChange={(e) => setFocusTopic(e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tell the AI exactly what rapid-fire questions to generate from the document.
                  </p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors bg-muted/30"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, PPTX, DOCX, TXT (Max 130MB)</p>
              </div>
            )}
          </div>

          {!file && (
            <>
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
                <h2 className="text-sm font-medium mb-3">Paste Notes OR Describe Topic</h2>
                <Textarea
                  placeholder="Paste your notes here (no length limit) or describe a specific anatomy topic..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[150px] resize-y"
                />
              </div>
            </>
          )}

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
            className="w-full h-12 text-base gradient-primary"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Content...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Rapid Quiz
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Rapid;