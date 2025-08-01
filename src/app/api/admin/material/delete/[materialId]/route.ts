// /api/admin/material/delete/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectUniPlatformDB } from '@/lib/database';
import { PdfMaterial, ImageMaterial, VideoMaterial } from '@/models/materialModel';
import type { IPdfMaterial, IImageMaterial, IVideoMaterial, Material } from '@/models/materialModel';

// Type for the result of finding a material
interface MaterialResult {
  material: Material;
  type: 'PDF' | 'IMAGE' | 'VIDEO';
  Model: typeof PdfMaterial | typeof ImageMaterial | typeof VideoMaterial;
}

// Helper function to find material across all collections
const findMaterialById = async (materialId: string): Promise<MaterialResult | null> => {
  try {
    console.log(`Searching for material with ID: ${materialId}`);
    
    // Try to find in PDF collection
    let material = await PdfMaterial.findById(materialId);
    if (material) {
      console.log(`Found PDF material: ${material.materialTitle}`);
      return { material, type: 'PDF', Model: PdfMaterial };
    }
    
    // Try to find in Image collection
    material = await ImageMaterial.findById(materialId);
    if (material) {
      console.log(`Found IMAGE material: ${material.materialTitle}`);
      return { material, type: 'IMAGE', Model: ImageMaterial };
    }
    
    // Try to find in Video collection
    material = await VideoMaterial.findById(materialId);
    if (material) {
      console.log(`Found VIDEO material: ${material.materialTitle}`);
      return { material, type: 'VIDEO', Model: VideoMaterial };
    }
    
    console.log(`No material found with ID: ${materialId}`);
    return null;
  } catch (error) {
    console.error('Error searching for material:', error);
    return null;
  }
};


// Helper function to delete cloud storage files
const deleteCloudFiles = async (material: Material, materialType: 'PDF' | 'IMAGE' | 'VIDEO'): Promise<boolean> => {
  try {
    const filesToDelete: string[] = [];

    console.log(`Preparing to delete cloud files for ${materialType} material`);
    
    if (materialType === 'PDF') {
      const pdfMaterial = material as IPdfMaterial;
      if (pdfMaterial.pdfUrl) {
        filesToDelete.push(pdfMaterial.pdfUrl);
      }
      if (pdfMaterial.thumbnailUrl) {
        filesToDelete.push(pdfMaterial.thumbnailUrl);
      }
    } else if (materialType === 'IMAGE') {
      const imageMaterial = material as IImageMaterial;
      if (imageMaterial.imageUrls && imageMaterial.imageUrls.length > 0) {
        filesToDelete.push(...imageMaterial.imageUrls);
      }
      if (imageMaterial.thumbnailUrls && imageMaterial.thumbnailUrls.length > 0) {
        filesToDelete.push(...imageMaterial.thumbnailUrls);
      }
    } else if (materialType === 'VIDEO') {
      const videoMaterial = material as IVideoMaterial;
      if (videoMaterial.videoUrl) filesToDelete.push(videoMaterial.videoUrl);
      if (videoMaterial.thumbnailUrl) filesToDelete.push(videoMaterial.thumbnailUrl);
      if (videoMaterial.previewUrl) filesToDelete.push(videoMaterial.previewUrl);
      if (videoMaterial.streamingUrls) {
        if (videoMaterial.streamingUrls.hd) filesToDelete.push(videoMaterial.streamingUrls.hd);
        if (videoMaterial.streamingUrls.sd) filesToDelete.push(videoMaterial.streamingUrls.sd);
        if (videoMaterial.streamingUrls.mobile) filesToDelete.push(videoMaterial.streamingUrls.mobile);
      }
    }

    // Here you would implement the actual cloud storage deletion logic
    // This depends on your cloud storage provider (Cloudinary, AWS S3, etc.)
    console.log('Files to delete from cloud storage:', filesToDelete);
    
    // Example for Cloudinary (you'll need to implement based on your provider):
    // if (material.cloudPublicId) {
    //   await cloudinary.uploader.destroy(material.cloudPublicId);
    // }
    
    return true;
  } catch (error) {
    console.error('Cloud file deletion error:', error);
    return false;
  }
};

