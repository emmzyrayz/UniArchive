// src/lib/compressPdf.ts
import { PDFDocument } from "pdf-lib";

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  saving: number; // percentage saved
}

export async function compressPdf(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });

    const compressed = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    const compressedSize = compressed.byteLength;

    // Only use the compressed version if it's actually smaller
    if (compressedSize >= originalSize) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        saving: 0,
      };
    }

    const buffer: ArrayBuffer = compressed.buffer.slice(
      compressed.byteOffset,
      compressed.byteOffset + compressed.byteLength,
    ) as ArrayBuffer;

    const compressedFile = new File([buffer], file.name, {
      type: "application/pdf",
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      saving: Math.round(
        ((originalSize - compressedSize) / originalSize) * 100,
      ),
    };
  } catch {
    // If compression fails for any reason, return the original file untouched
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      saving: 0,
    };
  }
}
