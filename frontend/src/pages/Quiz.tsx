import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Sparkles, Loader2, Target, FileText, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/utils/api";

const Quiz = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [focusTopic, setFocusTopic] = useState(""); 
  const [numQuestions, setNumQuestions] = useState("10");
  const [difficulty, setDifficulty] = useState("standard");
  const [questionType, setQuestionType] = useState("mixed");
  
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
    if (!description && !file) {
      toast({
        title: "Missing information",
        description: "Please enter a topic, paste notes, or upload a file",
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
        formData.append('numQuestions', numQuestions);
        formData.append('difficulty', difficulty);
        formData.append('questionType', questionType);
        if (focusTopic) formData.append('focusTopic', focusTopic);
        
        response = await api.generateQuizFromFile(formData);
      } else {
        response = await api.generateQuiz({
          prompt: description,
          numQuestions: parseInt(numQuestions),
          difficulty,
          questionType,
        });
      }

      toast({
        title: "Success!",
        description: response.message,
      });

      navigate(`/quiz/${response.quiz.id}`);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to generate quiz";
      
      // If there's a file, push the error to the UI box instead of a toast
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

    // Check if the number of questions is valid
  const parsedNum = parseInt(numQuestions);
  const isNumInvalid = isNaN(parsedNum) || parsedNum < 1 || parsedNum > 50;

  const isGenerateDisabled = 
    loading || 
    (!description && !file) || 
    (requiresFocusTopic && !focusTopic.trim()) ||
    !!fileError ||
    isNumInvalid; //Instantly disable button if number is out of bounds

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Your Quiz</h1>
          <p className="text-muted-foreground mt-1">
            Upload your study materials or describe what you want to learn
          </p>
        </div>

        <div className="space-y-6">
          {/* File Upload Area */}
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
                
                {/* File Info Banner - Changes to RED on error */}
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

                {/* Inline Error Display */}
                {fileError && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-md text-sm border border-destructive/20 flex flex-col gap-2">
                    <div className="flex items-start gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>File Processing Failed</p>
                    </div>
                    <p className="opacity-90 ml-6">{fileError}</p>
                    
                    {/* Dynamic User Help based on the specific error */}
                    {fileError.toLowerCase().includes('anatomy') || fileError.toLowerCase().includes('rejected') ? (
                       <p className="ml-6 mt-1 text-xs opacity-100 font-bold text-destructive">
                         Please upload a document that specifically covers anatomy, biology, or medical topics.
                       </p>
                    ) : fileError.toLowerCase().includes('drm') || fileError.toLowerCase().includes('encrypted') ? (
                       <p className="ml-6 mt-1 text-xs opacity-90 font-medium bg-background/50 p-2 rounded border border-destructive/10">
                         💡 <strong>Pro Tip:</strong> If this is an encrypted textbook, try opening it in Chrome, selecting "Print", and saving as a new PDF to remove the publisher's lock!
                       </p>
                    ) : (
                       <p className="ml-6 mt-1 text-xs opacity-80 font-medium">
                         Please remove this file and paste your notes into the text box below instead.
                       </p>
                    )}
                  </div>
                )}

                {/* Focus Topic Input - Hides if there's an error */}
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
                      placeholder="E.g., 'Focus only on the heart valves' or 'Skip the history section'"
                      value={focusTopic}
                      onChange={(e) => setFocusTopic(e.target.value)}
                      className={`bg-background ${requiresFocusTopic && !focusTopic ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {requiresFocusTopic && !focusTopic && (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        This file is very large. You must specify a focus topic to prevent the AI from generating random questions.
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
            <h2 className="text-sm font-medium mb-3">Paste Notes OR Describe Topic</h2>
            <div className="relative">
                  <Textarea
                    maxLength={100000}
                    placeholder="Paste your notes here or describe a specific anatomy topic..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[150px] resize-y pb-8"
                  />
                  <div className={`absolute bottom-2 right-3 text-xs font-medium ${
                    description.length > 98000 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {description.length.toLocaleString()} / 100,000 chars
                  </div>
                </div>
                
                {/*Warning text when limit is hit */}
                {description.length >= 100000 && (
                  <p className="text-xs font-bold text-destructive mt-1 animate-in fade-in">
                    ⚠️ Character limit reached. Please remove some text or narrow your focus to continue.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  For the best AI accuracy, paste notes for a single chapter or system at a time.
                </p>
          </div>

          {/* Quiz Settings Grid */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Number of Questions</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className={`mt-1 ${isNumInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {/*Inline error message */}
                {isNumInvalid && (
                  <p className="text-xs text-destructive mt-1 font-medium">
                    Please enter a number between 1 and 50.
                  </p>
                )}
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
            </div>
          </div>

          {/* Generate Button */}
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
                    Large files (like {file.name}) can take 1-2 minutes to analyze. Please don't close this page.
                  </span>
                )}
              </div>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Quiz
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

export default Quiz;