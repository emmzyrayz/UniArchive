// pages/api/upload/file.ts (or app/api/upload/file/route.ts for App Router)

import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import { createB2Client } from '@/lib/backblaze.b2';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ApiResponse {
  success: boolean;
  data?: {
    fileUrl: string;
    fileName: string;
    originalName: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Parse the multipart form data
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    });

    const [, files] = await form.parse(req);
    
    // Get the uploaded file
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Read the file
    const fileBuffer = await fs.readFile(uploadedFile.filepath);
    
    // Create B2 client and upload
    const b2Client = createB2Client();
    const uniqueFileName = b2Client.generateUniqueFileName(uploadedFile.originalFilename || 'unnamed');
    
    const uploadResult = await b2Client.uploadFile(
      fileBuffer,
      uniqueFileName,
      uploadedFile.mimetype || undefined
    );

    // Clean up temporary file
    await fs.unlink(uploadedFile.filepath).catch(console.error);

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        error: uploadResult.error || 'Upload failed',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        fileUrl: uploadResult.fileUrl!,
        fileName: uploadResult.fileName!,
        originalName: uploadedFile.originalFilename || 'unnamed',
      },
    });
  } catch (error) {
    console.error('Upload API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// pages/api/upload/presigned.ts - Generate presigned URLs for client-side uploads
export async function generatePresignedUrl(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { fileName, contentType } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'fileName is required',
      });
    }

    const b2Client = createB2Client();
    const uniqueFileName = b2Client.generateUniqueFileName(fileName);
    
    const result = await b2Client.generatePresignedUploadUrl(
      uniqueFileName,
      contentType
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate presigned URL',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        downloadUrl: result.downloadUrl,
        fileName: uniqueFileName,
      },
    });
  } catch (error) {
    console.error('Presigned URL API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// App Router version (app/api/upload/file/route.ts)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({
        success: false,
        error: 'No file uploaded',
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create B2 client and upload
    const b2Client = createB2Client();
    const uniqueFileName = b2Client.generateUniqueFileName(file.name);
    
    const uploadResult = await b2Client.uploadFile(
      buffer,
      uniqueFileName,
      file.type
    );

    if (!uploadResult.success) {
      return Response.json({
        success: false,
        error: uploadResult.error || 'Upload failed',
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      data: {
        fileUrl: uploadResult.fileUrl!,
        fileName: uploadResult.fileName!,
        originalName: file.name,
      },
    });
  } catch (error) {
    console.error('Upload API Error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}