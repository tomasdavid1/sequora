declare module 'pdf-parse' {
  export interface PDFParseOptions {
    max?: number;
  }

  export interface PDFParseResult {
    text: string;
    version?: string;
    info?: Record<string, unknown>;
    metadata?: unknown;
    numpages: number;
    numrender?: number;
    pdfInfo?: Record<string, unknown>;
  }

  function pdfParse(
    buffer: Buffer | Uint8Array | ArrayBuffer,
    options?: PDFParseOptions
  ): Promise<PDFParseResult>;

  export default pdfParse;
}