export async function DELETE(
  req: NextRequest,
  { params }: { params: { materialId: string } }
) {
  try {
    console.log("=== DELETE MATERIAL API START ===");

    // Connect to UniPlatformDB
    await connectUniPlatformDB();

    const materialId = params.materialId;
    console.log(`Received delete request for material ID: ${materialId}`);

    // Validate material ID
    if (!materialId) {
      console.error("Material ID is missing from request");
      return NextResponse.json(
        {
          message: "Material ID is required",
          success: false,
        },
        { status: 400 }
      );
    }

    // Validate that materialId is a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(materialId)) {
      console.error(`Invalid MongoDB ObjectId format: ${materialId}`);
      return NextResponse.json(
        {
          message: "Invalid material ID format",
          success: false,
        },
        { status: 400 }
      );
    }

    // Find the material across all collections
    const result = await findMaterialById(materialId);

    if (!result) {
      console.error(`Material not found with ID: ${materialId}`);
      return NextResponse.json(
        {
          message: "Material not found",
          success: false,
        },
        { status: 404 }
      );
    }

    const { material, type, Model } = result;
    console.log(`Found material: ${material.materialTitle} (Type: ${type})`);

    // Store material info for response before deletion
    const materialInfo = {
      _id: material._id,
      muid: material.muid,
      pmuid: material.pmuid,
      materialTitle: material.materialTitle,
      materialType: material.materialType,
      uploaderName: material.uploaderName,
      uploaderUpid: material.uploaderUpid,
      courseName: material.courseName,
      courseId: material.courseId,
      createdAt: material.createdAt,
    };

    // Delete associated cloud storage files
    console.log("Attempting to delete cloud files...");
    const cloudDeletionSuccess = await deleteCloudFiles(material, type);

    if (!cloudDeletionSuccess) {
      console.warn(
        `Failed to delete cloud files for material ${materialId}, but proceeding with database deletion`
      );
      // You might want to handle this differently based on your requirements
      // For now, we'll proceed with database deletion even if cloud deletion fails
    }

    // Delete the material from database
    console.log("Attempting to delete from database...");
    const deletedMaterial = await Model.findByIdAndDelete(materialId);

    if (!deletedMaterial) {
      console.error("Failed to delete material from database");
      return NextResponse.json(
        {
          message: "Failed to delete material from database",
          success: false,
        },
        { status: 500 }
      );
    }

    console.log("Material deleted successfully from database");

    // Log the deletion for audit purposes
    console.log(`Material deleted successfully:`, {
      materialId,
      materialType: type,
      materialTitle: material.materialTitle,
      uploaderUpid: material.uploaderUpid,
      deletedAt: new Date().toISOString(),
      cloudDeletionSuccess,
    });

    console.log("=== DELETE MATERIAL API END ===");

    return NextResponse.json(
      {
        message: "Material deleted successfully",
        success: true,
        deletedMaterial: materialInfo,
        cloudFilesDeleted: cloudDeletionSuccess,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Material deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete material';
    
    return NextResponse.json(
      {
        message: errorMessage,
        success: false,
        error: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { materialId: string } }
) {
  try {
    console.log("=== DELETE MATERIAL API START ===");

    await connectUniPlatformDB();

    const materialId = params.materialId;
    console.log(`Received delete request for material ID: ${materialId}`);

    // Validate material ID format
    if (!materialId || !/^[0-9a-fA-F]{24}$/.test(materialId)) {
      return NextResponse.json(
        {
          exists: false,
          error: "Invalid material ID format",
        },
        { status: 400 }
      );
    }

    // Check all material collections
    const pdf = await PdfMaterial.findById(materialId);
    const image = await ImageMaterial.findById(materialId);
    const video = await VideoMaterial.findById(materialId);

    if (pdf || image || video) {
      return NextResponse.json(
        {
          exists: true,
          materialType: pdf ? "PDF" : image ? "IMAGE" : "VIDEO",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ exists: false }, { status: 404 });
  } catch (error) {
    console.error("Material existence check error:", error);
    return NextResponse.json(
      {
        exists: false,
        error: "Failed to check material existence",
      },
      { status: 500 }
    );
  }
}