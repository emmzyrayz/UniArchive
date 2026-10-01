// src/storage.ts
// Backblaze B2 through its S3-compatible API: stream a PDF to disk, and
// upload files and page images. Downloads go to disk, never to memory, so a
// 500 MB textbook doesn't need 500 MB of RAM.
import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Config } from "./config.ts";

export interface Storage {
  download(key: string, toPath: string): Promise<number>;
  uploadFile(key: string, fromPath: string, contentType: string): Promise<void>;
  uploadBuffer(key: string, body: Buffer, contentType: string): Promise<void>;
}

export function createStorage(config: Config): Storage {
  const client = new S3Client({
    endpoint: `https://${config.b2.endpoint}`,
    region: config.b2.region,
    credentials: { accessKeyId: config.b2.keyId, secretAccessKey: config.b2.key },
    forcePathStyle: true,
    // Newer SDKs send streamed uploads as "aws-chunked" with a trailing CRC32
    // checksum by default. S3-compatible stores don't all decode that (one
    // stored the framing inside the PDF), so only checksum when required:
    // plain uploads with Content-Length work everywhere, B2 included.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const Bucket = config.b2.bucket;

  return {
    async download(key, toPath) {
      const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      if (!res.Body) throw new Error(`Empty body for ${key}`);
      await pipeline(res.Body as Readable, createWriteStream(toPath));
      return (await stat(toPath)).size;
    },
    async uploadFile(key, fromPath, contentType) {
      const { size } = await stat(fromPath);
      await client.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: createReadStream(fromPath),
          ContentLength: size,
          ContentType: contentType,
        }),
      );
    },
    async uploadBuffer(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },
  };
}
