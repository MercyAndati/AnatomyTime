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
import { 
  Heart, 
  MessageCircle, 
  Download, 
  Search, 
  Plus, 
  FileText, 
  Brain, 
  Zap, 
  Map, 
  Eye, 
  Play, 
  Trash2, 
  BookOpen,
  Upload  // ✅ This was missing!
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/utils/api";
import type { CommunityPost, User } from "@/types";

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
    const fetchUser = async () => {
      if (localStorage.getItem('token')) {
        try {
          const response = await api.getCurrentUser();
          setCurrentUser(response.user);
        } catch (err) {
          console.error("Failed to fetch user session", err);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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

      // Pass both post ID and resource ID
      await api.likePost(post.id, post.type, post.resourceId);
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

  const handleDownloadNote = async (noteId: string, title?: string) => {
  try {
    const note = await api.getNote(noteId);

    if (!note.fileUrl) {
      toast({
        title: "No file",
        description: "This note has no downloadable file",
        variant: "destructive",
      });
      return;
    }

    const fileName = note.fileUrl.split('/').pop();

    const response = await fetch(
      api.getNoteFileUrl(fileName!)
    );

    const blob = await response.blob();

    const safeTitle = (title || note.title)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();

    const ext = fileName?.includes('.')
      ? fileName.split('.').pop()
      : '';

    const downloadName = ext
      ? `${safeTitle}.${ext}`
      : safeTitle;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = downloadName;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);

  } catch {
    toast({
      title: "Error",
      description: "Failed to download note",
      variant: "destructive",
    });
  }
};

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }
    setShareFile(file);
  };

  // Reset share form
  const resetShareForm = () => {
    setShareFile(null);
    setShareTitle("");
    setShareContent("");
    setShareTags("");
    setShareDescription("");
    setSharing(false);
  };

  // ✅ FIXED: This function name must match what's used in the form
  const onShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shareTitle || (!shareFile && !shareContent)) {
      toast({
        title: "Missing information",
        description: "Please provide a title and either a file or content",
        variant: "destructive",
      });
      return;
    }

    setSharing(true);

    try {
      // First create the note
      const createResponse = await api.createNote({
        title: shareTitle,
        content: shareContent,
        tags: shareTags
      }, shareFile || undefined);

      // ===== ADD THIS: Then share it to community =====
      if (createResponse.note && createResponse.note.id) {
        await api.shareNote(createResponse.note.id);
      }
      // ================================================

      toast({
        title: "Success!",
        description: "Your notes have been shared with the community",
      });

      // Reset form and close dialog
      resetShareForm();
      setIsShareOpen(false);
      
      // Refresh community posts to show new note
      fetchPosts();

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share notes",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
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

            {/* ===== SHARE DIALOG ===== */}
            <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-5 w-5 mr-2" />
                  Share Study Materials
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Share Study Materials</DialogTitle>
                  <DialogDescription>
                    Upload your notes, study guides, or anatomy summaries to share with the community.
                  </DialogDescription>
                </DialogHeader>
                
                {/* ✅ FIXED: Using onShareSubmit (correct function name) */}
                <form onSubmit={onShareSubmit} className="space-y-6 pt-4">
                  {/* File Upload Area */}
                  <div className="space-y-2">
                    <Label htmlFor="file">Upload Notes (PDF, DOCX, TXT, Images)</Label>
                    <div
                      onClick={() => document.getElementById('file-upload')?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-primary');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary');
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          handleFileSelect(file);
                        }
                      }}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                        className="hidden"
                      />
                      
                      {shareFile ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium">{shareFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(shareFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareFile(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                          <p className="text-xs text-muted-foreground">
                            PDF, DOCX, TXT, or Images (Max 10MB)
                          </p>
                          <div className="bg-primary/10 text-primary px-3 py-2 rounded-md text-xs text-left inline-block">
                            <strong>💡 Pro Tip:</strong> PDFs and Images can be viewed directly in the browser. Word and PowerPoint files will be available as downloads.
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* OR Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">OR</span>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div className="space-y-2">
                    <Label htmlFor="share-title">Title *</Label>
                    <Input
                      id="share-title"
                      value={shareTitle}
                      onChange={(e) => setShareTitle(e.target.value)}
                      placeholder="e.g., Complete Heart Anatomy Notes"
                      required
                    />
                  </div>

                  {/* Content Textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="share-content">Notes Content (Optional if file uploaded)</Label>
                    <Textarea
                      id="share-content"
                      value={shareContent}
                      onChange={(e) => setShareContent(e.target.value)}
                      placeholder="Paste your notes here if you don't have a file..."
                      className="min-h-[150px]"
                    />
                  </div>

                  {/* Tags Input */}
                  <div className="space-y-2">
                    <Label htmlFor="share-tags">Tags (comma-separated, optional)</Label>
                    <Input
                      id="share-tags"
                      value={shareTags}
                      onChange={(e) => setShareTags(e.target.value)}
                      placeholder="e.g., heart, cardiovascular, anatomy, study notes"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add tags to help others find your notes
                    </p>
                  </div>

                  {/* Description/Summary */}
                  <div className="space-y-2">
                    <Label htmlFor="share-description">Brief Description (Optional)</Label>
                    <Textarea
                      id="share-description"
                      value={shareDescription}
                      onChange={(e) => setShareDescription(e.target.value)}
                      placeholder="What topic does this cover? What makes it useful?"
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsShareOpen(false);
                        resetShareForm();
                      }} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={(!shareFile && !shareContent) || !shareTitle || sharing}
                      className="gradient-primary flex-1"
                    >
                      {sharing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Share Notes
                        </>
                      )}
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

                        {(currentUser?.isAdmin || currentUser?.name === post.author) && (
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors ml-auto p-2"
                            title="Remove from Community (Admin/Owner)"
                            onClick={() => handleDelete(post)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

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
                      ) : post.type === 'note' ? (
                        <button
                          onClick={() => {
                            if (post.resourceId) {
                              navigate(`/notes/${String(post.resourceId)}`);
                            } else {
                              setPreviewPost(post);
                            }
                          }}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
                        >
                          <FileText className="h-4 w-4" />
                          View Note
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

      {/* ===== PREVIEW DIALOG ===== */}
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
                {previewPost?.description || "This is a preview of the study material."}
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
                    {previewPost?.type === 'image_map_share' || previewPost?.type === 'quiz_share' ? 'Questions:' : 
                     previewPost?.type === 'flashcard_share' ? 'Cards:' : 'Downloads:'}
                  </span>
                  <span className="font-medium">
                    {previewPost?.questionCount || previewPost?.downloads || 0}
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
              ) : previewPost?.type === 'note' ? (
                <>
                  <Button
                    onClick={() => {
                      if (previewPost.resourceId) {
                        handleDownloadNote(previewPost.resourceId, previewPost.title);
                      }
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={!previewPost.resourceId}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      if (previewPost.resourceId) {
                        navigate(`/notes/${previewPost.resourceId}`);
                        setPreviewPost(null);
                      }
                    }}
                    className="gradient-primary flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Read Online
                  </Button>
                </>
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