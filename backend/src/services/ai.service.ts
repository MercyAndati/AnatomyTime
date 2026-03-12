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
  private modelName = 'gemini-2.5-flash'; 

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
    console.log('AI Service & File Manager initialized');
  }

  //Error Handler
  private handleAIError(error: any): never {
    console.error('AI API Error:', error);
    const errMsg = error.message || '';

    if (error.status === 429 || errMsg.includes('429') || errMsg.includes('quota')) {
      throw new Error('SYSTEM_BUSY: The AI is currently experiencing high demand. Please wait 60 seconds and try again.');
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
      
      const uploadResult = await this.fileManager.uploadFile(filePath, {
        mimeType,
        displayName,
      });
      
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
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      const prompt = `
      You are a document classification AI for a biology study tool. 
      Your job is to determine if this document is appropriate for generating an anatomy, biology, or medical quiz.
      
      Does this document contain substantial information about human or animal anatomy, biology, physiology, or medicine? 
      (NOTE: Ignore peripheral text such as author details, website navigation elements, bibliographies, or publication metadata. As long as the primary subject matter of the document relates to biology or medicine, it is valid).
      
      Return ONLY valid JSON in this exact format:
      {"isAnatomy": true, "reason": "Brief 1-sentence explanation"}
      `;

      const result = await model.generateContent([
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
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      const prompt = `
      You are a strict but intelligent content filter for a medical study app.
      Evaluate the following text. It might be a massive wall of study notes, OR it might be a short request/prompt from a student asking for a quiz.
      
      Rule: Does this text either contain biological/anatomical facts, OR is it a request to study human/animal anatomy, biology, physiology, or medicine?
      
      (Note: Ignore peripheral text such as author details, website navigation elements, bibliographies, or publication metadata that may have been accidentally copy-pasted. As long as the primary subject matter of the text relates to biology or medicine, it is valid. However, strictly reject any text where the primary focus is entirely outside the medical/biological domain, such as recipes, programming code, or unrelated subjects.)
      
      Return ONLY valid JSON in this exact format:
      {"isAnatomy": true, "reason": "Brief 1-sentence explanation"}
      
      TEXT TO ANALYZE:
      ${text.substring(0, 15000)} 
      `;

      const result = await model.generateContent(prompt);
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
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      console.log('Generating content...');
      
      const parts: any[] = [];
      if (fileUri) {
        parts.push({ fileData: { mimeType: mimeType || 'application/pdf', fileUri } });
      }
      parts.push({ text: prompt });

      const result = await model.generateContent({
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
        model: this.modelName,
        timestamp: new Date()
      };

    } catch (error) {
      this.handleAIError(error);
    }
  }
}