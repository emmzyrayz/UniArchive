// app/api/admin/upload-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createB2Client } from '@/lib/backblaze.b2';

interface ApiResponse {
  success: boolean;
  data?: {
    fileUrl: string;
    fileName: string;
    originalName: string;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded',
      }, { status: 400 });
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: 'File size exceeds 10MB limit',
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
      return NextResponse.json({
        success: false,
        error: uploadResult.error || 'Upload failed',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        fileUrl: uploadResult.fileUrl!,
        fileName: uploadResult.fileName!,
        originalName: file.name,
      },
    });
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}