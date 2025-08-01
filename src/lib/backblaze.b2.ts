// lib/backblaze-b2.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface B2Config {
  keyId: string;
  applicationKey: string;
  bucketName: string;
  bucketId: string;
  endpoint: string;
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

export interface PresignedUrlResult {
  success: boolean;
  uploadUrl?: string;
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
  fileInfo?: {
    size: number;
    lastModified: Date;
    contentType: string;
  };
  error?: string;
}

export interface ListFilesResult {
  success: boolean;
  files: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
  }>;
  totalCount: number;
  isTruncated: boolean;
  nextContinuationToken?: string;
  error?: string;
}

export class BackblazeB2Client {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: B2Config) {
    this.bucketName = config.bucketName;

    this.s3Client = new S3Client({
      endpoint: `https://${config.endpoint}`,
      region: "eu-central-003", // Backblaze B2 region
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.applicationKey,
      },
      forcePathStyle: true, // Important for Backblaze B2
    });
  }

  /**
   * Upload a file directly to Backblaze B2
   */
  async uploadFile(
    file: Buffer | Uint8Array | string,
    fileName: string,
    contentType?: string
  ): Promise<UploadResult> {
    try {
      const sanitizedFileName = this.sanitizeFileName(fileName);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: sanitizedFileName,
        Body: file,
        ContentType: contentType || "application/octet-stream",
      });

      await this.s3Client.send(command);

      const fileUrl = `https://${this.bucketName}.s3.eu-central-003.backblazeb2.com/${sanitizedFileName}`;

      return {
        success: true,
        fileUrl,
        fileName: sanitizedFileName,
      };
    } catch (error) {
      console.error("B2 Upload Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Delete a single file from Backblaze B2
   */
  async deleteFile(fileName: string): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);

      return {
        success: true,
      };
    } catch (error) {
      console.error("B2 Delete Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }

  /**
   * Delete multiple files from Backblaze B2 in a single batch operation
   * More efficient than individual delete calls for multiple files
   */
  async batchDeleteFiles(fileNames: string[]): Promise<BatchDeleteResult> {
    try {
      if (fileNames.length === 0) {
        return {
          success: true,
          deletedFiles: [],
          failedFiles: [],
          totalDeleted: 0,
          totalFailed: 0,
        };
      }

      // B2/S3 supports deleting up to 1000 objects per request
      const batchSize = 1000;
      const allDeletedFiles: string[] = [];
      const allFailedFiles: { fileName: string; error: string }[] = [];

      for (let i = 0; i < fileNames.length; i += batchSize) {
        const batch = fileNames.slice(i, i + batchSize);

        const deleteObjects = batch.map((fileName) => ({
          Key: fileName,
        }));

        const command = new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: deleteObjects,
            Quiet: false, // Return information about deleted and failed objects
          },
        });

        try {
          const result = await this.s3Client.send(command);

          // Track successful deletions
          if (result.Deleted) {
            result.Deleted.forEach((deleted) => {
              if (deleted.Key) {
                allDeletedFiles.push(deleted.Key);
              }
            });
          }

          // Track failed deletions
          if (result.Errors) {
            result.Errors.forEach((error) => {
              if (error.Key) {
                allFailedFiles.push({
                  fileName: error.Key,
                  error: error.Message || "Unknown error",
                });
              }
            });
          }
        } catch (batchError) {
          // If the entire batch fails, mark all files in this batch as failed
          batch.forEach((fileName) => {
            allFailedFiles.push({
              fileName,
              error:
                batchError instanceof Error
                  ? batchError.message
                  : "Batch delete failed",
            });
          });
        }
      }

      return {
        success: allFailedFiles.length === 0,
        deletedFiles: allDeletedFiles,
        failedFiles: allFailedFiles,
        totalDeleted: allDeletedFiles.length,
        totalFailed: allFailedFiles.length,
      };
    } catch (error) {
      console.error("B2 Batch Delete Error:", error);
      return {
        success: false,
        deletedFiles: [],
        failedFiles: fileNames.map((fileName) => ({
          fileName,
          error: error instanceof Error ? error.message : "Batch delete failed",
        })),
        totalDeleted: 0,
        totalFailed: fileNames.length,
        error: error instanceof Error ? error.message : "Batch delete failed",
      };
    }
  }

  /**
   * Check if a file exists in the bucket
   */
  async fileExists(fileName: string): Promise<FileExistsResult> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      const result = await this.s3Client.send(command);

      return {
        exists: true,
        fileInfo: {
          size: result.ContentLength || 0,
          lastModified: result.LastModified || new Date(),
          contentType: result.ContentType || "application/octet-stream",
        },
      };
    } catch (error: unknown) {
      // If error is 404, file doesn't exist
      if (
        (error as { name?: string }).name === "NotFound" ||
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        return {
          exists: false,
        };
      }

      console.error("B2 File Exists Check Error:", error);
      return {
        exists: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check file existence",
      };
    }
  }

  /**
   * List files in the bucket with optional prefix filtering
   */
  async listFiles(
    prefix?: string,
    maxKeys: number = 1000,
    continuationToken?: string
  ): Promise<ListFilesResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });

      const result = await this.s3Client.send(command);

      const files =
        result.Contents?.map((obj) => ({
          key: obj.Key || "",
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          etag: obj.ETag || "",
        })) || [];

      return {
        success: true,
        files,
        totalCount: files.length,
        isTruncated: result.IsTruncated || false,
        nextContinuationToken: result.NextContinuationToken,
      };
    } catch (error) {
      console.error("B2 List Files Error:", error);
      return {
        success: false,
        files: [],
        totalCount: 0,
        isTruncated: false,
        error: error instanceof Error ? error.message : "Failed to list files",
      };
    }
  }

  /**
   * Delete all files with a specific prefix (be very careful with this!)
   */
  async deleteFilesByPrefix(prefix: string): Promise<BatchDeleteResult> {
    try {
      if (!prefix || prefix.trim() === "") {
        return {
          success: false,
          deletedFiles: [],
          failedFiles: [],
          totalDeleted: 0,
          totalFailed: 0,
          error: "Prefix is required for safety - cannot delete all files",
        };
      }

      console.warn(`B2: Attempting to delete all files with prefix: ${prefix}`);

      // List all files with the given prefix
      const allFiles: string[] = [];
      let continuationToken: string | undefined;

      do {
        const listResult = await this.listFiles(
          prefix,
          1000,
          continuationToken
        );

        if (!listResult.success) {
          return {
            success: false,
            deletedFiles: [],
            failedFiles: [],
            totalDeleted: 0,
            totalFailed: 0,
            error: listResult.error || "Failed to list files for deletion",
          };
        }

        allFiles.push(...listResult.files.map((file) => file.key));
        continuationToken = listResult.nextContinuationToken;
      } while (continuationToken);

      if (allFiles.length === 0) {
        return {
          success: true,
          deletedFiles: [],
          failedFiles: [],
          totalDeleted: 0,
          totalFailed: 0,
        };
      }

      console.log(
        `B2: Found ${allFiles.length} files to delete with prefix: ${prefix}`
      );

      // Delete all found files using batch delete
      return await this.batchDeleteFiles(allFiles);
    } catch (error) {
      console.error("B2 Delete by Prefix Error:", error);
      return {
        success: false,
        deletedFiles: [],
        failedFiles: [],
        totalDeleted: 0,
        totalFailed: 0,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete files by prefix",
      };
    }
  }

  /**
   * Generate a presigned URL for direct upload from client
   */
  async generatePresignedUploadUrl(
    fileName: string,
    contentType?: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<PresignedUrlResult> {
    try {
      const sanitizedFileName = this.sanitizeFileName(fileName);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: sanitizedFileName,
        ContentType: contentType || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      const downloadUrl = `https://${this.bucketName}.s3.eu-central-003.backblazeb2.com/${sanitizedFileName}`;

      return {
        success: true,
        uploadUrl,
        downloadUrl,
      };
    } catch (error) {
      console.error("B2 Presigned URL Error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate presigned URL",
      };
    }
  }

  /**
   * Generate a presigned URL for downloading/accessing a file
   */
  async generatePresignedDownloadUrl(
    fileName: string,
    expiresIn: number = 3600
  ): Promise<PresignedUrlResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return {
        success: true,
        downloadUrl,
      };
    } catch (error) {
      console.error("B2 Download URL Error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate download URL",
      };
    }
  }

  /**
   * Get the public URL for a file (if bucket allows public access)
   */
  getPublicUrl(fileName: string): string {
    return `https://${this.bucketName}.s3.eu-central-003.backblazeb2.com/${fileName}`;
  }

  /**
   * Sanitize file name for safe storage
   */
  private sanitizeFileName(fileName: string): string {
    // Remove or replace unsafe characters
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9.-_]/g, "_")
      .replace(/_{2,}/g, "_")
      .toLowerCase();

    // Ensure file has extension
    if (!sanitized.includes(".")) {
      return `${sanitized}.bin`;
    }

    return sanitized;
  }

  /**
   * Generate a unique file name with timestamp
   */
  generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split(".").pop() || "bin";
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");

    return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
  }
}

// Factory function for creating B2 client
export function createB2Client(): BackblazeB2Client {
  const config: B2Config = {
    keyId: process.env.BACKBLAZE_KEY_ID!,
    applicationKey: process.env.BACKBLAZE_APPLICATION_KEY!,
    bucketName: process.env.BACKBLAZE_BUCKET_NAME!,
    bucketId: process.env.BACKBLAZE_BUCKET_ID!,
    endpoint: process.env.BACKBLAZE_END_POINT!,
  };

  // Validate required environment variables
  const requiredVars = ['keyId', 'applicationKey', 'bucketName', 'endpoint'] as const;
  for (const key of requiredVars) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: BACKBLAZE_${key.toUpperCase()}`);
    }
  }

  return new BackblazeB2Client(config);
}