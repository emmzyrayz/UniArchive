// /app/api/admin/upload-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createB2Client } from '@/lib/backblaze.b2';
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from '@/lib/database';

interface ApiResponse {
  success: boolean;
  data?: {
    fileUrl: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  };
  message?: string;
  error?: string;
}

// Verify admin authorization using session-based auth (matching your existing pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();
  
  console.log('Upload File: Starting auth verification');
  
  // Try to get session from cookie first
  const sessionId = request.cookies.get('sessionId')?.value;
  
  if (sessionId) {
    console.log('Upload File: Checking session from cookie:', sessionId.substring(0, 8) + '...');
    
    const activeSession = await SessionCache.findActiveSession(sessionId, 'uuid');
    
    if (activeSession) {
      console.log('Upload File: Active session found via cookie');
      
      // Check if user has admin privileges
      if (activeSession.role !== 'admin' && activeSession.role !== 'mod' && activeSession.role !== 'contributor') {
        return { error: "Insufficient privileges. Admin access required", status: 403 };
      }
      
      return { 
        user: {
          _id: activeSession.userId,
          id: activeSession.userId,
          email: activeSession.getDecryptedUserData().email,
          role: activeSession.role,
          fullName: activeSession.fullName
        }, 
        session: activeSession 
      };
    }
  }
  
  // Fallback to Bearer token if no cookie session
  const authorization = request.headers.get('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7);
    
    try {
      console.log('Upload File: Checking Bearer token as fallback');
      const activeSession = await SessionCache.findActiveSession(token, 'sessionToken');
      
      if (activeSession) {
        console.log('Upload File: Active session found via Bearer token');
        
        // Check if user has admin privileges
        if (activeSession.role !== 'admin' && activeSession.role !== 'mod') {
          return { error: "Insufficient privileges. Admin access required", status: 403 };
        }
        
        return { 
          user: {
            _id: activeSession.userId,
            id: activeSession.userId,
            email: activeSession.getDecryptedUserData().email,
            role: activeSession.role,
            fullName: activeSession.fullName
          }, 
          session: activeSession 
        };
      }
    } catch (error) {
      console.error('Upload File: Error checking Bearer token:', error);
    }
  }
  
  return { error: "No valid session found", status: 401 };
}

// Validate file type and size
function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file type - only allow PDFs and documents for this endpoint
  const allowedTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain', // .txt
    'application/rtf', // .rtf
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type: ${file.type}. Only PDF and document files are allowed.`
    };
  }

  // Check file size (50MB limit for documents)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size exceeds 50MB limit'
    };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    console.log('Upload File: Starting file upload process');
    
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      console.log('Upload File: Auth failed:', authResult.error);
      return NextResponse.json(
        { 
          success: false,
          message: authResult.error 
        },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log('Upload File: Auth successful for user:', user.email);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: "No file provided"
      }, { status: 400 });
    }

    console.log('Upload File: Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        message: validation.error
      }, { status: 400 });
    }

    console.log('Upload File: File validation passed, uploading to Backblaze B2');

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create B2 client and upload
    const b2Client = createB2Client();
    
    // Generate unique filename with proper categorization
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'bin';
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueFileName = `materials/${timestamp}_${random}_${nameWithoutExt}.${extension}`;
    
    const uploadResult = await b2Client.uploadFile(
      buffer,
      uniqueFileName,
      file.type
    );

    if (!uploadResult.success) {
      console.error('Upload File: B2 upload failed:', uploadResult.error);
      return NextResponse.json({
        success: false,
        message: uploadResult.error || 'Upload failed'
      }, { status: 500 });
    }

    console.log(`File uploaded successfully by admin: ${user.email}`, {
      fileName: uploadResult.fileName,
      fileUrl: uploadResult.fileUrl
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        fileUrl: uploadResult.fileUrl!,
        fileName: uploadResult.fileName!,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("File upload error:", error);

    // Handle specific B2 errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid file')) {
        return NextResponse.json({
          success: false,
          message: "Invalid file format"
        }, { status: 400 });
      }
      
      if (error.message.includes('File size')) {
        return NextResponse.json({
          success: false,
          message: "File size exceeds limit"
        }, { status: 400 });
      }

      if (error.message.includes('BACKBLAZE')) {
        return NextResponse.json({
          success: false,
          message: "Cloud storage configuration error"
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      message: "Failed to upload file",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}