// /api/admin/material/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectUniPlatformDB } from '@/lib/database';
import { PdfMaterial, ImageMaterial, VideoMaterial } from '@/models/materialModel';
import { Document } from 'mongoose';

interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
  courseId?: string;
  uploaderUpid?: string;
  status?: string;
  materialType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Define the query filter type
interface QueryFilter {
  courseId?: string;
  uploaderUpid?: string;
  status?: string;
  $or?: Array<{
    materialTitle?: { $regex: string; $options: string };
    materialDescription?: { $regex: string; $options: string };
    uploaderName?: { $regex: string; $options: string };
    courseName?: { $regex: string; $options: string };
    tags?: { $in: RegExp[] };
    keywords?: { $in: RegExp[] };
  }>;
}

// Define sort option type
interface SortOption {
  [key: string]: 1 | -1;
}

// Define the lean document type (what .lean() returns)
// type LeanMaterialDocument = Record<string, any>;

export async function GET(req: NextRequest) {
  try {
    // Connect to UniPlatformDB
    await connectUniPlatformDB();
    
    const { searchParams } = new URL(req.url);
    
    // Parse query parameters
    const params: FetchParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      search: searchParams.get('search') || undefined,
      courseId: searchParams.get('courseId') || undefined,
      uploaderUpid: searchParams.get('uploaderUpid') || undefined,
      status: searchParams.get('status') || undefined,
      materialType: searchParams.get('materialType') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Validate parameters
    const validSortFields = ['createdAt', 'updatedAt', 'materialTitle', 'averageRating', 'totalViews'];
    if (params.sortBy && !validSortFields.includes(params.sortBy)) {
      return NextResponse.json({
        message: `Invalid sortBy field. Must be one of: ${validSortFields.join(', ')}`
      }, { status: 400 });
    }

    if (params.materialType && !['PDF', 'IMAGE', 'VIDEO'].includes(params.materialType)) {
      return NextResponse.json({
        message: 'Invalid materialType. Must be PDF, IMAGE, or VIDEO'
      }, { status: 400 });
    }

    // Build query filter
    const buildQuery = (): QueryFilter => {
      const query: QueryFilter = {};
      
      if (params.courseId) query.courseId = params.courseId;
      if (params.uploaderUpid) query.uploaderUpid = params.uploaderUpid;
      if (params.status) query.status = params.status.toUpperCase();
      
      // Search functionality
      if (params.search) {
        query.$or = [
          { materialTitle: { $regex: params.search, $options: 'i' } },
          { materialDescription: { $regex: params.search, $options: 'i' } },
          { uploaderName: { $regex: params.search, $options: 'i' } },
          { courseName: { $regex: params.search, $options: 'i' } },
          { tags: { $in: [new RegExp(params.search, 'i')] } },
          { keywords: { $in: [new RegExp(params.search, 'i')] } }
        ];
      }
      
      return query;
    };

    const query = buildQuery();
    const sortOption: SortOption = {};
    sortOption[params.sortBy!] = params.sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = ((params.page || 1) - 1) * (params.limit || 10);

    let materials: Document[] = [];
    let totalCount = 0;

    // Fetch from specific material type or all types
    if (params.materialType) {
      const MaterialModel = params.materialType === 'PDF' ? PdfMaterial :
                            params.materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
      
      const [docs, count] = await Promise.all([
        MaterialModel.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(params.limit || 10),
          // .lean(),
        MaterialModel.countDocuments(query)
      ]);
      
      materials = docs;
      totalCount = count;
    } else {
      // Fetch from all material types
      const [pdfDocs, imageDocs, videoDocs, pdfCount, imageCount, videoCount] = await Promise.all([
        PdfMaterial.find(query).sort(sortOption),
        ImageMaterial.find(query).sort(sortOption),
        VideoMaterial.find(query).sort(sortOption),
        PdfMaterial.countDocuments(query),
        ImageMaterial.countDocuments(query),
        VideoMaterial.countDocuments(query)
      ]);

      // Combine and sort all materials
      const allMaterials = [...pdfDocs, ...imageDocs, ...videoDocs];
      allMaterials.sort((a, b) => {
        const aValue = a[params.sortBy!];
        const bValue = b[params.sortBy!];
        
        if (params.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination to combined results
      materials = allMaterials.slice(skip, skip + (params.limit || 10));
      totalCount = pdfCount + imageCount + videoCount;
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / (params.limit || 10));
    const currentPage = params.page || 1;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Calculate statistics
    const [pdfStats, imageStats, videoStats] = await Promise.all([
      PdfMaterial.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } }
        }}
      ]),
      ImageMaterial.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } }
        }}
      ]),
      VideoMaterial.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } }
        }}
      ])
    ]);

    const stats = {
      totalMaterials: (pdfStats[0]?.total || 0) + (imageStats[0]?.total || 0) + (videoStats[0]?.total || 0),
      approvedMaterials: (pdfStats[0]?.approved || 0) + (imageStats[0]?.approved || 0) + (videoStats[0]?.approved || 0),
      pendingMaterials: (pdfStats[0]?.pending || 0) + (imageStats[0]?.pending || 0) + (videoStats[0]?.pending || 0)
    };

    return NextResponse.json({
      materials,
      pagination: {
        currentPage,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: params.limit || 10,
        hasNextPage,
        hasPrevPage
      },
      statistics: stats,
      message: 'Materials fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Material fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch materials';
    
    return NextResponse.json({ 
      message: errorMessage,
      materials: [],
      pagination: null,
      statistics: null
    }, { status: 500 });
  }
}