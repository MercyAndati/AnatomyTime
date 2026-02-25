// backend/src/services/fileExtractor.service.ts
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import { createWorker } from 'tesseract.js';

export interface ExtractedContent {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    wordCount: number;
    extractionMethod: string;
  };
  sections?: Array<{
    heading?: string;
    content: string;
    page?: number;
  }>;
}

export class FileExtractorService {
  private maxFileSize = 50 * 1024 * 1024; // 50MB
  private supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  async extractText(filePath: string, mimeType: string, originalName: string): Promise<ExtractedContent> {
    try {
      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // Check if supported
      if (!this.supportedTypes.includes(mimeType)) {
        throw new Error(`Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, TXT, Images`);
      }

      let extractedText = '';
      let metadata: any = {
        fileName: originalName,
        fileType: mimeType,
        extractionMethod: '',
        wordCount: 0
      };

      // Extract based on file type
      if (mimeType === 'application/pdf') {
        const result = await this.extractFromPDF(filePath);
        extractedText = result.text;
        metadata = { ...metadata, ...result.metadata, extractionMethod: 'pdf-parse' };
      }
      else if (mimeType.includes('word')) {
        const result = await this.extractFromDocx(filePath);
        extractedText = result.text;
        metadata = { ...metadata, ...result.metadata, extractionMethod: 'mammoth' };
      }
      else if (mimeType === 'text/plain') {
        const result = await this.extractFromTxt(filePath);
        extractedText = result.text;
        metadata = { ...metadata, ...result.metadata, extractionMethod: 'text' };
      }
      else if (mimeType.startsWith('image/')) {
        const result = await this.extractFromImage(filePath);
        extractedText = result.text;
        metadata = { ...metadata, ...result.metadata, extractionMethod: 'tesseract-ocr' };
      }

      // Clean and structure the text
      const cleanedText = this.cleanExtractedText(extractedText);
      
      // Extract sections if possible
      const sections = this.extractSections(cleanedText);

      metadata.wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;

      return {
        text: cleanedText,
        metadata,
        sections: sections.length > 0 ? sections : undefined
      };

    } catch (error) {
      console.error('File extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to extract text: ${errorMessage}`);
    } finally {
      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.warn('Failed to delete temporary file:', unlinkError);
      }
    }
  }

  private async extractFromPDF(filePath: string): Promise<{ text: string; metadata: any }> {
    const dataBuffer = await fs.readFile(filePath);
    // pdf-parse typings are CommonJS-style, so cast to any to call it safely
    const data = await (pdf as any)(dataBuffer);
    
    return {
      text: data.text,
      metadata: {
        pageCount: data.numpages,
        info: data.info
      }
    };
  }

  private async extractFromDocx(filePath: string): Promise<{ text: string; metadata: any }> {
    const result = await mammoth.extractRawText({ path: filePath });
    
    return {
      text: result.value,
      metadata: {
        messages: result.messages
      }
    };
  }

  private async extractFromTxt(filePath: string): Promise<{ text: string; metadata: any }> {
    const text = await fs.readFile(filePath, 'utf-8');
    
    return {
      text,
      metadata: {}
    };
  }

  private async extractFromImage(filePath: string): Promise<{ text: string; metadata: any }> {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    
    return {
      text: ret.data.text,
      metadata: {
        confidence: ret.data.confidence
      }
    };
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/(\r\n|\n|\r)/g, '\n')
      .replace(/[•●■▪➢]/g, '-')
      .replace(/[“”"]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  private extractSections(text: string): Array<{ heading?: string; content: string; page?: number }> {
    const sections: Array<{ heading?: string; content: string; page?: number }> = [];
    
    const headingPatterns = [
      /^(#{1,3})\s+(.+)$/gm,
      /^([A-Z][A-Z\s]+):$/gm,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):$/gm,
      /^([A-Z][A-Z\s]+)$/gm,
      /^(?:Chapter|Section|Part)\s+\d+[:.]?\s*(.+)$/gim
    ];

    let currentSection: { heading?: string; content: string[] } = { content: [] };
    const lines = text.split('\n');

    for (const line of lines) {
      let isHeading = false;
      
      for (const pattern of headingPatterns) {
        const match = line.match(pattern);
        if (match) {
          if (currentSection.content.length > 0) {
            sections.push({
              heading: currentSection.heading,
              content: currentSection.content.join('\n').trim()
            });
          }
          
          currentSection = {
            heading: match[2] || match[1] || match[0],
            content: []
          };
          isHeading = true;
          break;
        }
      }
      
      if (!isHeading && line.trim()) {
        currentSection.content.push(line);
      }
    }

    if (currentSection.content.length > 0) {
      sections.push({
        heading: currentSection.heading,
        content: currentSection.content.join('\n').trim()
      });
    }

    return sections;
  }

  truncateText(text: string, maxLength: number = 15000): string {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const truncateAt = Math.max(lastPeriod, lastNewline);
    
    if (truncateAt > maxLength * 0.8) {
      return text.substring(0, truncateAt + 1) + 
        '\n\n[Content truncated due to length. Please focus on the most relevant sections.]';
    }
    
    return truncated + 
      '\n\n[Content truncated due to length. Please focus on the most relevant sections.]';
  }

  async extractKeywords(text: string, limit: number = 20): Promise<string[]> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['this', 'that', 'with', 'from', 'have', 'were'].includes(w));

    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
  }
}