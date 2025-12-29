import { useState } from "react";
import { Brain, FileText, Zap, Users, Map, Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

export function Navigation() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/quiz", icon: FileText, label: "Quiz" },
    { to: "/flashcards", icon: FileText, label: "Flashcards" },
    { to: "/rapid", icon: Zap, label: "Rapid Quiz" },
    { to: "/image-map", icon: Map, label: "Image Map" },
    { to: "/community", icon: Users, label: "Community" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and mobile menu */}
          <div className="flex items-center gap-3 lg:gap-6">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative lg:hidden group"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5 transition-all group-hover:scale-110" />
                  {/* Subtle indicator */}
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse opacity-75"></span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                  <SheetTitle className="flex items-center gap-3">
                    <Brain className="h-7 w-7 text-primary" />
                    <span className="text-xl font-bold">AnatomyAI</span>
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    Explore anatomy learning tools
                  </p>
                </SheetHeader>
                <nav className="flex flex-col py-4">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-4 text-base font-medium text-foreground hover:text-primary transition-colors py-3 px-6 hover:bg-accent/50"
                        activeClassName="text-primary bg-accent/30 border-l-4 border-primary"
                      >
                        <Icon className="h-5 w-5" />
                        {link.label}
                      </NavLink>
                    );
                  })}
                  <div className="mt-auto px-6 pt-6 border-t">
                    <Button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/auth");
                      }}
                      className="w-full gradient-primary py-6 text-base"
                    >
                      Get Started
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <NavLink
              to="/"
              className="flex items-center gap-2 text-xl font-bold text-primary hover:text-primary-glow transition-colors"
            >
              <Brain className="h-7 w-7" />
              <span className="hidden sm:inline">AnatomyAI</span>
              <span className="sm:hidden">AA</span>
            </NavLink>
          </div>

          {/* Center - Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors group relative"
                  activeClassName="text-primary"
                >
                  <Icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="relative">
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-0.5 bg-primary transition-all duration-300"></span>
                  </span>
                  {/* Active indicator */}
                  <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full opacity-0 group-[&.active]:opacity-100 transition-opacity"></span>
                </NavLink>
              );
            })}
          </div>

          {/* Right side - Theme toggle and CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            
            {/* Responsive CTA Buttons */}
            {/* Desktop */}
            <Button
              onClick={() => navigate("/auth")}
              className="hidden lg:flex gradient-primary min-w-[120px]"
            >
              Get Started
            </Button>
            
            {/* Tablet */}
            <Button
              onClick={() => navigate("/auth")}
              className="hidden md:flex lg:hidden gradient-primary text-sm px-4"
            >
              Get Started
            </Button>
            
            {/* Mobile */}
            <Button
              onClick={() => navigate("/auth")}
              className="md:hidden gradient-primary text-sm px-3"
              size="sm"
            >
              <span className="sm:hidden">Go</span>
              <span className="hidden sm:inline">Start</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}