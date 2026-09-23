// src/lib/storage.ts
// S3-compatible storage client for Backblaze B2 (also works with R2 / AWS S3).
//
// Primary upload path: the server issues a presigned PUT URL and the browser
// uploads straight to the bucket, so files never pass through a Next.js
// function (Vercel caps request bodies at ~4.5 MB).
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

export interface PresignedUploadResult {
  success: boolean;
  uploadUrl?: string;
  fileUrl?: string;
  storageKey?: string;
  expiresIn?: number;
  error?: string;
}

export interface PresignedDownloadResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface BatchDeleteResult {
  success: boolean;
  deletedFiles: string[];
  failedFiles: { fileName: string; error: string }[];
  totalDeleted: number;
  totalFailed: number;
  error?: string;
}

export interface FileExistsResult {
  exists: boolean;
  fileInfo?: { size: number; lastModified: Date; contentType: string };
  error?: string;
}

export interface ListFilesResult {
  success: boolean;
  files: { key: string; size: number; lastModified: Date; etag: string }[];
  totalCount: number;
  isTruncated: boolean;
  nextContinuationToken?: string;
  error?: string;
}

interface StorageConfig {
  keyId: string;
  applicationKey: string;
  bucketName: string;
  region: string;
  endpoint: string;
  publicUrl: string;
}

