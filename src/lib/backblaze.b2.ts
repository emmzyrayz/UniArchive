// lib/backblaze-b2.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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

export class BackblazeB2Client {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: B2Config) {
    this.bucketName = config.bucketName;
    
    this.s3Client = new S3Client({
      endpoint: `https://${config.endpoint}`,
      region: 'eu-central-003', // Backblaze B2 region
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
        ContentType: contentType || 'application/octet-stream',
      });

      await this.s3Client.send(command);

      const fileUrl = `https://${this.bucketName}.s3.eu-central-003.backblazeb2.com/${sanitizedFileName}`;

      return {
        success: true,
        fileUrl,
        fileName: sanitizedFileName,
      };
    } catch (error) {
      console.error('B2 Upload Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
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
        ContentType: contentType || 'application/octet-stream',
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
      console.error('B2 Presigned URL Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate presigned URL',
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
      console.error('B2 Download URL Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate download URL',
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
      .replace(/[^a-zA-Z0-9.-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
    
    // Ensure file has extension
    if (!sanitized.includes('.')) {
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
    const extension = originalName.split('.').pop() || 'bin';
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    
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