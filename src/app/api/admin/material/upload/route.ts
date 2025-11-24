// /api/admin/material/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectUniPlatformDB } from "@/lib/database";
import {
  PdfMaterial,
  ImageMaterial,
  VideoMaterial,
  generateMUID,
  generatePMUID,
  addApprovalRecord,
} from "@/models/materialModel";
import type {
  MaterialInput,
  IComment,
  IRating,
  IEditRecord,
} from "@/models/materialModel";

// Helper function to get the correct model based on material type
const getMaterialModel = (materialType: string) => {
  switch (materialType) {
    case "PDF":
      return PdfMaterial;
    case "IMAGE":
      return ImageMaterial;
    case "VIDEO":
      return VideoMaterial;
    default:
      throw new Error(`Invalid material type: ${materialType}`);
  }
};

const headers = new Headers({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

// Type for the incoming request data
interface MaterialUploadData extends Partial<MaterialInput> {
  materialTitle: string;
  materialType: "PDF" | "IMAGE" | "VIDEO" | "TEXT";
  courseId: string;
  materialUrl?: string;
  fileName?: string;
  cloudFileName?: string;
  cloudPublicId?: string;
  mimeType?: string;
  fileSize?: number;
  uploaderName: string;
  uploaderUpid: string;
  uploaderRole: "admin" | "mod" | "contributor" | undefined;
  courseName: string;
  departmentName?: string;
  facultyName?: string;
  schoolName?: string;
}

// Type for the material data to be saved
interface MaterialCreateData extends Partial<MaterialInput> {
  muid: string;
  pmuid: string;
  fileSize: number;
  format: string;
  originalFileName: string;
  pdfUrl?: string;
  imageUrls?: string[];
  totalImages?: number;
  videoUrl?: string;
  isApproved: boolean;
  isPublic: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED" | undefined;
  tableOfContent: string[];
  tags: string[];
  keywords: string[];
  comments: IComment[];
  ratings: IRating[];
  averageRating: number;
  totalRatings: number;
  reportCount: number;
  isReported: boolean;
  version: number;
  editHistory: IEditRecord[];
  topic: string;
  createdAt: Date;
  departmentName: string;
  facultyName: string;
  schoolName: string;
}

export async function POST(req: NextRequest) {
  try {
    // Connect to UniPlatformDB
    await connectUniPlatformDB();

    let data: MaterialUploadData;
    const contentType = req.headers.get("content-type") || "";
    

    try {
      if (contentType.includes("multipart/form-data")) {
        // Handle FormData
        console.log("Processing FormData request");
        const formData = await req.formData();

        const getFormValue = (key: string): string | undefined => {
          const value = formData.get(key);
          if (typeof value === "string") {
            return value;
          }
          return undefined;
        };

        // Add field mapping for client-server differences
        const fieldMappings: Record<string, string> = {
          course: "courseName",
          uploader: "uploaderName",
          department: "departmentName",
          faculty: "facultyName",
          school: "schoolName",
          // Add other field mappings if needed
        };

        const getMappedValue = (key: string) => {
          const mappedKey = fieldMappings[key] || key;
          return getFormValue(mappedKey);
        };

        const getFormArray = (key: string): string[] => {
          const value = getFormValue(key);
          if (!value) return [];

          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
          }
        };

        const getFormNumber = (key: string): number => {
          const value = getFormValue(key);
          return value ? parseInt(value, 10) || 0 : 0;
        };

        const getFormBoolean = (key: string): boolean => {
          const value = getFormValue(key);
          return value === "true";
        };

        // Build the data object with proper typing
        data = {
          materialTitle: getMappedValue("materialTitle") || "",
          materialType:
            (getMappedValue("materialType") as
              | "PDF"
              | "IMAGE"
              | "VIDEO"
              | "TEXT") || "PDF",
          courseId: getMappedValue("courseId") || "",
          materialUrl: getFormValue("pdfUrl"),
          pdfUrl: getFormValue("pdfUrl"),
          fileName: getFormValue("courseName"),
          cloudFileName: getFormValue("fileName"),
          mimeType: getFormValue("mimeType"),
          fileSize: getFormNumber("fileSize"),
          uploaderName: getFormValue("uploaderName") || "",
          uploaderUpid: getFormValue("uploaderUpid") || "",
          uploaderRole: getFormValue("uploaderRole") as
            | "admin"
            | "mod"
            | "contributor"
            | undefined,
          courseName: getFormValue("courseName") || "",
          materialDescription: getFormValue("materialDescription"),
          tags: getFormArray("tags"),
          keywords: getFormArray("keywords"),
          tableOfContent: getFormArray("tableOfContent"),
          isApproved: getFormBoolean("isApproved"),
          isPublic: getFormBoolean("isPublic"),
          status: getFormValue("status") as
            | "PENDING"
            | "APPROVED"
            | "REJECTED"
            | "ARCHIVED"
            | undefined,
          departmentName: getFormValue("departmentName"),
          facultyName: getFormValue("facultyName"),
          schoolName: getFormValue("schoolName"),
        };

        console.error("Received data:", data);

        console.log("Parsed FormData:", Object.keys(data));
        console.log("FormData values after parsing:", {
          materialTitle: data.materialTitle,
          courseId: data.courseId,
          uploaderName: data.uploaderName,
          uploaderUpid: data.uploaderUpid,
          uploaderRole: data.uploaderRole,
          courseName: data.courseName,
          departmentName: data.departmentName,
          facultyName: data.facultyName,
          schoolName: data.schoolName,
        });
      } else if (contentType.includes("application/json")) {
        // Handle JSON
        console.log("Processing JSON request");
        const rawBody = await req.text();
        console.log("Raw request body:", rawBody.substring(0, 200));

        if (!rawBody.trim()) {
          return NextResponse.json(
            {
              message: "Request body is empty",
            },
            { status: 400 }
          );
        }

        data = JSON.parse(rawBody);
      } else {
        return NextResponse.json(
          {
            message:
              "Unsupported content type. Expected application/json or multipart/form-data",
            received: contentType,
          },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error("Request parsing error:", parseError);
      return NextResponse.json(
        {
          message: "Failed to parse request data",
          error:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parsing error",
          contentType,
        },
        { status: 400 }
      );
    }

    // FIXED: Validation - Required fields with proper empty string checking
    const requiredFields: (keyof MaterialUploadData)[] = [
      "materialTitle",
      "materialType",
      "courseId",
      "uploaderName",
      "uploaderUpid",
      "uploaderRole",
      "courseName",
      "departmentName",
      "facultyName",
      "schoolName",
    ];

    // Check for missing or empty required fields
    const missingFields = requiredFields.filter((field) => {
      const value = data[field];
      return !value || (typeof value === "string" && value.trim() === "");
    });

    console.error("Missing or empty required fields:", missingFields);

    if (missingFields.length > 0) {
      console.error("Missing or empty required fields:", missingFields);
      console.error("Received data keys:", Object.keys(data));
      console.error(
        "Received data values:",
        Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = typeof value === "string" ? `"${value}"` : value;
          return acc;
        }, {} as Record<string, unknown>)
      );

      return NextResponse.json(
        {
          message: "Missing or empty required fields",
          missingFields,
          receivedData: Object.keys(data),
          fieldValues: requiredFields.reduce((acc, field) => {
            acc[field] = data[field];
            return acc;
          }, {} as Record<string, unknown>),
        },
        { status: 400 }
      );
    }

    // Validate material type
    if (!["PDF", "IMAGE", "VIDEO"].includes(data.materialType!)) {
      return NextResponse.json(
        {
          message: "Invalid material type. Must be PDF, IMAGE, or VIDEO",
        },
        { status: 400 }
      );
    }

    // Get the appropriate model
    const MaterialModel = getMaterialModel(data.materialType!);

    // Generate unique identifiers
    const muid = generateMUID();
    const pmuid = generatePMUID(data.materialType!);

    // Prepare material data with proper typing
    const materialData: MaterialCreateData = {
      ...data,
      muid,
      pmuid,

      // File metadata - use provided or defaults
      fileSize: data.fileSize || 0,
      format: data.mimeType?.split("/")[1] || "unknown",
      originalFileName: data.fileName || "unknown",

      // Status and approval defaults
      isApproved: data.isApproved ?? false,
      isPublic: data.isPublic ?? true,
      status: data.status || "PENDING",

      // Content organization defaults
      tableOfContent: data.tableOfContent || [],
      tags: data.tags || [],
      keywords: data.keywords || [],

      // Analytics and ratings defaults
      comments: [],
      ratings: [],
      averageRating: 0,
      totalRatings: 0,
      reportCount: 0,
      isReported: false,

      // Version control
      version: 1,
      editHistory: [],

      // Required topic field for all material types
      topic: data.materialDescription || data.materialTitle || "General",

      // Timestamps
      createdAt: new Date(),
      departmentName: data.departmentName || "Unknown Department",
      facultyName: data.facultyName || "Unknown Faculty",
      schoolName: data.schoolName || "Unknown School",
    };

    // Set URL based on material type
    if (data.materialType === "PDF" && data.materialUrl) {
      materialData.pdfUrl = data.materialUrl;
    } else if (data.materialType === "IMAGE" && data.materialUrl) {
      materialData.imageUrls = [data.materialUrl];
      materialData.totalImages = 1;
    } else if (data.materialType === "VIDEO" && data.materialUrl) {
      materialData.videoUrl = data.materialUrl;
    }

    console.log("Creating material with data:", {
      muid: materialData.muid,
      pmuid: materialData.pmuid,
      materialTitle: materialData.materialTitle,
      materialType: materialData.materialType,
      uploaderUpid: materialData.uploaderUpid,
    });

    // Create the material
    const newMaterial = await MaterialModel.create(materialData);

    // Add initial approval record
    await addApprovalRecord(newMaterial._id.toString(), data.materialType!, {
      actionType: "SUBMITTED",
      performedBy: data.uploaderUpid!,
      performedByName: data.uploaderName!,
      performedByRole: data.uploaderRole!,
      notes: "Initial material submission",
    });

    console.log("Material created successfully:", newMaterial._id);

    return NextResponse.json(
      {
        success: true,
        message: "Material uploaded successfully",
        material: {
          _id: newMaterial._id,
          muid: newMaterial.muid,
          pmuid: newMaterial.pmuid,
          materialTitle: newMaterial.materialTitle,
          materialType: newMaterial.materialType,
          status: newMaterial.status,
          isApproved: newMaterial.isApproved,
        },
      },
      {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Material upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload material";
    const errorDetails =
      error instanceof Error && "errors" in error
        ? (error as Error & { errors?: unknown }).errors
        : null;

    return NextResponse.json(
      {
        message: errorMessage,
        errorDetails,
      },
      { status: 500 }
    );
  }
}