// frontend/src/pages/Community.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageCircle, Download, Search, Plus, FileText, Brain, Zap, Map, Eye, Play, Trash2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/utils/api";
import type { CommunityPost } from "@/types";

// Define TypeScript interfaces
type CategoryType = "All" | "Quiz" | "Flashcards" | "Notes" | "Image Map";

interface Category {
  name: CategoryType;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  count: number;
}

// Map backend types to frontend category names
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
  const { toast } = useToast();
  const navigate = useNavigate();

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
      const response = await api.getCommunityPosts(selectedCategory === "All" ? undefined : selectedCategory);

      const fetchedPosts: CommunityPost[] = response.posts;
      setPosts(fetchedPosts);

      // Update counts if fetching "All"
      if (selectedCategory === "All") {
        const newCategories: Category[] = [
          { name: "All", icon: FileText, count: 0 },
          { name: "Quiz", icon: Brain, count: 0 },
          { name: "Flashcards", icon: Zap, count: 0 },
          { name: "Notes", icon: FileText, count: 0 },
          { name: "Image Map", icon: Map, count: 0 },
        ];

        // Count "All"
        newCategories[0].count = fetchedPosts.length;

        // Count others
        fetchedPosts.forEach((p: CommunityPost) => {
          const categoryName = typeToCategoryMap[p.type] || p.type;
          const cat = newCategories.find(c => c.name === categoryName);
          if (cat) cat.count++;
        });

        setCategories(newCategories);
      }

    } catch (error) {
      console.error("Error fetching community posts:", error);
      toast({
        title: "Error",
        description: "Failed to load community posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleShare = (formData: Record<string, string>) => {
    console.log("Sharing content:", formData);
    toast({
      title: "Content Shared!",
      description: "Your study material has been shared with the community.",
    });
    setIsShareOpen(false);
  };

  const handleLike = async (post: CommunityPost) => {
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, likes: p.likes + 1 } : p
    ));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please login to like posts",
          variant: "destructive",
        });
        // Revert
        setPosts(prev => prev.map(p =>
          p.id === post.id ? { ...p, likes: p.likes - 1 } : p
        ));
        return;
      }

      await api.likePost(post.resourceId || post.id, post.type);
    } catch (err) {
      // Revert on error
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, likes: p.likes - 1 } : p
      ));
      console.error("Like failed", err);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (post: CommunityPost) => {
    if (!confirm("Remove this from the community?")) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ 
          variant: "destructive", 
          title: "Error", 
          description: "Please login to remove posts." 
        });
        return;
      }
      
      await api.deletePost(post.id);
      
      toast({ 
        title: "Removed", 
        description: "Post removed from community." 
      });
      
      // Remove from local state
      setPosts(prev => prev.filter(p => p.id !== post.id));
      
      // Update counts
      const categoryName = typeToCategoryMap[post.type] || post.type;
      
      setCategories(prev => prev.map(c => {
        if (c.name === "All" || c.name === categoryName) {
          return { ...c, count: Math.max(0, c.count - 1) };
        }
        return c;
      }));
      
    } catch (err: unknown) {
      console.error("Failed to remove:", err);
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || "You are not authorized to remove this.";
      toast({ 
        variant: "destructive", 
        title: "Action Failed", 
        description: errorMessage 
      });
    }
  };

  const handleDownload = (post: CommunityPost) => {
    toast({
      title: "Download Started",
      description: `Downloading "${post.title}"...`,
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <Navigation />

      <div className="container mx-auto px-4 pt-32">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Community Hub
              </h1>
              <p className="text-muted-foreground text-lg">
                Share your study materials and learn from others
              </p>
            </div>

            <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-5 w-5 mr-2" />
                  Share Content
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Share Study Material</DialogTitle>
                  <DialogDescription>
                    Share your quizzes, flashcards, notes, or image maps with the community.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data: Record<string, string> = {};
                  formData.forEach((value, key) => {
                    data[key] = value.toString();
                  });
                  handleShare(data);
                }} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" placeholder="e.g., Complete Nervous System Quiz" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Content Type</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Quiz">Quiz</SelectItem>
                        <SelectItem value="Flashcards">Flashcards</SelectItem>
                        <SelectItem value="Notes">Notes</SelectItem>
                        <SelectItem value="Image Map">Image Map</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe your study material..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsShareOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="gradient-primary flex-1">
                      Share
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Bar */}
          <div className="glass-card mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search community resources..."
                className="pl-10 glass border-0"
              />
            </div>
          </div>

          <div className="flex gap-6">
            {/* Side Panel - Categories */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="glass-card sticky top-24">
                <h2 className="font-semibold text-lg mb-4">Categories</h2>
                <nav className="space-y-1">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = selectedCategory === category.name;
                    return (
                      <button
                        key={category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span>{category.name}</span>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          isActive ? "bg-primary/20" : "bg-muted"
                        )}>
                          {category.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Mobile Category List */}
            <div className="lg:hidden w-full mb-6">
              <div className="glass-card">
                <h2 className="font-semibold text-lg mb-3">Categories</h2>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isActive = selectedCategory === category.name;
                    return (
                      <button
                        key={category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span>{category.name}</span>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          isActive ? "bg-primary/20" : "bg-muted"
                        )}>
                          {category.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="flex-1 space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <p>Loading community posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <p>No posts found for this category.</p>
                </div>
              ) : (
                posts.map((post, index) => (
                  <div
                    key={post.id}
                    className="glass-card animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {post.author[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{post.author}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                          </div>
                        </div>

                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors ml-auto p-2"
                          title="Remove from Community (Admin/Owner)"
                          onClick={() => handleDelete(post)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <h3 className="text-xl font-semibold mb-2">
                          {post.title.replace(/^Flashcards:\s*/, '').replace(/^Quiz:\s*/, '')}
                        </h3>

                        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-sm">
                          <span className="text-primary font-medium">{typeToCategoryMap[post.type] || post.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-glass-border">
                      <button
                        onClick={() => handleLike(post)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Heart className="h-4 w-4" />
                        {post.likes}
                      </button>
                      <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <MessageCircle className="h-4 w-4" />
                        {post.comments}
                      </button>
                      <button
                        onClick={() => setPreviewPost(post)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </button>

                      {post.type === 'image_map_share' ? (
                        <button
                          onClick={() => navigate(`/image-map/${post.resourceId || post.id}`)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                        >
                          <Play className="h-4 w-4" />
                          Take Quiz
                        </button>
                      ) : post.type === 'flashcard_share' ? (
                        <button
                          onClick={() => navigate(`/flashcards/${post.resourceId || post.id}`)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                        >
                          <BookOpen className="h-4 w-4" />
                          View Cards
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/quiz/${post.resourceId || post.id}`)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                        >
                          <Play className="h-4 w-4" />
                          Take Quiz
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{previewPost?.title}</DialogTitle>
            <DialogDescription>
              Preview of {typeToCategoryMap[previewPost?.type || ''] || previewPost?.type} by {previewPost?.author}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card">
              <p className="text-sm text-muted-foreground mb-4">
                This is a preview of the study material. Take Quiz to access the full content.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{typeToCategoryMap[previewPost?.type || ''] || previewPost?.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Author:</span>
                  <span className="font-medium">{previewPost?.author}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {previewPost?.type === 'image_map_share' || previewPost?.type === 'quiz_share' ? 'Questions:' : 'Cards:'}
                  </span>
                  <span className="font-medium">
                    {previewPost?.questionCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Likes:</span>
                  <span className="font-medium">{previewPost?.likes}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewPost(null)} className="flex-1">
                Close
              </Button>
              {previewPost?.type === 'image_map_share' ? (
                <Button
                  onClick={() => {
                    navigate(`/image-map/${previewPost.resourceId || previewPost.id}`);
                    setPreviewPost(null);
                  }}
                  className="gradient-primary flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Take Quiz
                </Button>
              ) : previewPost?.type === 'flashcard_share' ? (
                <Button
                  onClick={() => {
                    navigate(`/flashcards/${previewPost.resourceId || previewPost.id}`);
                    setPreviewPost(null);
                  }}
                  className="gradient-primary flex-1"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Cards
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    navigate(`/quiz/${previewPost.resourceId || previewPost.id}`);
                    setPreviewPost(null);
                  }}
                  className="gradient-primary flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Take Quiz
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Community;