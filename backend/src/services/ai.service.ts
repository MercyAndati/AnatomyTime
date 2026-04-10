import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import path from 'path';

export interface AIResponse {
  text: string;
  model: string;
  timestamp: Date;
}

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
    console.log('AI Service & File Manager initialized');
  }

  // THE 3-TIER FALLBACK ENGINE
  private async executeWithFallback(payload: any): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      return await model.generateContent(payload);

    } catch (error: any) {
      const isBusy = error.status === 503 || error.status === 429 || error.message?.includes('503') || error.message?.includes('high demand');
      
      if (isBusy) {
        try {
          console.log('⚠️ 2.5 Flash is busy. Falling back to Gemini 2.5 Flash Lite...');
          const liteModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
          return await liteModel.generateContent(payload);
        } catch (liteError: any) {
          console.log('⚠️ 2.5 Flash Lite is busy. Falling back to Gemini 1.5 Flash...');
          const backupModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          return await backupModel.generateContent(payload);
        }
      }
      throw error;
    }
  }

  // Error Handler
  private handleAIError(error: any): never {
    console.error('AI API Error:', error);
    const errMsg = error.message || '';

    // If ALL THREE models fail
    if (error.status === 429 || error.status === 503 || errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('quota')) {
      throw new Error('SYSTEM_BUSY: Google AI servers are currently experiencing massive global demand. Please wait 30 seconds and try again.');
    }

    if (error.status === 400 || errMsg.includes('400') || errMsg.includes('invalid argument')) {
      throw new Error('Google AI rejected this file. It may be DRM-protected, encrypted, or too complex. Try "Printing to PDF" to strip the security, or specify a narrower Focus Topic.');
    }

    throw new Error(`AI Service failed: ${errMsg}`);
  }

  async uploadFileToGemini(filePath: string, originalMimeType: string, displayName: string) {
    try {
      const ext = path.extname(displayName).toLowerCase();
      let mimeType = originalMimeType;
      
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.txt') mimeType = 'text/plain';

      console.log(`Uploading ${displayName} to Gemini as ${mimeType}...`);
      
      const uploadResult = await this.fileManager.uploadFile(filePath, { mimeType, displayName });
      
      let file = await this.fileManager.getFile(uploadResult.file.name);
      console.log(`Waiting for Google AI to process the document...`);
      
      while (file.state === 'PROCESSING') {
        process.stdout.write('.'); 
        await new Promise((resolve) => setTimeout(resolve, 2000)); 
        file = await this.fileManager.getFile(uploadResult.file.name);
      }
      console.log(`\n File processed and ready! State: ${file.state}`);
      
      if (file.state === 'FAILED') {
        throw new Error('Google AI failed to process this document. It might be corrupted.');
      }
      
      return file;
    } catch (error) {
      this.handleAIError(error);
    }
  }

  async deleteFileFromGemini(fileName: string) {
    try {
      await this.fileManager.deleteFile(fileName);
      console.log(`Deleted ${fileName} from Gemini storage`);
    } catch (error) {
      console.warn(`Failed to delete ${fileName} from Gemini:`, error);
    }
  }

  async validateFileContent(fileUri: string, mimeType: string): Promise<{ isAnatomy: boolean, reason: string }> {
    try {
      const prompt = `
      You are a document classification AI for a biology study tool. 
      Does this document contain substantial information about human or animal anatomy, biology, physiology, or medicine? 
      (NOTE: Ignore peripheral text like author details. As long as the primary subject relates to biology/medicine, it is valid).
      Return ONLY valid JSON: {"isAnatomy": true, "reason": "Brief 1-sentence explanation"}
      `;

      // Using the fallback engine!
      const result = await this.executeWithFallback([
        { fileData: { mimeType: mimeType || 'application/pdf', fileUri } },
        { text: prompt }
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid validation format');
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.handleAIError(error);
    }
  }

  async validateTextContent(text: string): Promise<{ isAnatomy: boolean, reason: string }> {
    try {
      const prompt = `
      You are a strict but intelligent content filter for a medical study app.
      Rule: Does this text either contain biological/anatomical facts, OR is it a request to study human/animal anatomy, biology, physiology, or medicine?
      Return ONLY valid JSON: {"isAnatomy": true, "reason": "Brief 1-sentence explanation"}
      
      TEXT TO ANALYZE:
      ${text.substring(0, 15000)} 
      `;

      // Using the fallback engine!
      const result = await this.executeWithFallback(prompt);
      
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid validation format');
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.handleAIError(error);
    }
  }

  async generateContent(
    prompt: string, 
    options: AIGenerationOptions = {},
    fileUri?: string,
    mimeType?: string
  ): Promise<AIResponse> {
    const { temperature = 0.7, maxTokens = 4000 } = options;

    try {
      console.log('Generating content...');
      
      const parts: any[] = [];
      if (fileUri) {
        parts.push({ fileData: { mimeType: mimeType || 'application/pdf', fileUri } });
      }
      parts.push({ text: prompt });

      // Using the fallback engine!
      const result = await this.executeWithFallback({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      });

      const text = result.response.text();
      if (!text || text.trim().length === 0) throw new Error('Empty response from AI');

      return {
        text: text,
        model: 'Gemini-Auto-Fallback',
        timestamp: new Date()
      };

    } catch (error) {
      this.handleAIError(error);
    }
  }
}