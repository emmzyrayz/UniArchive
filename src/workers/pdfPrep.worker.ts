// src/workers/pdfPrep.worker.ts
// Prepares one PDF for the staff bulk uploader off the main thread, so a
// batch of large files doesn't freeze the page:
//   1. SHA-256 of the ORIGINAL file (the duplicate check; compression output
//      isn't byte-for-byte stable, the original is)
//   2. page count and lossless compression with pdf-lib (lib/compressPdf.ts),
//      skipped above COMPRESS_MAX_BYTES because pdf-lib holds the whole
//      document in memory
// The result's bytes are transferred back, not copied.
import { compressPdfBytes } from "@/lib/compressPdf";

// Import only types from this file on the main thread: importing values would
// run the onmessage setup there too.
const COMPRESS_MAX_BYTES = 50 * 1024 * 1024;

export interface PdfPrepRequest {
  id: string;
  file: File;
}

export type PdfPrepResponse =
  | {
      id: string;
      ok: true;
      sha256: string;
      bytes: ArrayBuffer;
      originalSize: number;
      pageCount: number | null;
      compressed: boolean;
    }
  | { id: string; ok: false; error: string };

const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");

self.onmessage = async (event: MessageEvent<PdfPrepRequest>) => {
  const { id, file } = event.data;
  try {
    const original = new Uint8Array(await file.arrayBuffer());
    // %PDF- at the start: anything else is refused before it's uploaded
    if (String.fromCharCode(...original.subarray(0, 5)) !== "%PDF-") {
      throw new Error("This file isn't a PDF.");
    }
    const sha256 = hex(await crypto.subtle.digest("SHA-256", original));

    let bytes: Uint8Array = original;
    let pageCount: number | null = null;
    if (original.byteLength <= COMPRESS_MAX_BYTES) {
      const result = await compressPdfBytes(original);
      bytes = result.bytes;
      pageCount = result.pageCount;
    }

    const out = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const response: PdfPrepResponse = {
      id,
      ok: true,
      sha256,
      bytes: out,
      originalSize: original.byteLength,
      pageCount,
      compressed: bytes !== original,
    };
    (self as unknown as Worker).postMessage(response, [out]);
  } catch (error) {
    const response: PdfPrepResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Couldn't read this PDF.",
    };
    (self as unknown as Worker).postMessage(response);
  }
};
