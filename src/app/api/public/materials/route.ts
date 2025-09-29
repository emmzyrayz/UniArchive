// /app/api/public/materials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectUniPlatformDB } from "@/lib/database";
import { getMaterialModel } from "@/models/materialModel";

interface PublicMaterialFilter {
  courseId?: string;
  materialType?: string;
  status: string;
  $or?: Array<{
    [key: string]: { $regex: string; $options: string };
  }>;
}

export async function GET(req: NextRequest) {
  try {
    console.log("📚 Public materials API called");

    // Connect to UniPlatformDB
    await connectUniPlatformDB();
    const MaterialModel = await getMaterialModel();

    const { searchParams } = new URL(req.url);
    const filter: PublicMaterialFilter = {
      status: "APPROVED", // Always filter only approved materials for public access
    };

    // Apply filters
    if (searchParams.get("courseId")) {
      filter.courseId = searchParams.get("courseId") as string;
    }

    if (searchParams.get("materialType")) {
      filter.materialType = searchParams.get("materialType") as string;
    }

    // Search filter
    if (searchParams.get("search")) {
      const q = searchParams.get("search") as string;
      filter.$or = [
        { materialTitle: { $regex: q, $options: "i" } },
        { materialDescription: { $regex: q, $options: "i" } },
        { uploaderName: { $regex: q, $options: "i" } },
      ];
    }

    // Pagination - handle limit: 0 as "no limit"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = searchParams.get("limit");
    const limit = limitParam === "0" ? 0 : parseInt(limitParam || "50", 10);

    let query = MaterialModel.find(filter).sort({ createdAt: -1 }).lean();

    // Apply pagination only if limit > 0
    if (limit > 0) {
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);
    }

    // Execute query
    const [total, materials] = await Promise.all([
      MaterialModel.countDocuments(filter),
      query,
    ]);

    console.log("📚 Public Material API Response:", {
      materialsCount: materials.length,
      total,
      filter,
    });

    return NextResponse.json(
      {
        materials,
        pagination: {
          currentPage: page,
          totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
          totalItems: total,
          itemsPerPage: limit || total,
          hasNextPage: limit > 0 ? page < Math.ceil(total / limit) : false,
          hasPrevPage: page > 1,
        },
        statistics: {
          totalMaterials: total,
          approvedMaterials: total,
          pendingMaterials: 0,
        },
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("❌ Public material fetch error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch materials";
    return NextResponse.json(
      {
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
