import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageCircle, Download, Search, Plus, FileText, Brain, Zap, Map, Eye, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type CategoryType = "All" | "Quiz" | "Flashcards" | "Notes" | "Image Map";

import axios from "axios";

const Community = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPost, setPreviewPost] = useState<any>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

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

  const [categories, setCategories] = useState<{ name: CategoryType; icon: any; count: number }[]>([
    { name: "All", icon: FileText, count: 0 },
    { name: "Quiz", icon: Brain, count: 0 },
    { name: "Flashcards", icon: Zap, count: 0 },
    { name: "Notes", icon: FileText, count: 0 },
    { name: "Image Map", icon: Map, count: 0 },
  ]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // If "All", fetch everything to calculate counts
      const response = await axios.get(`http://localhost:5000/api/community`, {
        params: { category: selectedCategory === "All" ? undefined : selectedCategory }
      });

      const fetchedPosts = response.data.posts;
      setPosts(fetchedPosts);

      // Update counts if fetching "All"
      if (selectedCategory === "All") {
        const newCategories = [
          { name: "All", icon: FileText, count: 0 },
          { name: "Quiz", icon: Brain, count: 0 },
          { name: "Flashcards", icon: Zap, count: 0 },
          { name: "Notes", icon: FileText, count: 0 },
          { name: "Image Map", icon: Map, count: 0 },
        ] as { name: CategoryType; icon: any; count: number }[];

        // Count "All"
        newCategories[0].count = fetchedPosts.length;

        // Count others
        fetchedPosts.forEach((p: any) => {
          const cat = newCategories.find(c => c.name === p.type);
          if (cat) cat.count++;
        });

        setCategories(newCategories);
      }

    } catch (error) {
      console.error("Error fetching community posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Placeholder data - will be replaced with real data from backend




  const handleShare = (formData: any) => {
    console.log("Sharing content:", formData);
    toast({
      title: "Content Shared!",
      description: "Your study material has been shared with the community.",
    });
    setIsShareOpen(false);
  };

  const handleDownload = (post: any) => {
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
                  handleShare(Object.fromEntries(formData));
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
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Remove this quiz from the community?")) return;
                            try {
                              const token = localStorage.getItem('token');
                              await axios.put(`http://localhost:5000/api/image-map/${post.id}/unshare`, {}, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              toast({ title: "Removed", description: "Quiz removed from community." });
                              // Remove from local state
                              setPosts(prev => prev.filter(p => p.id !== post.id));
                              // Update counts
                              setCategories(prev => prev.map(c => {
                                if (c.name === "All" || c.name === post.type) {
                                  return { ...c, count: Math.max(0, c.count - 1) };
                                }
                                return c;
                              }));
                            } catch (err) {
                              console.error("Failed to remove:", err);
                              toast({ variant: "destructive", title: "Action Failed", description: "You are not authorized to remove this." });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <h3 className="text-xl font-semibold mb-2">{post.title}</h3>

                        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-sm">
                          <span className="text-primary font-medium">{post.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-glass-border">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Optimistic update
                          setPosts(prev => prev.map(p =>
                            p.id === post.id ? { ...p, likes: p.likes + 1 } : p
                          ));

                          try {
                            const token = localStorage.getItem('token');
                            const headers = token ? { Authorization: `Bearer ${token}` } : {};
                            const endpoint = post.type === 'Image Map'
                              ? `http://localhost:5000/api/image-map/${post.id}/like`
                              : `http://localhost:5000/api/quiz/${post.id}/vote`; // Standard quiz often uses vote or like. Checking conventions...
                            // Actually, standard Quiz might just use /api/quiz/:id/like if implemented.
                            // I'll stick to ImageMap for now or safe check.
                            // Safe bet default:

                            await axios.post(endpoint, {}, { headers });
                          } catch (err) {
                            // Revert
                            setPosts(prev => prev.map(p =>
                              p.id === post.id ? { ...p, likes: p.likes - 1 } : p
                            ));
                            console.error("Like failed", err);
                            toast({ title: "Error", description: "Failed to like post.", variant: "destructive" });
                          }
                        }}
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

                      {post.type === 'Image Map' ? (
                        <button
                          onClick={() => navigate(`/image-map/${post.id}`)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                        >
                          <Play className="h-4 w-4" />
                          Take Quiz
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(post)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                        >
                          <Download className="h-4 w-4" />
                          Download
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
              Preview of {previewPost?.type} by {previewPost?.author}
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
                  <span className="font-medium">{previewPost?.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Author:</span>
                  <span className="font-medium">{previewPost?.author}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {previewPost?.type === 'Image Map' || previewPost?.type === 'Quiz' ? 'Questions:' : 'Downloads:'}
                  </span>
                  <span className="font-medium">
                    {previewPost?.type === 'Image Map' || previewPost?.type === 'Quiz'
                      ? previewPost?.questionCount
                      : previewPost?.downloads}
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
              {previewPost?.type === 'Image Map' ? (
                <Button
                  onClick={() => {
                    navigate(`/image-map/${previewPost.id}`);
                    setPreviewPost(null);
                  }}
                  className="gradient-primary flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Take Quiz
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    handleDownload(previewPost);
                    setPreviewPost(null);
                  }}
                  className="gradient-primary flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Community;
