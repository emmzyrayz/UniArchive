// /api/admin/material/update/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectUniPlatformDB } from '@/lib/database';
import { PdfMaterial, ImageMaterial, VideoMaterial, addEditRecord } from '@/models/materialModel';
import type { MaterialInput } from '@/models/materialModel';

// Define the update object type
interface MaterialUpdateObject {
  materialTitle?: string;
  materialDescription?: string;
  tags?: string[];
  keywords?: string[];
  tableOfContent?: string[];
  isPublic?: boolean;
  topic?: string;
  moderatorNotes?: string;
  pdfUrl?: string;
  imageUrls?: string[];
  totalImages?: number;
  videoUrl?: string;
  status?: string;
  isApproved?: boolean;
  updatedAt?: Date;
}

// Helper function to get the correct model based on material type
const getMaterialModel = (materialType: string) => {
  switch (materialType) {
    case 'PDF':
      return PdfMaterial;
    case 'IMAGE':
      return ImageMaterial;
    case 'VIDEO':
      return VideoMaterial;
    default:
      throw new Error(`Invalid material type: ${materialType}`);
  }
};

// Helper function to find material across all collections
const findMaterialById = async (materialId: string) => {
  let material = await PdfMaterial.findById(materialId);
  if (material) return { material, type: 'PDF' };
  
  material = await ImageMaterial.findById(materialId);
  if (material) return { material, type: 'IMAGE' };
  
  material = await VideoMaterial.findById(materialId);
  if (material) return { material, type: 'VIDEO' };
  
  return null;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to UniPlatformDB
    await connectUniPlatformDB();

    const materialId = (await params).id;
    const updateData: Partial<MaterialInput> = await req.json();

    // Validate material ID
    if (!materialId) {
      return NextResponse.json(
        {
          message: "Material ID is required",
        },
        { status: 400 }
      );
    }

    // Find the material across all collections
    const result = await findMaterialById(materialId);

    if (!result) {
      return NextResponse.json(
        {
          message: "Material not found",
        },
        { status: 404 }
      );
    }

    const { material, type } = result;
    const MaterialModel = getMaterialModel(type);

    // Track changed fields for edit history
    const changedFields: string[] = [];
    const allowedUpdateFields = [
      "materialTitle",
      "materialDescription",
      "tags",
      "keywords",
      "tableOfContent",
      "isPublic",
      "topic",
      "moderatorNotes",
    ];

    // Build update object with only allowed fields
    const updateObject: MaterialUpdateObject = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedUpdateFields.includes(key) && value !== undefined) {
        // Check if value actually changed
        if (
          JSON.stringify(material[key as keyof typeof material]) !==
          JSON.stringify(value)
        ) {
          (updateObject as Record<string, unknown>)[key] = value;
          changedFields.push(key);
        }
      }
    }

    // Handle special cases for different material types
    if (
      type === "PDF" &&
      updateData.pdfUrl &&
      updateData.pdfUrl !== material.pdfUrl
    ) {
      updateObject.pdfUrl = updateData.pdfUrl;
      changedFields.push("pdfUrl");
    }

    if (
      type === "IMAGE" &&
      updateData.imageUrls &&
      JSON.stringify(updateData.imageUrls) !==
        JSON.stringify(material.imageUrls)
    ) {
      updateObject.imageUrls = updateData.imageUrls;
      updateObject.totalImages = updateData.imageUrls.length;
      changedFields.push("imageUrls");
    }

    if (
      type === "VIDEO" &&
      updateData.videoUrl &&
      updateData.videoUrl !== material.videoUrl
    ) {
      updateObject.videoUrl = updateData.videoUrl;
      changedFields.push("videoUrl");
    }

    // If no fields changed, return early
    if (changedFields.length === 0) {
      return NextResponse.json(
        {
          message: "No changes detected",
          material: material,
        },
        { status: 200 }
      );
    }

    // Handle status changes for contributors (reset approval if contributor edits)
    if (updateData.uploaderRole === "contributor" && changedFields.length > 0) {
      updateObject.status = "PENDING";
      updateObject.isApproved = false;
      changedFields.push("status", "isApproved");
    }

    // Add update timestamp
    updateObject.updatedAt = new Date();

    // Update the material
    const updatedMaterial = await MaterialModel.findByIdAndUpdate(
      materialId,
      { $set: updateObject },
      { new: true, runValidators: true }
    );

    if (!updatedMaterial) {
      return NextResponse.json(
        {
          message: "Failed to update material",
        },
        { status: 500 }
      );
    }

    // Add edit record to track changes
    if (
      updateData.uploaderUpid &&
      updateData.uploaderName &&
      updateData.uploaderRole
    ) {
      await addEditRecord(materialId, type, {
        editedBy: updateData.uploaderUpid,
        editedByName: updateData.uploaderName,
        editedByRole: updateData.uploaderRole as
          | "admin"
          | "mod"
          | "contributor",
        changedFields,
        reason: updateData.moderatorNotes || "Material updated",
      });
    }

    return NextResponse.json(
      {
        message: "Material updated successfully",
        material: {
          _id: updatedMaterial._id,
          materialTitle: updatedMaterial.materialTitle,
          materialType: updatedMaterial.materialType,
          status: updatedMaterial.status,
          isApproved: updatedMaterial.isApproved,
          updatedAt: updatedMaterial.updatedAt,
          version: updatedMaterial.version,
        },
        changedFields,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Material update error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update material";
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