import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Heart, MessageCircle, Download, Search, Plus, FileText, Brain, Zap, Map, Eye, Play, Trash2, BookOpen,Upload,MessageSquare,Lock,Globe} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api, Feedback } from "@/utils/api";
import type { CommunityPost, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CategoryType = "All" | "Quiz" | "Flashcards" | "Notes" | "Image Map";

interface Category {
  name: CategoryType;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  count: number;
}

const typeToCategoryMap: Record<string, CategoryType> = {
  'quiz_share': 'Quiz',
  'flashcard_share': 'Flashcards',
  'image_map_share': 'Image Map',
  'note': 'Notes'
};

const Community = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPost, setPreviewPost] = useState<CommunityPost | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Share form state
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareTitle, setShareTitle] = useState("");
  const [shareContent, setShareContent] = useState("");
  const [shareTags, setShareTags] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [sharing, setSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  // Waits 500ms after user stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  //Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [fbTitle, setFbTitle] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [fbIsPublic, setFbIsPublic] = useState(true);
  const [isSubmittingFb, setIsSubmittingFb] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const [categories, setCategories] = useState<Category[]>([
    { name: "All", icon: FileText, count: 0 },
    { name: "Quiz", icon: Brain, count: 0 },
    { name: "Flashcards", icon: Zap, count: 0 },
    { name: "Notes", icon: FileText, count: 0 },
    { name: "Image Map", icon: Map, count: 0 },
  ]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getCommunityPosts(
        selectedCategory === "All" ? undefined : selectedCategory,
        debouncedSearch,
        sortBy
      );
      const fetchedPosts: CommunityPost[] = response.posts;
      setPosts(fetchedPosts);

      if (selectedCategory === "All") {
        const newCategories: Category[] = [
          { name: "All", icon: FileText, count: 0 },
          { name: "Quiz", icon: Brain, count: 0 },
          { name: "Flashcards", icon: Zap, count: 0 },
          { name: "Notes", icon: FileText, count: 0 },
          { name: "Image Map", icon: Map, count: 0 },
        ];

        newCategories[0].count = fetchedPosts.length;
        fetchedPosts.forEach((p: CommunityPost) => {
          const categoryName = typeToCategoryMap[p.type] || p.type;
          const cat = newCategories.find(c => c.name === categoryName);
          if (cat) cat.count++;
        });
        setCategories(newCategories);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load posts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, debouncedSearch, sortBy, toast]);

  useEffect(() => {
    const fetchUser = async () => {
      if (localStorage.getItem('token')) {
        try {
          const response = await api.getCurrentUser();
          setCurrentUser(response.user);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const loadFeedbacks = async () => {
    try {
      const data = await api.getFeedbacks();
      setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error("Failed to load feedback");
    }
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to submit feedback.", variant: "destructive" });
      return;
    }
    if (!fbTitle || !fbMessage) return;
    
    setIsSubmittingFb(true);
    try {
      await api.submitFeedback({ title: fbTitle, message: fbMessage, isPublic: fbIsPublic });
      toast({ title: "Success", description: "Thank you for your feedback!" });
      setFbTitle("");
      setFbMessage("");
      loadFeedbacks(); 
    } catch (error: unknown) {
      toast({ title: "Error", description: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setIsSubmittingFb(false);
    }
  };

  // Delete Feedback
  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    try {
      await api.deleteFeedback(id);
      toast({ title: "Deleted", description: "Feedback removed successfully." });
      setFeedbacks(prev => prev.filter(fb => fb._id !== id));
    } catch (err: unknown) {
      toast({ title: "Error", description: "Failed to delete feedback.", variant: "destructive" });
    }
  };

  const handleLike = async (post: CommunityPost) => {
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likes + 1 } : p));
    try {
      if (!localStorage.getItem('token')) throw new Error("Auth required");
      await api.likePost(post.id, post.type, post.resourceId);
    } catch (err) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: p.likes - 1 } : p));
      toast({ title: "Error", description: "Please login to like posts", variant: "destructive" });
    }
  };

  const handleDelete = async (post: CommunityPost) => {
    if (!confirm("Remove this from the community?")) return;
    try {
      await api.deletePost(post.id);
      toast({ title: "Removed", description: "Post removed from community." });
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast({ variant: "destructive", title: "Action Failed", description: error.response?.data?.message || "Not authorized." });
    }
  };

  const handleDownloadNote = async (noteId: string, title?: string) => {
    try {
      const note = await api.getNote(noteId);
      if (!note.fileUrl) return;
      
      window.open(note.fileUrl, '_blank', 'noopener,noreferrer');
      
    } catch {
      toast({ title: "Error", description: "Failed to open document", variant: "destructive" });
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Upload a file smaller than 10MB", variant: "destructive" });
      return;
    }
    setShareFile(file);
  };

  const onShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTitle || (!shareFile && !shareContent)) return;
    setSharing(true);
    try {
      await api.createNote({
        title: shareTitle, content: shareContent, tags: shareTags
      }, shareFile || undefined);

      toast({ title: "Success!", description: "Notes shared with the community" });
      setShareFile(null); 
      setShareTitle(""); 
      setShareContent(""); 
      setIsShareOpen(false);
      fetchPosts();
    } catch (err: unknown) {
      toast({ title: "Error", description: "Failed to share", variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 md:pt-32">
        <div className="max-w-6xl mx-auto animate-fade-in">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2 md:mb-4 tracking-tight">
                Community Hub
              </h1>
              <p className="text-muted-foreground text-sm md:text-lg">
                Discover and share high-yield anatomy study materials.
              </p>
            </div>

            <div className="flex gap-3">
              {/* Feedback Button*/}
              <Button 
                variant="outline" 
                className="h-11 px-4 shadow-sm border-primary/20 text-primary hidden md:flex"
                onClick={() => { setIsFeedbackOpen(true); loadFeedbacks(); }}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Feedback Board
              </Button>

              <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary w-full md:w-auto h-11 px-6 shadow-sm">
                    <Plus className="h-5 w-5 mr-2" />
                    Share Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Share Study Materials</DialogTitle>
                    <DialogDescription>Upload notes, guides, or summaries to help the community.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={onShareSubmit} className="space-y-5 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="file" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload Notes</Label>
                      <div
                        onClick={() => document.getElementById('file-upload')?.click()}
                        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => e.preventDefault()}
                        className="border-2 border-dashed border-border bg-muted/20 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <input id="file-upload" type="file" accept=".pdf,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} className="hidden" />
                        {shareFile ? (
                          <div className="flex items-center justify-between bg-background p-3 rounded-md border shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                              <div className="text-left min-w-0">
                                <p className="text-sm font-medium truncate">{shareFile.name}</p>
                                <p className="text-xs text-muted-foreground">{(shareFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setShareFile(null); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                            <p className="text-xs text-muted-foreground mb-3">PDF, DOCX, TXT, Images (Max 10MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="share-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</Label>
                      <Input id="share-title" value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} placeholder="e.g., Complete Heart Anatomy Notes" required className="bg-muted/30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="share-content" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes Content</Label>
                      <Textarea id="share-content" value={shareContent} onChange={(e) => setShareContent(e.target.value)} placeholder="Paste your notes here if you don't have a file..." className="min-h-[120px] bg-muted/30" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setIsShareOpen(false)} className="flex-1">Cancel</Button>
                      <Button type="submit" disabled={(!shareFile && !shareContent) || !shareTitle || sharing} className="gradient-primary flex-1">
                        {sharing ? "Uploading..." : "Share Notes"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 md:mb-8 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search resources, topics, or notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 bg-card border-border shadow-sm text-base" 
              />
            </div>
            <div className="sm:w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12 bg-card border-border shadow-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/*  MOBILE SCROLL MENU */}
            <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar flex gap-2 pb-2">
              <button
                onClick={() => { setIsFeedbackOpen(true); loadFeedbacks(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors border bg-primary/10 text-primary border-primary/20"
              >
                <MessageSquare className="h-4 w-4" /> Feedback Board
              </button>
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.name;
                return (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors border",
                      isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
                    )}
                  >
                    <Icon className="h-4 w-4" /> {category.name}
                  </button>
                );
              })}
            </div>

            {/*  DESKTOP SIDEBAR */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="glass-card sticky top-28 p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-2">Categories</h2>
                <nav className="space-y-1.5">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = selectedCategory === category.name;
                    return (
                      <button
                        key={category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all text-sm",
                          isActive ? "bg-primary/10 text-primary font-medium border border-primary/20" : "hover:bg-muted text-muted-foreground border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" /> <span>{category.name}</span>
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", isActive ? "bg-primary/20" : "bg-muted")}>{category.count}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-8 pt-6 border-t border-border">
                   <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 pl-2">Have Ideas?</h2>
                   <Button onClick={() => { setIsFeedbackOpen(true); loadFeedbacks(); }} variant="secondary" className="w-full justify-start text-sm shadow-none">
                     <MessageSquare className="h-4 w-4 mr-3 text-primary" /> Feature Requests
                   </Button>
                </div>
              </div>
            </aside>

            {/* Posts Feed */}
            <div className="flex-1 space-y-4 md:space-y-6 max-w-3xl">
              {loading ? (
                <div className="text-center py-20 bg-card rounded-lg border border-border"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Loading feed...</p></div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-lg border border-border"><p className="text-muted-foreground">No posts found in this category.</p></div>
              ) : (
                posts.map((post, index) => (
                  <div key={post.id} className="glass-card animate-slide-up p-5 md:p-6" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{post.author.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm md:text-base leading-tight">{post.author}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-normal text-xs bg-muted text-muted-foreground">{typeToCategoryMap[post.type] || post.type}</Badge>
                        {(currentUser?.isAdmin || currentUser?.name === post.author) && (
                          <button className="text-muted-foreground hover:text-destructive p-1" onClick={() => handleDelete(post)}><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </div>
                    <div className="mb-6">
                      <h3 className="text-lg md:text-xl font-bold mb-2 text-foreground">{post.title.replace(/^Flashcards:\s*/, '').replace(/^Quiz:\s*/, '')}</h3>
                      {post.description && <p className="text-sm text-muted-foreground line-clamp-2">{post.description}</p>}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-4 md:gap-6">
                        <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary group"><Heart className="h-4 w-4 group-hover:fill-primary/20" /><span className="font-medium">{post.likes}</span></button>
                        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><MessageCircle className="h-4 w-4" /><span className="font-medium">{post.comments}</span></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewPost(post)} className="hidden sm:flex text-muted-foreground"><Eye className="h-4 w-4 mr-2" />Preview</Button>
                        {post.type === 'image_map_share' ? (
                          <Button size="sm" onClick={() => navigate(`/image-map/${post.resourceId || post.id}`)} className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                            <Map className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Play Map</span>
                          </Button>
                        ) : post.type === 'quiz_share' ? (
                          <Button size="sm" onClick={() => navigate(`/quiz/${post.resourceId || post.id}`)} className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                            <Play className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Take Quiz</span>
                          </Button>
                        ) : post.type === 'flashcard_share' ? (
                          <Button size="sm" onClick={() => navigate(`/flashcards/${post.resourceId || post.id}`)} className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"><BookOpen className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Study Cards</span></Button>
                        ) : (
                          <Button size="sm" onClick={() => { if (post.resourceId) navigate(`/notes/${String(post.resourceId)}`); else setPreviewPost(post); }} className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"><FileText className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Read Note</span></Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-2 border-b border-border">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" /> Feedback Board
            </DialogTitle>
            <DialogDescription className="mt-2">
              Help us improve! Suggest features or report issues directly to the developer.
            </DialogDescription>
          </div>
          
          <Tabs defaultValue="board" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="board">Public Board</TabsTrigger>
                <TabsTrigger value="submit">Submit Idea</TabsTrigger>
              </TabsList>
            </div>

            {/* Public Board Tab */}
            <TabsContent value="board" className="flex-1 overflow-y-auto p-6 m-0 custom-scrollbar">
              {feedbacks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p>No feedback yet. Be the first to suggest a feature!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((fb) => {
                    // Check if current user is admin OR the author of the post
                    const currentUserId = currentUser?.id || (currentUser as User & { _id?: string })?._id;
                    const canDelete = currentUser?.isAdmin || currentUserId === fb.userId;

                    return (
                      <div key={fb._id} className="bg-muted/30 border border-border p-4 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            {fb.title}
                            {!fb.isPublic && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </h4>
                          
                          {/* Only shows if they are Admin or the Author */}
                          {canDelete && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteFeedback(fb._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{fb.message}</p>
                        <div className="text-xs text-muted-foreground/80 flex items-center justify-between">
                          <span>Submitted by <span className="font-medium">{fb.authorName}</span></span>
                          <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Submit Feedback Tab */}
            <TabsContent value="submit" className="flex-1 overflow-y-auto p-6 m-0">
              <form onSubmit={handleFeedbackSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fb-title" className="text-xs font-semibold uppercase tracking-wider">Idea Title</Label>
                  <Input 
                    id="fb-title" 
                    value={fbTitle} 
                    onChange={(e) => setFbTitle(e.target.value)} 
                    placeholder="e.g., Add dark mode to flashcards" 
                    required 
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fb-message" className="text-xs font-semibold uppercase tracking-wider">Details</Label>
                  <Textarea 
                    id="fb-message" 
                    value={fbMessage} 
                    onChange={(e) => setFbMessage(e.target.value)} 
                    placeholder="Describe your feature request or bug report..." 
                    className="min-h-[150px] bg-background resize-none"
                    required
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider">Visibility</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setFbIsPublic(true)}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${fbIsPublic ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}
                    >
                      <Globe className={`h-5 w-5 mb-2 ${fbIsPublic ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className={`font-medium text-sm ${fbIsPublic ? 'text-foreground' : 'text-muted-foreground'}`}>Public</p>
                      <p className="text-xs text-muted-foreground mt-1">Visible to community</p>
                    </div>
                    
                    <div 
                      onClick={() => setFbIsPublic(false)}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${!fbIsPublic ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}
                    >
                      <Lock className={`h-5 w-5 mb-2 ${!fbIsPublic ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className={`font-medium text-sm ${!fbIsPublic ? 'text-foreground' : 'text-muted-foreground'}`}>Private</p>
                      <p className="text-xs text-muted-foreground mt-1">Only to developers</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-6">
                  <Button type="submit" className="w-full gradient-primary" disabled={isSubmittingFb || !fbTitle || !fbMessage}>
                    {isSubmittingFb ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{previewPost?.title}</DialogTitle>
            <DialogDescription>
              Shared by <span className="font-medium text-foreground">{previewPost?.author}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <p className="text-sm text-foreground mb-4">{previewPost?.description || "No description provided."}</p>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Format</span>
                  <span className="font-medium flex items-center gap-1.5">{typeToCategoryMap[previewPost?.type || ''] || previewPost?.type}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setPreviewPost(null)} className="sm:w-24">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;