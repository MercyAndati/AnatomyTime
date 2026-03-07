import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Brain, FileText, Zap, Users, Sparkles, Clock, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Navigation />
      
      {/* 🚀 HERO SECTION */}
      <section className="pt-32 pb-10 px-4 overflow-hidden relative">
        {/* Cellular Hexagon pattern for biological/medical feel */}
        <div className="absolute inset-0 bg-grid-hexagon [mask-image:radial-gradient(ellipse_100%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <div className="container mx-auto max-w-6xl text-center relative z-10 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-foreground">
            Master Human Anatomy, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              With constant practice.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload or paste your notes, or simply describe a topic. Our advanced AI instantly generates smart flashcards and quizzes, complementing our hand-crafted, interactive image maps.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              size="lg" 
              className="w-full sm:w-auto h-12 px-8 text-base font-medium shadow-lg hover:shadow-primary/25 transition-all"
              onClick={() => navigate("/auth")}
            >
              Start Learning for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* 🍱 BENTO GRID FEATURES SECTION */}
      <section className="py-24 px-4 bg-muted/20 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Built for Medical Precision</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Everything you need to memorize complex systems, prepare for exams, and test your recall speed.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
            
            {/* Bento Box 1: Quiz Generation */}
            <div className="md:col-span-2 glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110">
                <FileText className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">AI-Generated Quizzes</h3>
                <p className="text-muted-foreground max-w-md">
                  Upload your notes or describe a topic. The AI creates custom quizzes with multiple-choice and free-response questions. Get immediate feedback on your answers.
                </p>
              </div>
            </div>

            {/* Bento Box 2: Rapid Quiz */}
            <div className="glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Rapid Fire Mode</h3>
                <p className="text-muted-foreground text-sm">
                  Timed quizzes that test your recall speed. Same AI-generated questions, now against the clock.
                </p>
              </div>
            </div>           

            {/* Bento Box 3: Flashcards */}
            <div className="glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Smart Flashcards</h3>
                <p className="text-muted-foreground text-sm">
                  Turn your notes into interactive flashcards. Review at your own pace and track which cards you've mastered.
                </p>
              </div>
            </div>

            {/* Bento Box 4: Community */}
            <div className="md:col-span-2 glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 transition-transform group-hover:scale-110">
                <Users className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Community Hub</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Share your generated quizzes and flashcards. Discover materials shared by other students studying similar topics.
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary"/> Share content</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary"/> Download resources</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary"/> Like and comment</span>
                </div>
              </div>
            </div>

            {/* Bento Box 5: Image Map Quiz */}
            <div className="md:col-span-3 glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110">
                <Target className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Image Map Quizzes</h3>
                <p className="text-muted-foreground max-w-md">
                  Test your spatial understanding by clicking on unlabeled anatomical images. Hand-crafted by educators for accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🏁 BOTTOM CTA SECTION */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5"></div>
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">
              Ready to improve your learning experience?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Start actively recalling information with AI-powered study tools built specifically for medical education.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="h-14 px-10 text-lg shadow-primary/20 shadow-lg" onClick={() => navigate("/auth")}>
                Create Free Account
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;