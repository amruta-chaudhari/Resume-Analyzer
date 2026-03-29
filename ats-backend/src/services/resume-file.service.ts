import mammoth from 'mammoth';
import { FileStorageService, FileMetadata } from './file-storage.service';
import { extractTextFromStructuredData as sharedExtractText } from '../utils/resume-text-extractor';
import {
  assessResumeExtractionQuality,
  stripRtfMarkup,
} from '../utils/resume-text-processing';

export interface ProcessedResume {
  text: string;
  structuredData?: any;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    characterCount: number;
    extractedAt: Date;
    qualityWarnings?: string[];
    likelyScanned?: boolean;
  };
}

export interface ResumeFileData {
  originalFile: FileMetadata;
  processedContent: ProcessedResume;
  structuredData?: any; // For future template system
}

export class ResumeFileService {
  constructor(private fileStorage: FileStorageService) {}

  async processResumeFile(file: Express.Multer.File, userId: string): Promise<ResumeFileData> {
    // Extract text based on file type
    const processedContent = await this.extractTextFromFile(file);

    if (processedContent.metadata?.likelyScanned) {
      throw new Error('This PDF appears to be image-based or scanned. OCR is not supported yet, so please upload a text-based PDF or DOCX file.');
    }

    if (!processedContent.text || processedContent.text.trim().length < 30) {
      throw new Error('Unable to extract readable text from file');
    }

    // Save the original file only after successful extraction
    const fileMetadata = await this.fileStorage.saveFile(file, userId);

    return {
      originalFile: fileMetadata,
      processedContent,
      structuredData: processedContent.structuredData
    };
  }

  private async extractTextFromFile(file: Express.Multer.File): Promise<ProcessedResume> {
    const buffer = file.buffer;
    let text = '';
    let structuredData: any = null;
    let pageCount: number | undefined;

    try {
      switch (file.mimetype) {
        case 'application/pdf':
          const { PDFParse } = await import('pdf-parse');
          const parser = new PDFParse({ data: buffer });
          const pdfData = await parser.getText();
          text = pdfData.text;
          pageCount = pdfData.pages?.length || undefined;
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          const docxResult = await mammoth.extractRawText({ buffer });
          text = docxResult.value;
          break;

        case 'text/plain':
          text = buffer.toString('utf-8');
          break;

        case 'application/rtf':
          text = stripRtfMarkup(buffer.toString('utf-8'));
          break;

        default:
          throw new Error('Unsupported file type for text extraction');
      }

      // Try to parse as JSON for structured data (future template system)
      try {
        structuredData = JSON.parse(text);
        // If it's valid JSON, use it as structured data and extract text from it
        if (structuredData && typeof structuredData === 'object') {
          text = this.extractTextFromStructuredData(structuredData);
        }
      } catch {
        // Not JSON, continue with extracted text
      }

    } catch (_error) {
      throw new Error('Failed to extract text from file');
    }

    const extractionQuality = assessResumeExtractionQuality(text, {
      mimeType: file.mimetype,
      pageCount,
    });

    return {
      text: extractionQuality.normalizedText,
      structuredData,
      metadata: {
        pageCount,
        wordCount: extractionQuality.wordCount,
        characterCount: extractionQuality.characterCount,
        extractedAt: new Date(),
        qualityWarnings: extractionQuality.qualityWarnings,
        likelyScanned: extractionQuality.likelyScanned,
      }
    };
  }

  private extractTextFromStructuredData(data: any): string {
    return sharedExtractText(data);
  }

  async getResumeFile(fileId: string, userId: string): Promise<Buffer | null> {
    return this.fileStorage.getFile(fileId, userId);
  }

  async getResumeFileMetadata(fileId: string, userId: string): Promise<FileMetadata | null> {
    return this.fileStorage.getFileMetadata(fileId, userId);
  }

  async deleteResumeFile(fileId: string, userId: string): Promise<boolean> {
    return this.fileStorage.deleteFile(fileId, userId);
  }

  // Utility method to determine if content is structured
  isStructuredResume(content: any): boolean {
    if (typeof content === 'object' && content !== null) {
      // Check for common resume structure indicators
      const hasPersonalInfo = content.personalInfo && typeof content.personalInfo === 'object';
      const hasExperience = content.experience && Array.isArray(content.experience);
      const hasEducation = content.education && Array.isArray(content.education);
      const hasSkills = content.skills && Array.isArray(content.skills);

      return hasPersonalInfo || hasExperience || hasEducation || hasSkills;
    }
    return false;
  }

  // Convert structured data back to formatted text
  structuredToText(structuredData: any): string {
    if (!structuredData || typeof structuredData !== 'object') {
      return '';
    }
    return this.extractTextFromStructuredData(structuredData);
  }
}
