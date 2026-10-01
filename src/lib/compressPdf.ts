// src/lib/compressPdf.ts
// Lossless PDF compression in the browser with pdf-lib: re-saving with object
// streams packs the file's structure more tightly (often 5-20% smaller).
// Images are left alone; real shrinking of scanned PDFs needs a server-side
// tool like Ghostscript. Used by the student upload page and, through
// workers/pdfPrep.worker.ts, the staff bulk uploader.
import { PDFDocument } from "pdf-lib";

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  saving: number; // percentage saved
}

export interface CompressedBytes {
  /** The smaller of the original and the re-saved file. */
  bytes: Uint8Array;
  /** Null when the PDF couldn't be parsed. */
  pageCount: number | null;
}

/** Re-saves a PDF, keeping the result only if it's smaller. Never throws. */
export async function compressPdfBytes(input: Uint8Array): Promise<CompressedBytes> {
  try {
    const pdfDoc = await PDFDocument.load(input, {
      ignoreEncryption: true,
      // Keep the original producer and dates
      updateMetadata: false,
    });
    const pageCount = pdfDoc.getPageCount();
    const compressed = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });
    return { bytes: compressed.byteLength < input.byteLength ? compressed : input, pageCount };
  } catch {
    // If compression fails for any reason, keep the original untouched
    return { bytes: input, pageCount: null };
  }
}

export async function compressPdf(file: File): Promise<CompressionResult> {
  const originalSize = file.size;
  const { bytes } = await compressPdfBytes(new Uint8Array(await file.arrayBuffer()));
  if (bytes.byteLength >= originalSize) {
    return { file, originalSize, compressedSize: originalSize, saving: 0 };
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    file: new File([buffer], file.name, { type: "application/pdf" }),
    originalSize,
    compressedSize: bytes.byteLength,
    saving: Math.round(((originalSize - bytes.byteLength) / originalSize) * 100),
  };
}
