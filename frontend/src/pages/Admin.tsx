import { useState, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, Plus, Trash2, Eye, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Region {
  id: string;
  name: string;
  points: string;
  hint?: string;
  description?: string;
}

const Admin = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("standard");
  const [category, setCategory] = useState("Anatomy");
  const [tags, setTags] = useState("");
  
  const [unlabeledImage, setUnlabeledImage] = useState<File | null>(null);
  const [labeledImage, setLabeledImage] = useState<File | null>(null);
  
  const [regions, setRegions] = useState<Region[]>([
    { id: "region-1", name: "", points: "", description: "" }
  ]);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const unlabeledInputRef = useRef<HTMLInputElement>(null);
  const labeledInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'unlabeled' | 'labeled') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }
    
    if (type === 'unlabeled') {
      setUnlabeledImage(file);
    } else {
      setLabeledImage(file);
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'unlabeled') {
        setPreviewImage(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    toast({
      title: "Image uploaded",
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
    });
  };

  const addRegion = () => {
    setRegions([...regions, { 
      id: `region-${Date.now()}`, 
      name: "", 
      points: "", 
      description: "" 
    }]);
  };

  const removeRegion = (index: number) => {
    if (regions.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one region is required",
        variant: "destructive",
      });
      return;
    }
    setRegions(regions.filter((_, i) => i !== index));
  };

  const updateRegion = (index: number, field: keyof Region, value: string) => {
    const newRegions = [...regions];
    newRegions[index] = { ...newRegions[index], [field]: value };
    setRegions(newRegions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !unlabeledImage || !labeledImage) {
      toast({
        title: "Missing information",
        description: "Please fill all required fields and upload both images",
        variant: "destructive",
      });
      return;
    }
    
    if (regions.some(r => !r.name || !r.points)) {
      toast({
        title: "Incomplete regions",
        description: "Please fill all region names and points",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('regions', JSON.stringify(regions));
      formData.append('difficulty', difficulty);
      formData.append('category', category);
      formData.append('tags', tags);
      
      if (unlabeledImage) formData.append('unlabeledImage', unlabeledImage);
      if (labeledImage) formData.append('labeledImage', labeledImage);
      
      const response = await fetch('http://localhost:5000/api/admin/create-quiz', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create quiz');
      }
      
      toast({
        title: "Success!",
        description: `Quiz "${title}" created successfully`,
      });
      
      // Reset form
      setTitle("");
      setDescription("");
      setUnlabeledImage(null);
      setLabeledImage(null);
      setPreviewImage(null);
      setRegions([{ id: "region-1", name: "", points: "", description: "" }]);
      
      if (unlabeledInputRef.current) unlabeledInputRef.current.value = "";
      if (labeledInputRef.current) labeledInputRef.current.value = "";
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Admin Panel
            </h1>
            <p className="text-muted-foreground text-lg">
              Create image map quizzes for the platform
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Form */}
            <Card className="glass-card p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title & Description */}
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Brain Anatomy"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this quiz covers..."
                    className="min-h-[100px]"
                    required
                  />
                </div>
                
                {/* Images Upload */}
                <div className="space-y-4">
                  <Label>Images *</Label>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="unlabeledImage" className="text-sm">
                        Unlabeled Image (for quiz)
                      </Label>
                      <input
                        ref={unlabeledInputRef}
                        type="file"
                        id="unlabeledImage"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'unlabeled')}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => unlabeledInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {unlabeledImage ? unlabeledImage.name : 'Upload Unlabeled Image'}
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="labeledImage" className="text-sm">
                        Labeled Image (for answers)
                      </Label>
                      <input
                        ref={labeledInputRef}
                        type="file"
                        id="labeledImage"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'labeled')}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => labeledInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {labeledImage ? labeledImage.name : 'Upload Labeled Image'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Settings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Anatomy">Anatomy</SelectItem>
                        <SelectItem value="Neuroanatomy">Neuroanatomy</SelectItem>
                        <SelectItem value="Cardiovascular">Cardiovascular</SelectItem>
                        <SelectItem value="Skeletal">Skeletal</SelectItem>
                        <SelectItem value="Muscular">Muscular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., brain, lobes, nervous system"
                  />
                </div>
                
                {/* Regions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Regions *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addRegion}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Region
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto p-2">
                    {regions.map((region, index) => (
                      <Card key={region.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Region {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRegion(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label htmlFor={`region-${index}-name`} className="text-xs">
                              Name *
                            </Label>
                            <Input
                              id={`region-${index}-name`}
                              value={region.name}
                              onChange={(e) => updateRegion(index, 'name', e.target.value)}
                              placeholder="e.g., Frontal Lobe"
                              required
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor={`region-${index}-points`} className="text-xs">
                              SVG Points *
                            </Label>
                            <Input
                              id={`region-${index}-points`}
                              value={region.points}
                              onChange={(e) => updateRegion(index, 'points', e.target.value)}
                              placeholder="e.g., 150,100 250,100 250,200 150,200"
                              required
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor={`region-${index}-description`} className="text-xs">
                              Description (optional)
                            </Label>
                            <Textarea
                              id={`region-${index}-description`}
                              value={region.description || ''}
                              onChange={(e) => updateRegion(index, 'description', e.target.value)}
                              placeholder="Description for review screen"
                              className="min-h-[60px]"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <Button type="submit" className="w-full gradient-primary" disabled={isCreating}>
                  {isCreating ? "Creating Quiz..." : "Create Quiz"}
                </Button>
              </form>
            </Card>
            
            {/* Right: Preview */}
            <div className="space-y-6">
              <Card className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4">Preview</h2>
                
                {previewImage ? (
                  <div className="space-y-4">
                    <div className="relative border rounded-lg overflow-hidden">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="w-full h-auto"
                      />
                      
                      {/* SVG overlay preview */}
                      <svg 
                        className="absolute top-0 left-0 w-full h-full"
                        style={{ pointerEvents: 'none' }}
                      >
                        {regions.map((region, index) => {
                          if (!region.points) return null;
                          
                          return (
                            <polygon
                              key={index}
                              points={region.points}
                              fill={`rgba(59, 130, 246, ${0.2 + (index % 5) * 0.1})`}
                              stroke="rgba(59, 130, 246, 0.8)"
                              strokeWidth="1"
                            />
                          );
                        })}
                      </svg>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">{title || "Untitled Quiz"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {description || "No description"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                          {difficulty}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          {category}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          {regions.length} regions
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Upload an image to see preview</p>
                  </div>
                )}
              </Card>
              
              {/* Instructions */}
              <Card className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4">How to Get SVG Points</h2>
                <div className="space-y-3 text-sm">
                  <p><strong>Option 1:</strong> Use an online tool:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <a 
                        href="https://svg-path-visualizer.netlify.app/" 
                        target="_blank" 
                        className="text-primary hover:underline"
                      >
                        SVG Path Visualizer
                      </a>
                    </li>
                    <li>
                      <a 
                        href="https://yqnn.github.io/svg-path-editor/" 
                        target="_blank" 
                        className="text-primary hover:underline"
                      >
                        SVG Path Editor
                      </a>
                    </li>
                  </ul>
                  
                  <p><strong>Option 2:</strong> Manual format:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    x1,y1 x2,y2 x3,y3 ...
                  </code>
                  
                  <p><strong>Example:</strong> A square region</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    150,100 250,100 250,200 150,200
                  </code>
                  
                  <p className="pt-4 border-t">
                    <strong>Tip:</strong> Use image editing software to get coordinates from your anatomy images.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;