const REQUIRED_ENV = [
  "BACKBLAZE_KEY_ID",
  "BACKBLAZE_APPLICATION_KEY",
  "BACKBLAZE_BUCKET_NAME",
  "BACKBLAZE_ENDPOINT",
] as const;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function readConfig(): StorageConfig {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  const bucketName = process.env.BACKBLAZE_BUCKET_NAME!;
  const endpoint = process.env.BACKBLAZE_ENDPOINT!.replace(/^https?:\/\//, "");
  // B2 endpoints look like s3.<region>.backblazeb2.com
  const region =
    process.env.BACKBLAZE_REGION ||
    endpoint.match(/^s3\.([^.]+)\./)?.[1] ||
    "us-west-004";
  const publicUrl = (
    process.env.BACKBLAZE_PUBLIC_URL || `${bucketName}.${endpoint}`
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  return {
    keyId: process.env.BACKBLAZE_KEY_ID!,
    applicationKey: process.env.BACKBLAZE_APPLICATION_KEY!,
    bucketName,
    region,
    endpoint,
    publicUrl,
  };
}

export class StorageClient {
  private client: S3Client | null = null;
  private config: StorageConfig | null = null;

  // Created on first use so importing this module never throws when the
  // storage variables are not configured (e.g. during `next build`).
  private get s3(): { client: S3Client; config: StorageConfig } {
    if (!this.client || !this.config) {
      this.config = readConfig();
      this.client = new S3Client({
        endpoint: `https://${this.config.endpoint}`,
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.keyId,
          secretAccessKey: this.config.applicationKey,
        },
        forcePathStyle: true,
      });
    }
    return { client: this.client, config: this.config };
  }

  getPublicUrl(key: string): string {
    const { config } = this.s3;
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return `https://${config.publicUrl}/${encodedKey}`;
  }

  /**
   * Presigned PUT for a browser upload. Content-Type and Content-Length are
   * part of the signature, so the client cannot upload a different type or a
   * larger file than it asked for.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    contentLength: number,
    expiresIn = 900,
  ): Promise<PresignedUploadResult> {
    try {
      const { client, config } = this.s3;
      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      });
      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn,
        signableHeaders: new Set(["content-type", "content-length"]),
      });
      return {
        success: true,
        uploadUrl,
        fileUrl: this.getPublicUrl(key),
        storageKey: key,
        expiresIn,
      };
    } catch (error) {
      return {
        success: false,
        error: errorMessage(error, "Failed to generate upload URL"),
      };
    }
  }

  /** Signed GET, valid for one hour by default. */
  async generatePresignedDownloadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<PresignedDownloadResult> {
    try {
      const { client, config } = this.s3;
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      });
      const downloadUrl = await getSignedUrl(client, command, { expiresIn });
      return { success: true, downloadUrl };
    } catch (error) {
      return {
        success: false,
        error: errorMessage(error, "Failed to generate download URL"),
      };
    }
  }

  /** Server-side upload, for small files and migrations only. */
  async uploadFile(
    file: Buffer | Uint8Array | string,
    key: string,
    contentType = "application/octet-stream",
  ): Promise<UploadResult> {
    try {
      const { client, config } = this.s3;
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          Body: file,
          ContentType: contentType,
        }),
      );
      return { success: true, fileUrl: this.getPublicUrl(key), fileName: key };
    } catch (error) {
      return { success: false, error: errorMessage(error, "Upload failed") };
    }
  }

  async deleteFile(key: string): Promise<DeleteResult> {
    try {
      const { client, config } = this.s3;
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }),
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error, "Delete failed") };
    }
  }

  /** Deletes in batches of 1000, the S3 per-request maximum. */
  async batchDeleteFiles(keys: string[]): Promise<BatchDeleteResult> {
    const deletedFiles: string[] = [];
    const failedFiles: { fileName: string; error: string }[] = [];

    if (keys.length === 0) {
      return {
        success: true,
        deletedFiles,
        failedFiles,
        totalDeleted: 0,
        totalFailed: 0,
      };
    }

    try {
      const { client, config } = this.s3;
      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);
        try {
          const result = await client.send(
            new DeleteObjectsCommand({
              Bucket: config.bucketName,
              Delete: {
                Objects: batch.map((Key) => ({ Key })),
                Quiet: false,
              },
            }),
          );
          result.Deleted?.forEach((d) => d.Key && deletedFiles.push(d.Key));
          result.Errors?.forEach(
            (e) =>
              e.Key &&
              failedFiles.push({
                fileName: e.Key,
                error: e.Message || "Unknown error",
              }),
          );
        } catch (batchError) {
          const message = errorMessage(batchError, "Batch delete failed");
          batch.forEach((fileName) =>
            failedFiles.push({ fileName, error: message }),
          );
        }
      }
    } catch (error) {
      const message = errorMessage(error, "Batch delete failed");
      return {
        success: false,
        deletedFiles: [],
        failedFiles: keys.map((fileName) => ({ fileName, error: message })),
        totalDeleted: 0,
        totalFailed: keys.length,
        error: message,
      };
    }

    return {
      success: failedFiles.length === 0,
      deletedFiles,
      failedFiles,
      totalDeleted: deletedFiles.length,
      totalFailed: failedFiles.length,
    };
  }

  async fileExists(key: string): Promise<FileExistsResult> {
    try {
      const { client, config } = this.s3;
      const result = await client.send(
        new HeadObjectCommand({ Bucket: config.bucketName, Key: key }),
      );
      return {
        exists: true,
        fileInfo: {
          size: result.ContentLength ?? 0,
          lastModified: result.LastModified ?? new Date(),
          contentType: result.ContentType ?? "application/octet-stream",
        },
      };
    } catch (error: unknown) {
      const e = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      return {
        exists: false,
        error: errorMessage(error, "Failed to check file existence"),
      };
    }
  }

  async listFiles(
    prefix?: string,
    maxKeys = 1000,
    continuationToken?: string,
  ): Promise<ListFilesResult> {
    try {
      const { client, config } = this.s3;
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucketName,
          Prefix: prefix,
          MaxKeys: maxKeys,
          ContinuationToken: continuationToken,
        }),
      );
      const files =
        result.Contents?.map((obj) => ({
          key: obj.Key ?? "",
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? new Date(),
          etag: obj.ETag ?? "",
        })) ?? [];
      return {
        success: true,
        files,
        totalCount: files.length,
        isTruncated: result.IsTruncated ?? false,
        nextContinuationToken: result.NextContinuationToken,
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        totalCount: 0,
        isTruncated: false,
        error: errorMessage(error, "Failed to list files"),
      };
    }
  }

  /** Deletes everything under a prefix. An empty prefix is always refused. */
  async deleteFilesByPrefix(prefix: string): Promise<BatchDeleteResult> {
    const empty = {
      deletedFiles: [],
      failedFiles: [],
      totalDeleted: 0,
      totalFailed: 0,
    };
    if (!prefix || prefix.trim() === "") {
      return {
        success: false,
        ...empty,
        error: "Prefix is required for safety - cannot delete all files",
      };
    }

    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await this.listFiles(prefix, 1000, continuationToken);
      if (!page.success) {
        return {
          success: false,
          ...empty,
          error: page.error || "Failed to list files for deletion",
        };
      }
      keys.push(...page.files.map((f) => f.key));
      continuationToken = page.nextContinuationToken;
    } while (continuationToken);

    return this.batchDeleteFiles(keys);
  }

  /** Replace anything outside letters, digits, dot, underscore and hyphen. */
  sanitizeFileName(fileName: string): string {
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9._\-]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^[._]+/, "")
      .toLowerCase()
      .slice(0, 150);
    if (!sanitized) return "file.bin";
    return sanitized.includes(".") ? sanitized : `${sanitized}.bin`;
  }

  /** `<sanitised-name>_<timestamp>_<random>.<ext>` */
  generateUniqueFileName(originalName: string): string {
    const safe = this.sanitizeFileName(originalName);
    const dot = safe.lastIndexOf(".");
    const base = dot > 0 ? safe.slice(0, dot) : safe;
    const ext = dot > 0 ? safe.slice(dot + 1) : "bin";
    const random = crypto.randomUUID().slice(0, 8);
    return `${base}_${Date.now()}_${random}.${ext}`;
  }
}

export const storageClient = new StorageClient();
