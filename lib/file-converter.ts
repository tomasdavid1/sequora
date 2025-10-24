// Note: use dynamic imports for heavy converters to avoid build-time evaluation
// which can pull in test fixtures in some packages.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';

export interface ConversionResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    originalSize?: number;
    convertedSize?: number;
    usedOcr?: boolean;
    ocrEngine?: 'ocrmypdf' | 'none';
  };
}

/**
 * Convert PDF file to plain text
 */
export async function convertPdfToText(buffer: Buffer): Promise<ConversionResult> {
  try {
    console.log('[FileConverter] Converting PDF to text, size:', buffer.length);
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const data = await pdfParse(buffer);
    const text = data.text.trim();
    
    // If little/no text, try OCR via ocrmypdf if available
    if (!text || text.length < 50) {
      const ocrAvailable = await isOcrMyPdfAvailable();
      if (ocrAvailable) {
        const ocrResult = await ocrPdfWithOcrMyPdf(buffer);
        if (ocrResult.success) {
          return ocrResult;
        }
        // If OCR failed, fall through and return minimal-text error below
      } else {
        console.log('[FileConverter] ocrmypdf not found on system; skipping OCR');
      }
      return {
        success: false,
        error: 'PDF appears to be image-only and OCR tool is unavailable or failed',
        metadata: {
          pages: data.numpages,
          wordCount: text.length > 0 ? text.split(/\s+/).length : 0,
          originalSize: buffer.length,
          convertedSize: text.length,
          usedOcr: false,
          ocrEngine: 'none'
        }
      };
    }

    console.log('[FileConverter] PDF conversion successful, extracted', text.length, 'characters');
    
    return {
      success: true,
      text: text,
      metadata: {
        pages: data.numpages,
        wordCount: text.split(/\s+/).length,
        originalSize: buffer.length,
        convertedSize: text.length,
        usedOcr: false,
        ocrEngine: 'none'
      }
    };
  } catch (error) {
    console.error('[FileConverter] PDF conversion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown PDF conversion error'
    };
  }
}

/**
 * Detect whether ocrmypdf is available in the system PATH
 */
async function isOcrMyPdfAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFile(cmd, ['ocrmypdf'], (err, stdout) => {
      if (err) return resolve(false);
      resolve(Boolean(stdout && stdout.toString().trim().length > 0));
    });
  });
}

/**
 * Use ocrmypdf to add a text layer, then parse the OCR'd PDF
 */
async function ocrPdfWithOcrMyPdf(buffer: Buffer): Promise<ConversionResult> {
  try {
    console.log('[FileConverter] Attempting OCR with ocrmypdf...');
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ocrpdf-'));
    const inputPath = path.join(tmpDir, 'input.pdf');
    const outputPath = path.join(tmpDir, 'output.pdf');
    await fs.promises.writeFile(inputPath, buffer);

    const args = ['--deskew', '--clean', '--optimize', '3', '--force-ocr', inputPath, outputPath];
    await new Promise<void>((resolve, reject) => {
      execFile('ocrmypdf', args, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const ocrBuffer = await fs.promises.readFile(outputPath);
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const parsed = await pdfParse(ocrBuffer);
    const text = parsed.text.trim();
    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    if (!text || text.length < 50) {
      return {
        success: false,
        error: 'OCR completed but produced too little text',
        metadata: {
          pages: parsed.numpages,
          wordCount: text.length > 0 ? text.split(/\s+/).length : 0,
          originalSize: buffer.length,
          convertedSize: text.length,
          usedOcr: true,
          ocrEngine: 'ocrmypdf'
        }
      };
    }

    console.log('[FileConverter] OCR successful, extracted', text.length, 'characters');
    return {
      success: true,
      text,
      metadata: {
        pages: parsed.numpages,
        wordCount: text.split(/\s+/).length,
        originalSize: buffer.length,
        convertedSize: text.length,
        usedOcr: true,
        ocrEngine: 'ocrmypdf'
      }
    };
  } catch (e) {
    console.error('[FileConverter] OCR via ocrmypdf failed:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown OCR error'
    };
  }
}

/**
 * Convert DOCX file to plain text
 */
export async function convertDocxToText(buffer: Buffer): Promise<ConversionResult> {
  try {
    console.log('[FileConverter] Converting DOCX to text, size:', buffer.length);
    const mammothModule: any = await import('mammoth');
    const mammoth = mammothModule.default ?? mammothModule;
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    
    if (!text || text.length < 10) {
      return {
        success: false,
        error: 'DOCX appears to be empty'
      };
    }

    // Log any conversion warnings
    if (result.messages.length > 0) {
      console.log('[FileConverter] DOCX conversion warnings:', result.messages);
    }

    console.log('[FileConverter] DOCX conversion successful, extracted', text.length, 'characters');
    
    return {
      success: true,
      text: text,
      metadata: {
        wordCount: text.split(/\s+/).length,
        originalSize: buffer.length,
        convertedSize: text.length
      }
    };
  } catch (error) {
    console.error('[FileConverter] DOCX conversion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown DOCX conversion error'
    };
  }
}

/**
 * Auto-detect file type and convert to text
 */
export async function convertFileToText(buffer: Buffer, filename: string): Promise<ConversionResult> {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return convertPdfToText(buffer);
    
    case 'docx':
      return convertDocxToText(buffer);
    
    case 'txt':
      return {
        success: true,
        text: buffer.toString('utf-8'),
        metadata: {
          wordCount: buffer.toString('utf-8').split(/\s+/).length,
          originalSize: buffer.length,
          convertedSize: buffer.length
        }
      };
    
    default:
      return {
        success: false,
        error: `Unsupported file type: ${extension}. Supported types: PDF, DOCX, TXT`
      };
  }
}

/**
 * Clean and optimize text for AI training
 */
export function cleanTextForAI(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove form feed characters
    .replace(/\f/g, '\n')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive line breaks (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}
