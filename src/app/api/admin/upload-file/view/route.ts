// /app/api/admin/upload-file/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createB2Client } from "@/lib/backblaze.b2";
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from "@/lib/database";

interface BackblazeFile {
  id: string;
  name: string;
  url: string;
  type: "document";
  provider: "backblaze";
  size: number;
  uploadDate: Date;
  mimeType: string;
  key: string;
  format: string;
  etag: string;
}

interface B2FileObject {
  key?: string;
  etag?: string;
  size?: number;
  lastModified?: Date;
}

interface ApiResponse {
  success: boolean;
  data?: {
    files: BackblazeFile[];
    totalCount: number;
    hasMore: boolean;
    nextContinuationToken?: string;
  };
  message?: string;
  error?: string;
}

// Verify admin authorization using session-based auth (matching your existing pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();

  console.log("View B2 Files: Starting auth verification");

  // Try to get session from cookie first
  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    console.log(
      "View B2 Files: Checking session from cookie:",
      sessionId.substring(0, 8) + "..."
    );

    const activeSession = await SessionCache.findActiveSession(
      sessionId,
      "uuid"
    );

    if (activeSession) {
      console.log("View B2 Files: Active session found via cookie");

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
      console.log("View B2 Files: Checking Bearer token as fallback");
      const activeSession = await SessionCache.findActiveSession(
        token,
        "sessionToken"
      );

      if (activeSession) {
        console.log("View B2 Files: Active session found via Bearer token");

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
      console.error("View B2 Files: Error checking Bearer token:", error);
    }
  }

  return { error: "No valid session found", status: 401 };
}

// Helper function to determine MIME type from file extension
function getMimeTypeFromExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    rtf: "application/rtf",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}

// Helper function to get file format from filename
function getFileFormat(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension || "unknown";
}

// Transform B2 file to our format
function transformB2File(
  b2File: B2FileObject,
  bucketName: string
): BackblazeFile {
  const fileName = b2File.key || "";
  const fileFormat = getFileFormat(fileName);
  const mimeType = getMimeTypeFromExtension(fileName);

  return {
    id: b2File.key || b2File.etag || "",
    name: fileName.split("/").pop() || fileName, // Get just the filename without path
    url: `https://${bucketName}.s3.eu-central-003.backblazeb2.com/${fileName}`,
    type: "document",
    provider: "backblaze",
    size: b2File.size || 0,
    uploadDate: b2File.lastModified || new Date(),
    mimeType,
    key: fileName,
    format: fileFormat,
    etag: b2File.etag || "",
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    console.log("View B2 Files: Starting file listing process");

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ("error" in authResult) {
      console.log("View B2 Files: Auth failed:", authResult.error);
      return NextResponse.json(
        {
          success: false,
          message: authResult.error,
        },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log("View B2 Files: Auth successful for user:", user.email);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "materials/"; // Default to materials folder
    const maxKeys = parseInt(searchParams.get("maxKeys") || "100");
    const continuationToken =
      searchParams.get("continuationToken") || undefined;

    console.log("View B2 Files: Query parameters:", {
      prefix,
      maxKeys,
      continuationToken: continuationToken ? "present" : "none",
    });

    // Create B2 client and list files
    const b2Client = createB2Client();

    console.log("View B2 Files: Fetching files from Backblaze B2");

    const listResult = await b2Client.listFiles(
      prefix,
      maxKeys,
      continuationToken
    );

    if (!listResult.success) {
      console.error("View B2 Files: B2 listing failed:", listResult.error);
      return NextResponse.json(
        {
          success: false,
          message: listResult.error || "Failed to list files",
        },
        { status: 500 }
      );
    }

    console.log(
      `View B2 Files: Found ${listResult.files.length} files for user: ${user.email}`
    );

    // Transform B2 files to our format
    const transformedFiles: BackblazeFile[] = listResult.files.map((file) =>
      transformB2File(file, process.env.BACKBLAZE_BUCKET_NAME!)
    );

    // Filter out any files that might not be valid documents
    const validFiles = transformedFiles.filter((file) => {
      const validExtensions = [
        "pdf",
        "doc",
        "docx",
        "ppt",
        "pptx",
        "txt",
        "rtf",
        "xls",
        "xlsx",
      ];
      return validExtensions.includes(file.format.toLowerCase());
    });

    console.log(
      `View B2 Files: Returning ${validFiles.length} valid document files`
    );

    return NextResponse.json({
      success: true,
      data: {
        files: validFiles,
        totalCount: validFiles.length,
        hasMore: listResult.isTruncated,
        nextContinuationToken: listResult.nextContinuationToken,
      },
      message: `Successfully retrieved ${validFiles.length} files`,
    });
  } catch (error) {
    console.error("View B2 Files error:", error);

    // Handle specific B2 errors
    if (error instanceof Error) {
      if (error.message.includes("BACKBLAZE")) {
        return NextResponse.json(
          {
            success: false,
            message: "Cloud storage configuration error",
          },
          { status: 500 }
        );
      }

      if (error.message.includes("Access denied")) {
        return NextResponse.json(
          {
            success: false,
            message: "Access denied to cloud storage",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve files",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
