declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseOptions {
    max?: number;
    pagerender?: (data: unknown) => string;
  }
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }
  function pdfParse(buffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export default pdfParse;
}
