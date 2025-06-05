// /app/api/admin/upload-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from '@/lib/cloudinary.config';
import SessionCache from "@/models/sessionCacheModel";
import { IUser } from "@/models/usermodel";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

interface JWTPayload {
  user: IUser;
  sessionToken: string;
  iat?: number;
  exp?: number;
}

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

// Verify admin authorization
async function verifyAdminAuth(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { error: "No authorization token provided", status: 401 };
  }

  const token = authorization.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Check if session exists and is active
    const activeSession = await SessionCache.findActiveSession(
      decoded.sessionToken,
      'sessionToken'
    );

    if (!activeSession) {
      return { error: "Session not found or expired", status: 401 };
    }

    // Check if user has admin privileges
    if (decoded.user.role !== 'admin' && decoded.user.role !== 'mod') {
      return { error: "Insufficient privileges. Admin access required", status: 403 };
    }

    return { user: decoded.user, session: activeSession };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
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
          reject(error);
        } else {
          resolve(result as CloudinaryUploadResult);
        }
      }
    ).end(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

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

    // Convert file to buffer
    const buffer = await fileToBuffer(file);

    // Upload to Cloudinary with proper typing
    const uploadOptions: CloudinaryUploadOptions = {
      folder: 'university-logos', // Organize uploads in a folder
      public_id: `logo_${Date.now()}`, // Unique filename
      overwrite: true,
      resource_type: 'auto',
      quality: 'auto:good', // Optimize quality
      format: 'auto', // Auto format selection
      transformation: [
        { width: 500, height: 500, crop: 'limit' }, // Resize large images
        { quality: 'auto:good' }
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