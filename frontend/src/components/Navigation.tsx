// frontend/src/components/Navigation.tsx
import { useState, useEffect } from "react";
import { Brain, FileText, Zap, Users, Map, Menu, User, LogOut, LayoutDashboard } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { User as UserType } from "@/types";

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkUser();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      checkUser();
    };

    // Listen for custom login event (same tab)
    const handleLogin = () => {
      checkUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLogin', handleLogin);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogin', handleLogin);
    };
  }, [location]); // Re-check when route changes (e.g., after login)

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('userLogout'));
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/");
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  // Base navigation links for all users
  const navLinks = [
    { to: "/quiz", icon: FileText, label: "Quiz" },
    { to: "/flashcards", icon: FileText, label: "Flashcards" },
    { to: "/rapid", icon: Zap, label: "Rapid Quiz" },
    { to: "/image-map", icon: Map, label: "Image Map" },
    { to: "/community", icon: Users, label: "Community" },
  ];

  // Add dashboard link only for logged in users
  const allNavLinks = user 
    ? [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }, ...navLinks]
    : navLinks;

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
                    <span className="text-xl font-bold">AnatomyTime</span>
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    Explore anatomy learning tools
                  </p>
                </SheetHeader>
                <nav className="flex flex-col py-4">
                  {allNavLinks.map((link) => {
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
                    {user ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {getUserInitials(user.name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleLogout();
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate("/auth");
                        }}
                        className="w-full gradient-primary py-6 text-base"
                      >
                        Get Started
                      </Button>
                    )}
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
              <span className="hidden sm:inline">AnatomyTime</span>
              <span className="sm:hidden">AA</span>
            </NavLink>
          </div>

          {/* Center - Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            {allNavLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-2 text-md font-medium text-foreground hover:text-primary transition-colors group relative"
                  activeClassName="text-primary"
                >
                  <Icon className="h-4 w-5 group-hover:scale-110 transition-transform" />
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

          {/* Right side - Theme toggle and User Menu/CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            
            {user ? (
              /* User Menu Dropdown */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={user.name || user.email} />
                      <AvatarFallback>
                        {getUserInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <User className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Get Started Buttons */
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}