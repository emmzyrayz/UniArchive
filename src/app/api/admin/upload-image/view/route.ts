// /app/api/admin/upload-image/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary.config";
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from "@/lib/database";

interface CloudinaryFile {
  id: string;
  name: string;
  url: string;
  type: "image";
  provider: "cloudinary";
  size: number;
  uploadDate: Date;
  mimeType: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  resourceType: string;
  secureUrl: string;
}

interface ApiResponse {
  success: boolean;
  data?: {
    files: CloudinaryFile[];
    totalCount: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  message?: string;
  error?: string;
}

// Cloudinary resource interface
interface CloudinaryResource {
  public_id: string;
  format: string;
  resource_type: string;
  type: string;
  created_at: string;
  bytes: number;
  width: number;
  height: number;
  secure_url: string;
  url: string;
  folder?: string;
}

interface CloudinaryListResult {
  resources: CloudinaryResource[];
  next_cursor?: string;
  total_count: number;
}

interface CloudinaryApiOptions {
  type: string;
  prefix: string;
  max_results: number;
  resource_type: string;
  sort_by: Array<[string, string]>;
  next_cursor?: string;
}

// Verify admin authorization using session-based auth (matching your existing pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();

  console.log("View Cloudinary Images: Starting auth verification");

  // Try to get session from cookie first
  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    console.log(
      "View Cloudinary Images: Checking session from cookie:",
      sessionId.substring(0, 8) + "..."
    );

    const activeSession = await SessionCache.findActiveSession(
      sessionId,
      "uuid"
    );

    if (activeSession) {
      console.log("View Cloudinary Images: Active session found via cookie");

      // Check if user has admin privileges
      if (
        activeSession.role !== "admin" &&
        activeSession.role !== "mod" &&
        activeSession.role !== "contributor"
      ) {
        return {
          error: "Insufficient privileges. Admin access required",
          status: 403,
        };
      }

      return {
        user: {
          _id: activeSession.userId,
          id: activeSession.userId,
          email: activeSession.getDecryptedUserData().email,
          role: activeSession.role,
          fullName: activeSession.fullName,
        },
        session: activeSession,
      };
    }
  }

  // Fallback to Bearer token if no cookie session
  const authorization = request.headers.get("Authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.substring(7);

    try {
      console.log("View Cloudinary Images: Checking Bearer token as fallback");
      const activeSession = await SessionCache.findActiveSession(
        token,
        "sessionToken"
      );

      if (activeSession) {
        console.log(
          "View Cloudinary Images: Active session found via Bearer token"
        );

        // Check if user has admin privileges
        if (
          activeSession.role !== "admin" &&
          activeSession.role !== "mod" &&
          activeSession.role !== "contributor"
        ) {
          return {
            error: "Insufficient privileges. Admin access required",
            status: 403,
          };
        }

        return {
          user: {
            _id: activeSession.userId,
            id: activeSession.userId,
            email: activeSession.getDecryptedUserData().email,
            role: activeSession.role,
            fullName: activeSession.fullName,
          },
          session: activeSession,
        };
      }
    } catch (error) {
      console.error(
        "View Cloudinary Images: Error checking Bearer token:",
        error
      );
    }
  }

  return { error: "No valid session found", status: 401 };
}

// Helper function to get MIME type from format
function getMimeTypeFromFormat(format: string): string {
  const mimeTypes: { [key: string]: string } = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tiff: "image/tiff",
    ico: "image/x-icon",
  };

  return mimeTypes[format.toLowerCase()] || "image/jpeg";
}

// Helper function to get resources from Cloudinary
function getCloudinaryResources(
  folderPath: string,
  maxResults: number = 100,
  nextCursor?: string
): Promise<CloudinaryListResult> {
  return new Promise((resolve, reject) => {
    const options: CloudinaryApiOptions = {
      type: "upload",
      prefix: folderPath,
      max_results: maxResults,
      resource_type: "image",
      sort_by: [["created_at", "desc"]], // Sort by creation date, newest first
    };

    if (nextCursor) {
      options.next_cursor = nextCursor;
    }

    cloudinary.api.resources(options, (error, result) => {
      if (error) {
        console.error("Cloudinary list resources error:", error);
        reject(error);
      } else {
        resolve(result as CloudinaryListResult);
      }
    });
  });
}

// Transform Cloudinary resource to our format
function transformCloudinaryResource(
  resource: CloudinaryResource
): CloudinaryFile {
  const fileName = resource.public_id.split("/").pop() || resource.public_id;

  return {
    id: resource.public_id,
    name: `${fileName}.${resource.format}`,
    url: resource.secure_url,
    type: "image",
    provider: "cloudinary",
    size: resource.bytes,
    uploadDate: new Date(resource.created_at),
    mimeType: getMimeTypeFromFormat(resource.format),
    publicId: resource.public_id,
    format: resource.format,
    width: resource.width,
    height: resource.height,
    resourceType: resource.resource_type,
    secureUrl: resource.secure_url,
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    console.log("View Cloudinary Images: Starting image listing process");

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ("error" in authResult) {
      console.log("View Cloudinary Images: Auth failed:", authResult.error);
      return NextResponse.json(
        {
          success: false,
          message: authResult.error,
        },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log(
      "View Cloudinary Images: Auth successful for user:",
      user.email
    );

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "university-logos"; // Default folder
    const maxResults = parseInt(searchParams.get("maxResults") || "100");
    const nextCursor = searchParams.get("nextCursor") || undefined;

    console.log("View Cloudinary Images: Query parameters:", {
      folder,
      maxResults,
      nextCursor: nextCursor ? "present" : "none",
    });

    console.log("View Cloudinary Images: Fetching images from Cloudinary");

    // Get resources from Cloudinary
    const listResult = await getCloudinaryResources(
      folder,
      maxResults,
      nextCursor
    );

    if (!listResult.resources) {
      console.log("View Cloudinary Images: No resources found");
      return NextResponse.json({
        success: true,
        data: {
          files: [],
          totalCount: 0,
          hasMore: false,
        },
        message: "No images found in the specified folder",
      });
    }

    console.log(
      `View Cloudinary Images: Found ${listResult.resources.length} images for user: ${user.email}`
    );

    // Transform Cloudinary resources to our format
    const transformedFiles: CloudinaryFile[] = listResult.resources.map(
      transformCloudinaryResource
    );

    // Filter out any invalid resources (extra safety check)
    const validFiles = transformedFiles.filter((file) => {
      return file.format && file.width && file.height && file.size > 0;
    });

    console.log(
      `View Cloudinary Images: Returning ${validFiles.length} valid image files`
    );

    return NextResponse.json({
      success: true,
      data: {
        files: validFiles,
        totalCount: validFiles.length,
        hasMore: !!listResult.next_cursor,
        nextCursor: listResult.next_cursor,
      },
      message: `Successfully retrieved ${validFiles.length} images`,
    });
  } catch (error) {
    console.error("View Cloudinary Images error:", error);

    // Handle specific Cloudinary errors
    if (error instanceof Error) {
      if (error.message.includes("Invalid folder")) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid folder path specified",
          },
          { status: 400 }
        );
      }

      if (error.message.includes("Rate limit")) {
        return NextResponse.json(
          {
            success: false,
            message: "Rate limit exceeded. Please try again later",
          },
          { status: 429 }
        );
      }

      if (error.message.includes("Unauthorized")) {
        return NextResponse.json(
          {
            success: false,
            message: "Cloudinary authentication failed",
          },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve images",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
