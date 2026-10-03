// ---------------------------------------------------------------------------
// PDF text extraction. pdf-parse is loaded lazily so server bundles only pay
// for it when a bid document actually needs to be read.
// ---------------------------------------------------------------------------

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = await import('pdf-parse/lib/pdf-parse.js');
  const parse = mod.default ?? (mod as unknown as typeof import('pdf-parse/lib/pdf-parse.js').default);
  const result = await parse(buffer);
  return result?.text ?? '';
}
