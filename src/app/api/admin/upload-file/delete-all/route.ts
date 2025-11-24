import { NextRequest, NextResponse } from "next/server";
import { createB2Client } from "@/lib/backblaze.b2";
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from "@/lib/database";

interface ApiResponse {
  success: boolean;
  data?: {
    deletedFiles: string[];
    deletedCount: number;
    failedFiles: Array<{ fileName: string; error: string }>;
    failedCount: number;
    deletedAt: string;
    processingTime: number;
  };
  message?: string;
  error?: string;
}

// Verify admin authorization using session-based auth (matching your existing pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();

  console.log("Delete All Files: Starting auth verification");

  // Try to get session from cookie first
  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    console.log(
      "Delete All Files: Checking session from cookie:",
      sessionId.substring(0, 8) + "..."
    );

    const activeSession = await SessionCache.findActiveSession(
      sessionId,
      "uuid"
    );

    if (activeSession) {
      console.log("Delete All Files: Active session found via cookie");

      // Check if user has admin privileges - stricter check for batch deletion
      if (activeSession.role !== "admin" && activeSession.role !== "mod") {
        return {
          error:
            "Insufficient privileges. Admin or Mod access required for batch deletion",
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
      console.log("Delete All Files: Checking Bearer token as fallback");
      const activeSession = await SessionCache.findActiveSession(
        token,
        "sessionToken"
      );

      if (activeSession) {
        console.log("Delete All Files: Active session found via Bearer token");

        // Check if user has admin privileges - stricter check for batch deletion
        if (activeSession.role !== "admin" && activeSession.role !== "mod") {
          return {
            error:
              "Insufficient privileges. Admin or Mod access required for batch deletion",
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
      console.error("Delete All Files: Error checking Bearer token:", error);
    }
  }

  return { error: "No valid session found", status: 401 };
}

// Validate file IDs from request body
function validateFileIds(fileIds: unknown): {
  isValid: boolean;
  validIds: string[];
  error?: string;
} {
  if (!Array.isArray(fileIds)) {
    return {
      isValid: false,
      validIds: [],
      error: "File IDs must be provided as an array",
    };
  }

  if (fileIds.length === 0) {
    return {
      isValid: false,
      validIds: [],
      error: "At least one file ID is required",
    };
  }

  // Limit batch size to prevent abuse (B2 supports up to 1000 per batch)
  if (fileIds.length > 1000) {
    return {
      isValid: false,
      validIds: [],
      error: "Maximum 1000 files can be deleted at once",
    };
  }

  const validIds: string[] = [];
  const invalidIds: string[] = [];

  fileIds.forEach((fileId: unknown) => {
    if (typeof fileId === "string" && fileId.trim() !== "") {
      // Basic validation
      if (
        fileId.length <= 255 &&
        !fileId.includes("..") &&
        !fileId.includes("//")
      ) {
        validIds.push(fileId.trim());
      } else {
        invalidIds.push(fileId);
      }
    } else {
      invalidIds.push(String(fileId));
    }
  });

  if (invalidIds.length > 0) {
    return {
      isValid: false,
      validIds: [],
      error: `Invalid file IDs found: ${invalidIds.slice(0, 5).join(", ")}${
        invalidIds.length > 5 ? "..." : ""
      }`,
    };
  }

  return { isValid: true, validIds };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();

  try {
    console.log("Delete All Files: Starting batch file deletion process");

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ("error" in authResult) {
      console.log("Delete All Files: Auth failed:", authResult.error);
      return NextResponse.json(
        {
          success: false,
          message: authResult.error,
        },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log("Delete All Files: Auth successful for user:", user.email);

    // Parse request body
    const body = await request.json();
    const { fileIds } = body;

    // Validate file IDs
    const validation = validateFileIds(fileIds);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    console.log("Delete All Files: Processing batch deletion:", {
      fileCount: validation.validIds.length,
      requestedBy: user.email,
    });

    // Create B2 client
    const b2Client = createB2Client();

    console.log(
      "Delete All Files: Deleting files from Backblaze B2 using batch operation"
    );

    // Use the new batch delete method for much better performance
    const batchResult = await b2Client.batchDeleteFiles(validation.validIds);

    const processingTime = Date.now() - startTime;

    console.log(
      `Delete All Files: Batch deletion completed by admin: ${user.email}`,
      {
        totalRequested: validation.validIds.length,
        successCount: batchResult.totalDeleted,
        failureCount: batchResult.totalFailed,
        processingTime: `${processingTime}ms`,
        deletedFiles: batchResult.deletedFiles.slice(0, 10), // Log first 10 for reference
        failedFiles: batchResult.failedFiles.slice(0, 10),
      }
    );

    // Determine response based on results
    if (batchResult.totalDeleted === 0 && batchResult.totalFailed > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete any files",
          data: {
            deletedFiles: batchResult.deletedFiles,
            deletedCount: batchResult.totalDeleted,
            failedFiles: batchResult.failedFiles,
            failedCount: batchResult.totalFailed,
            deletedAt: new Date().toISOString(),
            processingTime,
          },
        },
        { status: 500 }
      );
    }

    // Partial success or complete success
    const isCompleteSuccess = batchResult.totalFailed === 0;
    const message = isCompleteSuccess
      ? `Successfully deleted all ${batchResult.totalDeleted} files in ${processingTime}ms`
      : `Partially successful: deleted ${batchResult.totalDeleted} files, failed to delete ${batchResult.totalFailed} files`;

    return NextResponse.json({
      success: batchResult.success,
      message,
      data: {
        deletedFiles: batchResult.deletedFiles,
        deletedCount: batchResult.totalDeleted,
        failedFiles: batchResult.failedFiles,
        failedCount: batchResult.totalFailed,
        deletedAt: new Date().toISOString(),
        processingTime,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Batch file deletion error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("BACKBLAZE")) {
        return NextResponse.json(
          {
            success: false,
            message: "Cloud storage configuration error",
            data: {
              deletedFiles: [],
              deletedCount: 0,
              failedFiles: [],
              failedCount: 0,
              deletedAt: new Date().toISOString(),
              processingTime,
            },
          },
          { status: 500 }
        );
      }

      if (error.message.includes("JSON")) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid request format",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete files",
        error: error instanceof Error ? error.message : "Unknown error",
        data: {
          deletedFiles: [],
          deletedCount: 0,
          failedFiles: [],
          failedCount: 0,
          deletedAt: new Date().toISOString(),
          processingTime,
        },
      },
      { status: 500 }
    );
  }
}
