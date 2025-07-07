// /app/api/admin/upload-image/delete-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary.config";
import SessionCache from "@/models/sessionCacheModel";
import { getSchoolDBConnection } from "@/lib/database";

// Cloudinary list resources result interface
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
}

interface CloudinaryListResult {
  resources: CloudinaryResource[];
  next_cursor?: string;
}

// Cloudinary delete result interface
interface CloudinaryDeleteResult {
  deleted: { [key: string]: "deleted" | "not_found" };
  deleted_counts: {
    [key: string]: number;
  };
  partial: boolean;
}

// Cloudinary API response interface
interface CloudinaryApiResponse {
  result?: string;
  [key: string]: unknown;
}


// Verify admin authorization using session-based auth (matching AdminContext pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();

  console.log("Delete All Images: Starting auth verification");

  // Try to get session from cookie first (matching your AdminContext pattern)
  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    console.log(
      "Delete All Images: Checking session from cookie:",
      sessionId.substring(0, 8) + "..."
    );

    const activeSession = await SessionCache.findActiveSession(
      sessionId,
      "uuid"
    );

    if (activeSession) {
      console.log("Delete All Images: Active session found via cookie");

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
      console.log("Delete All Images: Checking Bearer token as fallback");
      // Try to find session by token
      const activeSession = await SessionCache.findActiveSession(
        token,
        "sessionToken"
      );

      if (activeSession) {
        console.log("Delete All Images: Active session found via Bearer token");

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
      console.error("Delete All Images: Error checking Bearer token:", error);
    }
  }

  return { error: "No valid session found", status: 401 };
}

// Helper function to get all resources from a folder
function getResourcesFromFolder(
  folderPath: string
): Promise<CloudinaryListResult> {
  return new Promise((resolve, reject) => {
    cloudinary.api.resources(
      {
        type: "upload",
        prefix: folderPath,
        max_results: 500, // Adjust based on your needs
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary list resources error:", error);
          reject(error);
        } else {
          resolve(result as CloudinaryListResult);
        }
      }
    );
  });
}

// Helper function to delete resources by public IDs
function deleteResourcesByPublicIds(
  publicIds: string[]
): Promise<CloudinaryDeleteResult> {
  return new Promise((resolve, reject) => {
    cloudinary.api.delete_resources(publicIds, (error, result) => {
      if (error) {
        console.error("Cloudinary batch delete error:", error);
        reject(error);
      } else {
        console.log("Cloudinary batch delete result:", result);
        resolve(result as CloudinaryDeleteResult);
      }
    });
  });
}

// Helper function to delete entire folder
function deleteFolderByPath(
  folderPath: string
): Promise<CloudinaryApiResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.api.delete_folder(
      folderPath,
      (error: unknown, result: CloudinaryApiResponse) => {
        if (error) {
          console.error("Cloudinary delete folder error:", error);
          reject(error);
        } else {
          console.log("Cloudinary delete folder result:", result);
          resolve(result);
        }
      }
    );
  });
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("Delete All Images: Starting bulk deletion process");

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ("error" in authResult) {
      console.log("Delete All Images: Auth failed:", authResult.error);
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log("Delete All Images: Auth successful for user:", user.email);

    // Parse request body to get optional folder parameter
    let folderPath = "university-logos"; // Default folder
    let deleteFolder = false;

    try {
      const body = await request.json();
      if (body.folder) {
        folderPath = body.folder;
      }
      if (body.deleteFolder) {
        deleteFolder = body.deleteFolder;
      }
    } catch {
      // If no body or parsing fails, use defaults
      console.log("Delete All Images: Using default folder path");
    }

    console.log("Delete All Images: Target folder:", folderPath);

    // Get all resources from the specified folder
    const listResult = await getResourcesFromFolder(folderPath);

    if (!listResult.resources || listResult.resources.length === 0) {
      return NextResponse.json(
        {
          message: "No images found in the specified folder",
          success: true,
          deletedCount: 0,
          folder: folderPath,
        },
        { status: 200 }
      );
    }

    console.log(
      `Delete All Images: Found ${listResult.resources.length} images to delete`
    );

    // Extract public IDs
    const publicIds = listResult.resources.map(
      (resource) => resource.public_id
    );

    // Delete all resources in batches (Cloudinary has a limit of 100 per request)
    const batchSize = 100;
    let totalDeleted = 0;
    let totalFailed = 0;
    const failedDeletions: string[] = [];

    for (let i = 0; i < publicIds.length; i += batchSize) {
      const batch = publicIds.slice(i, i + batchSize);

      try {
        console.log(
          `Delete All Images: Processing batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(publicIds.length / batchSize)}`
        );

        const deleteResult = await deleteResourcesByPublicIds(batch);

        // Count successful deletions
        for (const [publicId, status] of Object.entries(deleteResult.deleted)) {
          if (status === "deleted") {
            totalDeleted++;
          } else {
            totalFailed++;
            failedDeletions.push(publicId);
          }
        }
      } catch (error) {
        console.error(
          `Delete All Images: Error deleting batch starting at index ${i}:`,
          error
        );
        totalFailed += batch.length;
        failedDeletions.push(...batch);
      }
    }

    // Optionally delete the folder itself if it's empty and requested
    if (deleteFolder && totalDeleted > 0) {
      try {
        await deleteFolderByPath(folderPath);
        console.log(
          `Delete All Images: Folder ${folderPath} deleted successfully`
        );
      } catch (error) {
        console.log(
          `Delete All Images: Could not delete folder ${folderPath}:`,
          error
        );
      }
    }

    console.log(
      `Bulk deletion completed by admin: ${user.email}, Deleted: ${totalDeleted}, Failed: ${totalFailed}`
    );

    return NextResponse.json(
      {
        message: `Bulk deletion completed. ${totalDeleted} images deleted successfully.`,
        success: true,
        deletedCount: totalDeleted,
        failedCount: totalFailed,
        failedDeletions:
          failedDeletions.length > 0 ? failedDeletions : undefined,
        folder: folderPath,
        deletedBy: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Bulk deletion error:", error);

    // Handle specific Cloudinary errors
    if (error instanceof Error) {
      if (error.message.includes("Invalid folder")) {
        return NextResponse.json(
          {
            message: "Invalid folder path",
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
        message: "Failed to delete images",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
