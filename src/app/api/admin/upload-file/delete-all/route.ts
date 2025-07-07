import { NextRequest, NextResponse } from "next/server";
import { createB2Client } from "@/lib/backblaze.b2";
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from "@/lib/database";

interface ApiResponse {
  success: boolean;
  data?: {
    deletedFiles: string[];
    deletedCount: number;
    failedFiles: string[];
    failedCount: number;
    deletedAt: string;
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

  // Limit batch size to prevent abuse
  if (fileIds.length > 100) {
    return {
      isValid: false,
      validIds: [],
      error: "Maximum 100 files can be deleted at once",
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

    console.log("Delete All Files: Deleting files from Backblaze B2");

    // Track successful and failed deletions
    const deletedFiles: string[] = [];
    const failedFiles: string[] = [];

    // Process deletions with some parallelization but not too aggressive
    const batchSize = 10; // Process in smaller batches to avoid overwhelming B2

    for (let i = 0; i < validation.validIds.length; i += batchSize) {
      const batch = validation.validIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (fileId) => {
        try {
          console.log(`Delete All Files: Deleting file ${fileId}`);
          const deleteResult = await b2Client.deleteFile(fileId);

          if (deleteResult.success) {
            deletedFiles.push(fileId);
            console.log(`Delete All Files: Successfully deleted ${fileId}`);
          } else {
            failedFiles.push(fileId);
            console.warn(
              `Delete All Files: Failed to delete ${fileId}:`,
              deleteResult.error
            );
          }
        } catch (error) {
          failedFiles.push(fileId);
          console.error(`Delete All Files: Error deleting ${fileId}:`, error);
        }
      });

      // Wait for current batch to complete before moving to next
      await Promise.all(batchPromises);

      // Small delay between batches to be respectful to B2
      if (i + batchSize < validation.validIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const totalRequested = validation.validIds.length;
    const successCount = deletedFiles.length;
    const failureCount = failedFiles.length;

    console.log(
      `Delete All Files: Batch deletion completed by admin: ${user.email}`,
      {
        totalRequested,
        successCount,
        failureCount,
        deletedFiles: deletedFiles.slice(0, 10), // Log first 10 for reference
        failedFiles: failedFiles.slice(0, 10),
      }
    );

    // Determine response based on results
    if (successCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete any files",
          data: {
            deletedFiles,
            deletedCount: successCount,
            failedFiles,
            failedCount: failureCount,
            deletedAt: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }

    // Partial success or complete success
    const isCompleteSuccess = failureCount === 0;
    const message = isCompleteSuccess
      ? `Successfully deleted all ${successCount} files`
      : `Partially successful: deleted ${successCount} files, failed to delete ${failureCount} files`;

    return NextResponse.json({
      success: true,
      message,
      data: {
        deletedFiles,
        deletedCount: successCount,
        failedFiles,
        failedCount: failureCount,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Batch file deletion error:", error);

    // Handle specific errors
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
      },
      { status: 500 }
    );
  }
}
