import { NextRequest, NextResponse } from "next/server";
import { createB2Client } from "@/lib/backblaze.b2";
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from "@/lib/database";

interface ApiResponse {
  success: boolean;
  data?: {
    deletedFile: string;
    deletedAt: string;
  };
  message?: string;
  error?: string;
}

// Verify admin authorization using session-based auth (matching your existing pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();

  console.log("Delete File: Starting auth verification");

  // Try to get session from cookie first
  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    console.log(
      "Delete File: Checking session from cookie:",
      sessionId.substring(0, 8) + "..."
    );

    const activeSession = await SessionCache.findActiveSession(
      sessionId,
      "uuid"
    );

    if (activeSession) {
      console.log("Delete File: Active session found via cookie");

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
      console.log("Delete File: Checking Bearer token as fallback");
      const activeSession = await SessionCache.findActiveSession(
        token,
        "sessionToken"
      );

      if (activeSession) {
        console.log("Delete File: Active session found via Bearer token");

        // Check if user has admin privileges
        if (activeSession.role !== "admin" && activeSession.role !== "mod") {
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
      console.error("Delete File: Error checking Bearer token:", error);
    }
  }

  return { error: "No valid session found", status: 401 };
}

// Validate file ID format
function validateFileId(fileId: string): { isValid: boolean; error?: string } {
  if (!fileId || fileId.trim() === "") {
    return {
      isValid: false,
      error: "File ID is required",
    };
  }

  // Basic validation - should be a reasonable filename
  if (fileId.length > 255) {
    return {
      isValid: false,
      error: "File ID too long",
    };
  }

  // Check for path traversal attempts
  if (fileId.includes("..") || fileId.includes("//")) {
    return {
      isValid: false,
      error: "Invalid file ID format",
    };
  }

  return { isValid: true };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    console.log("Delete File: Starting file deletion process");

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ("error" in authResult) {
      console.log("Delete File: Auth failed:", authResult.error);
      return NextResponse.json(
        {
          success: false,
          message: authResult.error,
        },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log("Delete File: Auth successful for user:", user.email);

    // Validate file ID
    const fileId = (await params).id;
    const validation = validateFileId(fileId);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    console.log("Delete File: Processing file deletion:", {
      fileId: fileId,
      requestedBy: user.email,
    });

    // Create B2 client and delete file
    const b2Client = createB2Client();

    console.log("Delete File: Deleting file from Backblaze B2");

    const deleteResult = await b2Client.deleteFile(fileId);

    if (!deleteResult.success) {
      console.error("Delete File: B2 deletion failed:", deleteResult.error);

      // Handle specific B2 errors
      if (
        deleteResult.error?.includes("not found") ||
        deleteResult.error?.includes("404")
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "File not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: deleteResult.error || "Delete failed",
        },
        { status: 500 }
      );
    }

    console.log(`File deleted successfully by admin: ${user.email}`, {
      fileId: fileId,
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
      data: {
        deletedFile: fileId,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("File deletion error:", error);

    // Handle specific B2 errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            message: "File not found",
          },
          { status: 404 }
        );
      }

      if (error.message.includes("BACKBLAZE")) {
        return NextResponse.json(
          {
            success: false,
            message: "Cloud storage configuration error",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete file",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
