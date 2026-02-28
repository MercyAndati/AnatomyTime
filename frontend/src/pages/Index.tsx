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
      <section className="pt-32 pb-20 px-4 overflow-hidden relative">
        {/* Subtle background grid pattern for technical feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <div className="container mx-auto max-w-6xl text-center relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border mb-8 shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold tracking-wide uppercase text-foreground">Anatomy AI 2.0 is Live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-foreground">
            Master Human Anatomy. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              In Half the Time.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload or paste your notes, or simply describe a topic. Our advanced AI instantly generates smart flashcards and rapid-fire quizzes, complementing our hand-crafted, interactive image maps.
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
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto h-12 px-8 text-base font-medium bg-background"
              onClick={() => navigate("/quiz")}
            >
              Try the Demo
            </Button>
          </div>

          {/* 💻 PURE CSS APP MOCKUP (Shows the product instantly) */}
          <div className="mx-auto max-w-4xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-400/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden text-left">
              {/* Mockup Header */}
              <div className="h-12 border-b border-border bg-muted/30 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                <div className="mx-auto bg-background border border-border rounded-md px-3 py-1 text-xs text-muted-foreground font-medium flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Rapid Fire Quiz Active
                </div>
              </div>
              {/* Mockup Body */}
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Question 4 of 50</span>
                  <span className="text-sm font-bold text-destructive flex items-center gap-1.5 animate-pulse"><Clock className="h-4 w-4"/> 00:42</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[8%] rounded-full"></div>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
                  Which of the following structures passes through the foramen magnum?
                </h3>
                <div className="space-y-3">
                  {["Internal carotid artery", "Vertebral arteries", "Optic nerve", "Olfactory nerve"].map((ans, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${i === 1 ? 'border-primary bg-primary/5' : 'border-border bg-background'} flex items-center gap-3`}>
                      <div className={`h-4 w-4 rounded-full border ${i === 1 ? 'border-primary border-[5px]' : 'border-muted-foreground'}`}></div>
                      <span className={`text-base ${i === 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{ans}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🍱 BENTO GRID FEATURES SECTION */}
      <section className="py-24 px-4 bg-muted/20 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Built for Medical Precision</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Everything you need to memorize complex systems, prepare for practicals, and test your recall speed.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
            
            {/* Bento Box 1: Image Maps (Spans 2 columns) */}
            <div className="md:col-span-2 glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110">
                <Target className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Interactive Image Maps</h3>
                <p className="text-muted-foreground max-w-md">Upload anatomical diagrams. Our AI automatically maps and labels regions, turning static images into clickable identification quizzes.</p>
              </div>
            </div>

            {/* Bento Box 2: Rapid Quiz */}
            <div className="glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Rapid Fire</h3>
                <p className="text-muted-foreground text-sm">Test your knowledge under extreme pressure. Set a timer and answer unlimited AI-generated questions to sharpen your clinical recall speed.</p>
              </div>
            </div>

            {/* Bento Box 3: Flashcards */}
            <div className="glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group">
              <div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Smart Flashcards</h3>
                <p className="text-muted-foreground text-sm">Paste 50 pages of dense lecture notes. The AI instantly extracts the highest-yield facts into flippable, spaced-repetition cards.</p>
              </div>
            </div>

            {/* Bento Box 4: Community (Spans 2 columns) */}
            <div className="md:col-span-2 glass-card bg-card/50 hover:bg-card/80 p-8 flex flex-col justify-between group overflow-hidden relative">
               <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 transition-transform group-hover:scale-110">
                <Users className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Global Study Community</h3>
                <p className="text-muted-foreground max-w-md mb-6">Why study alone? Discover, download, and review top-rated quizzes and flashcard decks shared by thousands of other medical students globally.</p>
                <div className="flex items-center gap-4 text-sm font-medium text-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary"/> Share Notes</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary"/> Download PDFs</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary"/> Compete</span>
                </div>
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
              Ready to crush your next practical?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Stop re-reading the textbook. Start actively recalling information with AI-powered study tools built specifically for medical education.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="h-14 px-10 text-lg shadow-primary/20 shadow-lg" onClick={() => navigate("/auth")}>
                Create Free Account
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">No credit card required. Start studying in 30 seconds.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;