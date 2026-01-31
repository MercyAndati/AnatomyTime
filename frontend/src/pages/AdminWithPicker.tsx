import { useState, useRef, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, Plus, Trash2, Eye, Copy, Check, ZoomIn, ZoomOut, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import config from "@/config";

interface Region {
  id: string;
  name: string;
  points: string;
  description?: string;
}

const AdminWithPicker = () => {
  const navigate = useNavigate();
  
  // Quiz metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("standard");
  const [category, setCategory] = useState("Anatomy");
  const [tags, setTags] = useState("");
  
  // Image handling
  const [unlabeledImage, setUnlabeledImage] = useState<File | null>(null);
  const [labeledImage, setLabeledImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Coordinate picker state
  const [regions, setRegions] = useState<Region[]>([]);
  const [currentRegion, setCurrentRegion] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  
  // UI state
  const [zoom, setZoom] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [regionName, setRegionName] = useState("");
  const [regionDescription, setRegionDescription] = useState("");
  const [regionWidth, setRegionWidth] = useState(50);
  const [regionHeight, setRegionHeight] = useState(50);
  
  const unlabeledInputRef = useRef<HTMLInputElement>(null);
  const labeledInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle image upload
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
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgUrl = e.target?.result as string;
        setPreviewImage(imgUrl);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.src = imgUrl;
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Image uploaded",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    } else {
      setLabeledImage(file);
      toast({
        title: "Labeled image uploaded",
        description: file.name,
      });
    }
  };

  // Handle double-click on image to place region
  const handleImageDoubleClick = (e: React.MouseEvent) => {
    if (!previewImage) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    
    const container = imageContainerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;
    
    // Get click position relative to container (accounting for scroll)
    const containerRect = container.getBoundingClientRect();
    const scrollX = container.scrollLeft;
    const scrollY = container.scrollTop;
    
    // Calculate click position relative to container, accounting for scroll
    const clickX = e.clientX - containerRect.left + scrollX;
    const clickY = e.clientY - containerRect.top + scrollY;
    
    // Convert to natural image coordinates
    // The image is scaled by zoom, so we need to divide by zoom
    const x = clickX / zoom;
    const y = clickY / zoom;
    
    // Ensure coordinates are within image bounds
    const boundedX = Math.max(0, Math.min(x, imageDimensions.width));
    const boundedY = Math.max(0, Math.min(y, imageDimensions.height));
    
    // Create region centered on click
    const newRegion = {
      x: Math.max(0, boundedX - regionWidth / 2),
      y: Math.max(0, boundedY - regionHeight / 2),
      width: regionWidth,
      height: regionHeight
    };
    
    // Ensure region doesn't go outside image bounds
    if (newRegion.x + newRegion.width > imageDimensions.width) {
      newRegion.x = imageDimensions.width - newRegion.width;
    }
    if (newRegion.y + newRegion.height > imageDimensions.height) {
      newRegion.y = imageDimensions.height - newRegion.height;
    }
    
    setCurrentRegion(newRegion);
    
    // Auto-generate name if none
    if (!regionName) {
      setRegionName(`Region ${regions.length + 1}`);
    }
    
    toast({
      title: "Region placed",
      description: `Region at (${Math.round(newRegion.x)}, ${Math.round(newRegion.y)}) - Image: ${imageDimensions.width}×${imageDimensions.height}`,
    });
  };

  // Save current region to list
  const saveCurrentRegion = () => {
    if (!currentRegion || !regionName) {
      toast({
        title: "Missing information",
        description: "Please place a region and enter a name",
        variant: "destructive",
      });
      return;
    }
    
    const { x, y, width, height } = currentRegion;
    
    // Create points string
    const points = [
      `${Math.round(x)},${Math.round(y)}`,
      `${Math.round(x + width)},${Math.round(y)}`,
      `${Math.round(x + width)},${Math.round(y + height)}`,
      `${Math.round(x)},${Math.round(y + height)}`
    ].join(' ');
    
    const newRegion: Region = {
      id: regionName.toLowerCase().replace(/\s+/g, '-'),
      name: regionName,
      points: points,
      description: regionDescription
    };
    
    setRegions([...regions, newRegion]);
    setCurrentRegion(null);
    setRegionName("");
    setRegionDescription("");
    
    toast({
      title: "Region saved",
      description: `${regionName} added successfully`,
    });
  };

  // Delete a region
  const deleteRegion = (index: number) => {
    const newRegions = [...regions];
    newRegions.splice(index, 1);
    setRegions(newRegions);
    
    toast({
      title: "Region deleted",
      description: "Region removed successfully",
    });
  };

  // Update region size
  const updateRegionSize = () => {
    if (!currentRegion) return;
    
    setCurrentRegion({
      ...currentRegion,
      width: regionWidth,
      height: regionHeight
    });
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.2));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  // Submit the entire quiz
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
  
  if (regions.length === 0) {
    toast({
      title: "No regions",
      description: "Please add at least one region",
      variant: "destructive",
    });
    return;
  }
  
  setIsCreating(true);
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please login to create quizzes",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    // Debug: Log what we're sending
    console.log('Creating quiz with:', {
      title,
      regionsCount: regions.length,
      regions: regions.map(r => ({ name: r.name, points: r.points })),
      unlabeledImage: unlabeledImage.name,
      labeledImage: labeledImage.name
    });
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('regions', JSON.stringify(regions));
    formData.append('difficulty', difficulty);
    formData.append('category', category);
    formData.append('tags', tags);
    
    if (unlabeledImage) formData.append('unlabeledImage', unlabeledImage);
    if (labeledImage) formData.append('labeledImage', labeledImage);
    
    // Test the endpoint first
    const testResponse = await fetch(`${config.apiUrl}/admin/health-test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log('Test endpoint status:', testResponse.status);
    
    // Make the actual request
    const response = await fetch(`${config.apiUrl}/admin/create-quiz`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - browser sets it automatically
      },
      body: formData,
    });
    
    console.log('Response status:', response.status);
    
    // Try to get response text first to debug
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', responseText);
      throw new Error(`Server returned invalid JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}...`);
    }
    
    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
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
    setRegions([]);
    setCurrentRegion(null);
    setTags("");
    setZoom(1);
    setRegionName("");
    setRegionDescription("");
    
    if (unlabeledInputRef.current) unlabeledInputRef.current.value = "";
    if (labeledInputRef.current) labeledInputRef.current.value = "";
    
  } catch (error: unknown) {
  let errorMessage = "Failed to create quiz";
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  console.error('Submission error:', error);
  toast({
    title: "Error",
    description: errorMessage,
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
              Create Image Map Quiz
            </h1>
            <p className="text-muted-foreground text-lg">
              Upload images and mark regions directly on the image
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Quiz Metadata */}
            <Card className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">Quiz Information</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Brain Anatomy Quiz"
                    required
                  />
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
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., brain, lobes, nervous system"
                  />
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
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
            </Card>

            {/* Image Upload & Region Picker */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Image Upload */}
              <div className="space-y-6">
                <Card className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4">Upload Images</h2>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="unlabeledImage" className="text-sm">
                        Unlabeled Image (for quiz) *
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
                        Labeled Image (for answers) *
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
                    
                    {imageDimensions.width > 0 && (
                      <div className="p-3 bg-muted/20 rounded-lg">
                        <p className="text-sm">
                          Image dimensions: {imageDimensions.width} × {imageDimensions.height} px
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
                
                {/* Region Controls */}
                <Card className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4">Region Controls</h2>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="regionName">Region Name *</Label>
                      <Input
                        id="regionName"
                        value={regionName}
                        onChange={(e) => setRegionName(e.target.value)}
                        placeholder="e.g., Frontal Lobe"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="regionDescription">Description (Optional)</Label>
                      <Input
                        id="regionDescription"
                        value={regionDescription}
                        onChange={(e) => setRegionDescription(e.target.value)}
                        placeholder="Brief description for review"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="regionWidth" className="text-xs">
                          Width (px)
                        </Label>
                        <Input
                          id="regionWidth"
                          type="number"
                          value={regionWidth}
                          onChange={(e) => {
                            setRegionWidth(parseInt(e.target.value) || 50);
                            updateRegionSize();
                          }}
                          min="10"
                          max="200"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor="regionHeight" className="text-xs">
                          Height (px)
                        </Label>
                        <Input
                          id="regionHeight"
                          type="number"
                          value={regionHeight}
                          onChange={(e) => {
                            setRegionHeight(parseInt(e.target.value) || 50);
                            updateRegionSize();
                          }}
                          min="10"
                          max="200"
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      onClick={saveCurrentRegion}
                      className="w-full"
                      disabled={!currentRegion || !regionName}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save Current Region
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentRegion(null)}
                      className="w-full"
                    >
                      Clear Current Region
                    </Button>
                  </div>
                </Card>
              </div>
              
              {/* Center: Image with Regions */}
              <div className="lg:col-span-2">
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Mark Regions</h2>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleZoomOut}
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-muted-foreground">
                        Zoom: {Math.round(zoom * 100)}%
                      </span>
                      
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleZoomIn}
                        title="Zoom In"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleResetZoom}
                        title="Reset Zoom"
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-4">
                    <p>• Double-click on the image to place a region</p>
                    <p>• Adjust size using the controls on the left</p>
                    <p>• Save regions before creating the quiz</p>
                  </div>
                  
                  <div
                    ref={imageContainerRef}
                    className="relative border rounded-lg overflow-auto bg-gray-50"
                    style={{ 
                      height: '500px',
                      cursor: previewImage ? 'crosshair' : 'default'
                    }}
                  >
                    {previewImage ? (
                      <>
                        <img
                          ref={imageRef}
                          src={previewImage}
                          alt="Uploaded image"
                          className="absolute top-0 left-0"
                          style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top left',
                            maxWidth: 'none'
                          }}
                          onDoubleClick={handleImageDoubleClick}
                        />
                        
                        {/* SVG overlay for regions */}
                        <svg
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                        >
                          {/* Existing regions */}
                          {regions.map((region, index) => {
                            const points = region.points.split(' ').map(p => {
                              const [x, y] = p.split(',').map(Number);
                              return `${x},${y}`;
                            }).join(' ');
                            
                            return (
                              <polygon
                                key={index}
                                points={points}
                                fill="rgba(59, 130, 246, 0.3)"
                                stroke="rgb(59, 130, 246)"
                                strokeWidth="2"
                              />
                            );
                          })}
                          
                          {/* Current region being placed */}
                          {currentRegion && (
                            <rect
                              x={currentRegion.x}
                              y={currentRegion.y}
                              width={currentRegion.width}
                              height={currentRegion.height}
                              fill="rgba(245, 101, 101, 0.3)"
                              stroke="rgb(245, 101, 101)"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                            />
                          )}
                        </svg>
                        
                        {/* Region labels */}
                        {/* Region labels - small circles with hover tooltips */}
<div className="absolute top-0 left-0" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
  {regions.map((region, index) => {
    const points = region.points.split(' ').map(p => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });
    
    const centerX = (points[0].x + points[1].x) / 2;
    const centerY = (points[0].y + points[2].y) / 2;
    
    return (
      <div
        key={index}
        className="group relative"
        style={{
          position: 'absolute',
          left: `${centerX}px`,
          top: `${centerY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Small circle marker */}
        <div
          className="w-2 h-2 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
          title={`${index + 1}. ${region.name}`}
        >
          {index + 1}
        </div>
        
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
            <div className="font-semibold">{index + 1}. {region.name}</div>
            {region.description && (
              <div className="text-gray-300 mt-1 max-w-xs">{region.description}</div>
            )}
          </div>
          <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
        </div>
      </div>
    );
  })}
