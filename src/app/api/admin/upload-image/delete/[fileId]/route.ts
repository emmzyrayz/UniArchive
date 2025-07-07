// /app/api/admin/upload-image/delete/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary.config";
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from "@/lib/database";

// Cloudinary delete result interface
interface CloudinaryDeleteResult {
  result: "ok" | "not found";
  deleted: { [key: string]: "deleted" | "not_found" };
}

// Verify admin authorization using session-based auth (matching AdminContext pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();

  console.log("Delete Image: Starting auth verification");

  // Try to get session from cookie first (matching your AdminContext pattern)
  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    console.log(
      "Delete Image: Checking session from cookie:",
      sessionId.substring(0, 8) + "..."
    );

    const activeSession = await SessionCache.findActiveSession(
      sessionId,
      "uuid"
    );

    if (activeSession) {
      console.log("Delete Image: Active session found via cookie");

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
  }

  // Fallback to Bearer token if no cookie session (for API compatibility)
  const authorization = request.headers.get("Authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.substring(7);

    try {
      console.log("Delete Image: Checking Bearer token as fallback");
      // Try to find session by token
      const activeSession = await SessionCache.findActiveSession(
        token,
        "sessionToken"
      );

      if (activeSession) {
        console.log("Delete Image: Active session found via Bearer token");

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
      console.error("Delete Image: Error checking Bearer token:", error);
    }
  }

  return { error: "No valid session found", status: 401 };
}

// Helper function to delete from Cloudinary
function deleteFromCloudinary(
  publicId: string
): Promise<CloudinaryDeleteResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error("Cloudinary delete error:", error);
        reject(error);
      } else {
        console.log("Cloudinary delete result:", result);
        resolve(result as CloudinaryDeleteResult);
      }
    });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    console.log("Delete Image: Starting image deletion process");

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ("error" in authResult) {
      console.log("Delete Image: Auth failed:", authResult.error);
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log("Delete Image: Auth successful for user:", user.email);

    // Get the file ID from params
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { message: "No file ID provided" },
        { status: 400 }
      );
    }

    // Validate file ID format (basic validation)
    if (typeof fileId !== "string" || fileId.trim().length === 0) {
      return NextResponse.json(
        { message: "Invalid file ID format" },
        { status: 400 }
      );
    }

    console.log("Delete Image: Attempting to delete file with ID:", fileId);

    // Delete from Cloudinary
    const deleteResult = await deleteFromCloudinary(fileId);

    // Check if the file was actually deleted
    if (deleteResult.result === "not found") {
      return NextResponse.json(
        {
          message: "File not found",
          success: false,
          fileId: fileId,
        },
        { status: 404 }
      );
    }

    // Check if deletion was successful
    const wasDeleted =
      deleteResult.deleted && deleteResult.deleted[fileId] === "deleted";

    if (!wasDeleted) {
      return NextResponse.json(
        {
          message: "File could not be deleted",
          success: false,
          fileId: fileId,
        },
        { status: 400 }
      );
    }

    console.log(
      `Image deleted successfully by admin: ${user.email}, File ID: ${fileId}`
    );

    return NextResponse.json(
      {
        message: "Image deleted successfully",
        success: true,
        fileId: fileId,
        deletedBy: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Image deletion error:", error);

    // Handle specific Cloudinary errors
    if (error instanceof Error) {
      if (error.message.includes("Invalid public_id")) {
        return NextResponse.json(
          {
            message: "Invalid file ID",
            success: false,
          },
          { status: 400 }
        );
      }

      if (error.message.includes("Rate limit")) {
        return NextResponse.json(
          {
            message: "Rate limit exceeded. Please try again later",
            success: false,
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        message: "Failed to delete image",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
