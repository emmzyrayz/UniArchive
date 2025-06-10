// app/api/public/universities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import School from '@/models/schoolModel';
import { unstable_cache } from 'next/cache';

// Define interfaces for the transformed data
interface TransformedDepartment {
  id: string;
  name: string;
}

interface TransformedFaculty {
  id: string;
  name: string;
  departmentsCount: number;
  departments: TransformedDepartment[];
}

interface TransformedUniversity {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string;
  logoUrl: string;
  foundingYear?: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  membership: 'public' | 'private';
  level: 'federal' | 'state';
  usid: string;
  psid: string;
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  facultiesCount: number;
  departmentsCount: number;
  faculties: TransformedFaculty[];
}

// Define interface for MongoDB document structure
interface MongoUniversity {
  _id: {
    toString(): string;
  };
  name: string;
  description: string;
  location: string;
  website: string;
  logoUrl: string;
  foundingYear?: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  membership: 'public' | 'private';
  level: 'federal' | 'state';
  usid: string;
  psid: string;
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  faculties?: Array<{
    _id: { toString(): string };
    name: string;
    departments?: Array<{
      _id: { toString(): string };
      name: string;
    }>;
  }>;
}

// Define interface for query
interface UniversityQuery {
  status: string;
  membership?: string;
  level?: string;
  $or?: Array<{
    name?: { $regex: string; $options: string };
    location?: { $regex: string; $options: string };
  }>;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const membership = searchParams.get('membership'); // 'public' or 'private'
    const level = searchParams.get('level'); // 'federal' or 'state'
    const limitParam = searchParams.get('limit') || '100';
    const limit = parseInt(limitParam);

    // Build query - only active universities
    const query: UniversityQuery = { status: 'active' };
    
    // Add membership filter if provided
    if (membership && ['public', 'private'].includes(membership)) {
      query.membership = membership;
    }
    
    // Add level filter if provided (only for public universities)
    if (level && ['federal', 'state'].includes(level)) {
      query.level = level;
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Cache function for fetching universities
    const getCachedUniversities = unstable_cache(
      async (searchQuery: UniversityQuery, limitCount: number) => {
        return await School.find(searchQuery)
          .select([
            'name', 'description', 'location', 'website', 'logoUrl', 
            'foundingYear', 'status', 'membership', 'level', 'usid', 
            'psid', 'motto', 'chancellor', 'viceChancellor', 'createdAt', 
            'updatedAt', 'createdBy', 'faculties'
          ])
          .limit(limitCount)
          .sort({ name: 1 })
          .lean();
      },
      ['public-universities', JSON.stringify(query), limit.toString()],
      { revalidate: 3600 } // Cache for 1 hour
    );

    // Fetch universities with populated faculties and departments
    const universities = await getCachedUniversities(query, limit) as unknown as MongoUniversity[];

    // Transform data to match frontend interface
    const transformed: TransformedUniversity[] = universities.map((uni: MongoUniversity) => {
      const faculties = (uni.faculties || []).map((faculty) => ({
        id: faculty._id.toString(),
        name: faculty.name,
        departmentsCount: faculty.departments?.length || 0,
        departments: (faculty.departments || []).map((dept) => ({
          id: dept._id.toString(),
          name: dept.name
        }))
      }));

      const totalDepartments = faculties.reduce((sum, faculty) => sum + faculty.departmentsCount, 0);

      return {
        id: uni._id.toString(),
        name: uni.name,
        description: uni.description,
        location: uni.location,
        website: uni.website,
        logoUrl: uni.logoUrl,
        foundingYear: uni.foundingYear,
        status: uni.status,
        membership: uni.membership,
        level: uni.level,
        usid: uni.usid,
        psid: uni.psid,
        motto: uni.motto,
        chancellor: uni.chancellor,
        viceChancellor: uni.viceChancellor,
        createdAt: uni.createdAt,
        updatedAt: uni.updatedAt,
        createdBy: uni.createdBy,
        facultiesCount: faculties.length,
        departmentsCount: totalDepartments,
        faculties
      };
    });

    return NextResponse.json({
      success: true,
      count: transformed.length,
      universities: transformed,
      meta: {
        total: transformed.length,
        limit,
        hasSearch: !!search,
        filters: {
          membership,
          level
        }
      }
    });

  } catch (error) {
    console.error('Public universities data error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch universities data',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}