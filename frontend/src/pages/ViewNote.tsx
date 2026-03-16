// frontend/src/pages/ViewNote.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ArrowLeft, Calendar, User, Tag, FileText, File, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import type { Note } from "@/types";

// react-pdf imports
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const ViewNote = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Note | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  // States for our native viewers
  const [textContent, setTextContent] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

  const loadNote = useCallback(async () => {
    if (!id) {
      navigate("/community");
      return;
    }

    try {
      const data = await api.getNote(id);
      setNote(data);
      
      if (data.fileUrl) {
        setFileUrl(data.fileUrl);

        // If it's a text file, fetch the content from Cloudinary to display natively
        if (data.fileType?.includes('text')) {
          try {
            const response = await fetch(data.fileUrl);
            const text = await response.text();
            setTextContent(text);
          } catch (err) {
            setTextContent("Failed to load text content.");
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load note",
        variant: "destructive",
      });
      navigate("/community");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const handleDownload = async () => {
    if (!note) return;
    
    try {
      if (note.fileUrl) {
        //Open the Cloudinary file securely in a new tab
        window.open(note.fileUrl, '_blank', 'noopener,noreferrer');
        
        toast({
          title: "Opening document",
          description: "Document opened in a new tab",
        });
      } else {
        // Keep your existing logic for raw text notes that don't have a file attached
        const safeTitle = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const blob = new Blob([note.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open note",
        variant: "destructive",
      });
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const renderFileContent = () => {
    if (!note?.fileUrl || !fileUrl) return null;

    const fileType = note.fileType || '';
    const fileName = note.fileUrl.split('/').pop() || '';

    // 1. Images
    if (fileType.includes('image')) {
      return (
        <div className="flex justify-center border rounded-lg p-4 bg-muted/10">
          <img 
            src={fileUrl} 
            alt={note.title} 
            className="max-w-full h-auto rounded-lg shadow-sm"
          />
        </div>
      );
    }
    
    // 2. PDFs (Native Render via react-pdf)
    if (fileType.includes('pdf')) {
      return (
        <div className="flex flex-col items-center border rounded-lg bg-muted/10 p-4">
          <div className="w-full overflow-x-auto flex justify-center shadow-lg bg-white">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="p-12 animate-pulse text-muted-foreground">Loading PDF...</div>}
              error={<div className="p-12 text-destructive">Failed to load PDF.</div>}
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="max-w-full"
                width={Math.min(window.innerWidth - 64, 800)} // Responsive width
              />
            </Document>
          </div>
          
          {/* PDF Pagination Controls */}
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {pageNumber} of {numPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      );
    }
    
    // 3. Text Files (Native Render)
    if (fileType.includes('text')) {
      return (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground border-b pb-2 border-border/50">
            <FileText className="h-4 w-4" />
            <span>Text file: {fileName}</span>
          </div>
          {textContent === null ? (
             <div className="animate-pulse p-4 text-muted-foreground">Loading text...</div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed overflow-x-auto p-4 bg-background rounded border">
              {textContent}
            </pre>
          )}
        </div>
      );
    }
    
    // 4. Fallback (Word, PPT, Excel, etc.)
    return (
      <div className="text-center p-12 border rounded-lg bg-muted/20">
        <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">{fileName}</h3>
        <p className="text-muted-foreground mb-4">
          This file type cannot be previewed directly in the browser.
        </p>
        <Button onClick={handleDownload} className="gradient-primary">
          <Download className="h-4 w-4 mr-2" />
          Download to View
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/community")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Community
        </Button>

        <Card className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between mb-6 border-b pb-4 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{note.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {typeof note.createdBy === 'object' ? note.createdBy.name : 'User'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <Button onClick={handleDownload} variant="outline" className="shrink-0">
              <Download className="h-4 w-4 mr-2" />
              Download Source File
            </Button>
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="mt-6">
            {note.fileUrl ? (
              renderFileContent()
            ) : (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap bg-muted/30 p-6 rounded-lg font-sans text-sm leading-relaxed border">
                  {note.content}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};