import { Brain, FileText, Zap, Users, Map } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function Navigation() {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-primary hover:text-primary-glow transition-colors"
          >
            <Brain className="h-6 w-6" />
            <span>AnatomyAI</span>
          </NavLink>

          <div className="hidden md:flex items-center gap-6">
            <NavLink
              to="/quiz"
              className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <FileText className="h-4 w-4" />
              Quiz
            </NavLink>
            <NavLink
              to="/flashcards"
              className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <FileText className="h-4 w-4" />
              Flashcards
            </NavLink>
            <NavLink
              to="/rapid"
              className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <Zap className="h-4 w-4" />
              Rapid Quiz
            </NavLink>
            <NavLink
              to="/image-map"
              className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <Map className="h-4 w-4" />
              Image Map
            </NavLink>
            <NavLink
              to="/community"
              className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <Users className="h-4 w-4" />
              Community
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={() => navigate("/auth")} className="gradient-primary">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