</div>
                        
                        {/* Current region indicator - translucent circle */}
                        {currentRegion && (
                          <div 
                            className="absolute rounded-full border-2 border-red-500 pointer-events-none"
                            style={{
                              left: `${currentRegion.x + currentRegion.width / 2}px`,
                              top: `${currentRegion.y + currentRegion.height / 2}px`,
                              width: `${currentRegion.width}px`,
                              height: `${currentRegion.height}px`,
                              transform: `scale(${zoom}) translate(-50%, -50%)`,
                              transformOrigin: 'top left',
                              backgroundColor: 'rgba(239, 68, 68, 0.3)', // Translucent red
                              borderColor: 'rgb(239, 68, 68)'
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Upload an image to start marking regions</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Regions marked: </span>
                      <span className="font-semibold">{regions.length}</span>
                    </div>
                    
                    {currentRegion && (
                      <div className="text-muted-foreground">
                        Current: ({Math.round(currentRegion.x)}, {Math.round(currentRegion.y)}) - 
                        {currentRegion.width}×{currentRegion.height}px
                      </div>
                    )}
                  </div>
                </Card>
                
                {/* Regions List */}
                {regions.length > 0 && (
                  <Card className="glass-card p-6 mt-6">
                    <h2 className="text-xl font-semibold mb-4">Regions ({regions.length})</h2>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {regions.map((region, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{region.name}</h4>
                              <p className="text-xs text-muted-foreground font-mono">
                                Points: {region.points}
                              </p>
                              {region.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {region.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRegion(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                className="gradient-primary px-12"
                disabled={isCreating || regions.length === 0}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Quiz...
                  </>
                ) : (
                  `Create Quiz with ${regions.length} Region${regions.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminWithPicker;