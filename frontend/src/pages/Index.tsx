import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Brain, FileText, Zap, Users, Upload, Sparkles, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-hero">
        <div className="container mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-card mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Medical Learning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Master Anatomy with AI
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Transform your study notes into interactive quizzes, flashcards, and rapid-fire tests. 
            Learn smarter, not harder with AI-powered feedback.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="gradient-primary text-lg px-8 h-12"
              onClick={() => navigate("/auth")}
            >
              Start Learning Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="glass text-lg px-8 h-12"
              onClick={() => navigate("/quiz")}
            >
              Try Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Everything You Need to Excel
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Quiz Section */}
            <div className="glass-card animate-slide-up cursor-pointer" onClick={() => navigate("/quiz")}>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Quizzes</h3>
              <p className="text-muted-foreground mb-4">
                Upload notes or describe topics. AI generates custom quizzes with multiple choice or input questions.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  File upload support
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI grading & review
                </li>
              </ul>
            </div>

            {/* Flashcards Section */}
            <div className="glass-card animate-slide-up cursor-pointer" onClick={() => navigate("/flashcards")} style={{ animationDelay: "0.1s" }}>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Flashcards</h3>
              <p className="text-muted-foreground mb-4">
                Turn your notes into interactive flashcards instantly. Perfect for memorization and quick review.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Auto-generated
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Smart spaced repetition
                </li>
              </ul>
            </div>

            {/* Rapid Quiz Section */}
            <div className="glass-card animate-slide-up cursor-pointer" onClick={() => navigate("/rapid")} style={{ animationDelay: "0.2s" }}>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Rapid Fire</h3>
              <p className="text-muted-foreground mb-4">
                Test your knowledge under pressure. Timed unlimited questions to sharpen your recall speed.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Timed challenges
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Unlimited questions
                </li>
              </ul>
            </div>

            {/* Community Section */}
            <div className="glass-card animate-slide-up cursor-pointer" onClick={() => navigate("/community")} style={{ animationDelay: "0.3s" }}>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Hub</h3>
              <p className="text-muted-foreground mb-4">
                Share your study materials, discover resources from peers, and learn together.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Share & discover
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Like & comment
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="glass-card text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Studies?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join thousands of medical students using AI to ace their anatomy exams.
            </p>
            <Button 
              size="lg" 
              className="gradient-primary text-lg px-8 h-12"
              onClick={() => navigate("/auth")}
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
