// /app/api/admin/upload-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from '@/lib/database';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary upload options interface
interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
  resource_type?: "auto" | "image" | "video" | "raw" | undefined;
  quality?: string;
  format?: string;
  transformation?: Array<{
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  }>;
}

// Cloudinary upload result interface
interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  resource_type: string;
}

// Verify admin authorization using session-based auth (matching AdminContext pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();
  
  console.log('Upload Image: Starting auth verification');
  
  // Try to get session from cookie first (matching your AdminContext pattern)
  const sessionId = request.cookies.get('sessionId')?.value;
  
  if (sessionId) {
    console.log('Upload Image: Checking session from cookie:', sessionId.substring(0, 8) + '...');
    
    const activeSession = await SessionCache.findActiveSession(sessionId, 'uuid');
    
    if (activeSession) {
      console.log('Upload Image: Active session found via cookie');
      
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
  }
  
  // Fallback to Bearer token if no cookie session (for API compatibility)
  const authorization = request.headers.get('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7);
    
    try {
      console.log('Upload Image: Checking Bearer token as fallback');
      // Try to find session by token
      const activeSession = await SessionCache.findActiveSession(token, 'sessionToken');
      
      if (activeSession) {
        console.log('Upload Image: Active session found via Bearer token');
        
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
      console.error('Upload Image: Error checking Bearer token:', error);
    }
  }
  
  return { error: "No valid session found", status: 401 };
}

// Helper function to convert File to buffer
async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Helper function to upload to Cloudinary with proper types
function uploadToCloudinary(buffer: Buffer, options: CloudinaryUploadOptions): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload successful:', result?.public_id);
          resolve(result as CloudinaryUploadResult);
        }
      }
    ).end(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload Image: Starting image upload process');
    
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      console.log('Upload Image: Auth failed:', authResult.error);
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log('Upload Image: Auth successful for user:', user.email);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "File size too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    console.log('Upload Image: File validation passed, uploading to Cloudinary');

    // Convert file to buffer
    const buffer = await fileToBuffer(file);

    // Upload to Cloudinary with proper typing
    const uploadOptions: CloudinaryUploadOptions = {
      folder: 'university-logos', // Organize uploads in a folder
      public_id: `logo_${Date.now()}`, // Unique filename
      overwrite: true,
      resource_type: 'auto',
      quality: 'auto:good', // Optimize quality
      transformation: [
       { 
          width: 800, 
          height: 600, 
          crop: 'limit',
        }
      ]
    };

    const result = await uploadToCloudinary(buffer, uploadOptions);

    console.log(`Image uploaded successfully by admin: ${user.email}`);

    return NextResponse.json(
      {
        message: "Image uploaded successfully",
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Image upload error:", error);

    
    // Handle specific Cloudinary errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid image file')) {
        return NextResponse.json(
          { 
            message: "Invalid image file",
            success: false
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('File size too large')) {
        return NextResponse.json(
          { 
            message: "File size exceeds limit",
            success: false
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
    { 
      message: "Failed to upload image", 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
  }
}