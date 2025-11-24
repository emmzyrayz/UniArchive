// /app/api/admin/school/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSchoolDBConnection } from "@/lib/database";
import School from "@/models/schoolModel";
import SessionCache from "@/models/sessionCacheModel";

// Define proper types
type UserRole = 'admin' | 'superadmin' | 'contributor' | 'student' | 'mod';
type Ownership = 'public' | 'private' | 'federal' | 'state';
type SchoolLevel = "federal" | "state";
type SchoolStatus = 'active' | 'inactive' | 'pending' | 'suspended';

interface Faculty {
  id: string;
  name: string;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
}

interface Campus{
   id: string;
  name: string;
  location: string;
  type: 'main' | 'branch' | 'satellite';
}

interface SchoolDocument {
  id: string;
  name: string;
  description: string;
  location: string;
  website?: string;
  logoUrl?: string;
  foundingYear?: number;
  status: SchoolStatus;
  membership: Ownership;
  level: SchoolLevel;
  usid: string; // Unique School ID
  psid: string; // Platform School ID (human-readable)
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  campuses: Campus[];
  faculties: Faculty[];
  facultiesCount: number;
  departmentsCount: number;
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
}

interface QueryFilter {
  status?: SchoolStatus | { $in: SchoolStatus[] };
  location?: { $regex: string; $options: string };
  membership?: Ownership;
  level?: SchoolLevel;
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
  name?: { $regex: string; $options: string };
  foundingYear?: { $gte?: number; $lte?: number };
  'faculties.name'?: { $regex: string; $options: string };
  'faculties.departments.name'?: { $regex: string; $options: string };
  createdAt?: { $gte?: Date; $lte?: Date };
}

interface SortOptions {
  [key: string]: 1 | -1;
}

// Updated auth function to match the upload route pattern
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();
  
  // Try to get session from cookie first (matching your adminContext pattern)
  const sessionId = request.cookies.get('sessionId')?.value;
  
  if (sessionId) {
    console.log('School View: Checking session from cookie:', sessionId.substring(0, 8) + '...');
    
    const activeSession = await SessionCache.findActiveSession(sessionId, 'uuid');
    
    if (activeSession) {
      console.log('School View: Active session found via cookie');
      
      // Check if user has admin privileges
      if (activeSession.role !== 'admin' && activeSession.role !== 'mod') {
        return { error: "Insufficient privileges. Admin access required", status: 403 };
      }
      
      // Return the session data with user info extracted
      return { 
        user: {
          _id: activeSession.userId,
          id: activeSession.userId,
          email: activeSession.getDecryptedUserData().email,
          role: activeSession.role as UserRole,
          fullName: activeSession.fullName
        }, 
        session: activeSession 
      };
    }
  }
  
  // Fallback to Bearer token if no cookie session
  const authorization = request.headers.get('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7);
    
    try {
      // Try to find session by token
      const activeSession = await SessionCache.findActiveSession(token, 'sessionToken');
      
      if (activeSession) {
        console.log('School View: Active session found via Bearer token');
        
        // Check if user has admin privileges
        if (activeSession.role !== 'admin' && activeSession.role !== 'mod') {
          return { error: "Insufficient privileges. Admin access required", status: 403 };
        }
        
        // Return the session data with user info extracted
        return { 
          user: {
            _id: activeSession.userId,
            id: activeSession.userId,
            email: activeSession.getDecryptedUserData().email,
            role: activeSession.role as UserRole,
            fullName: activeSession.fullName
          }, 
          session: activeSession 
        };
      }
    } catch (error) {
      console.error('School View: Error checking Bearer token:', error);
    }
  }
  
  return { error: "No valid session found", status: 401 };
}

// GET request to fetch universities
export async function GET(request: NextRequest) {
  try {
    await getSchoolDBConnection();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      console.log('School View: Auth failed:', authResult.error);
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log('School View: Auth successful for user:', user.email);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const location = searchParams.get('location') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const membership = searchParams.get('membership') as Ownership | null;
    const level = searchParams.get('level') as SchoolLevel | null;

    // Build query with proper typing
    const query: QueryFilter = {};
    
    if (status) {
      query.status = status as SchoolStatus;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'faculties.name': { $regex: search, $options: 'i' } },
        { 'faculties.departments.name': { $regex: search, $options: 'i' } }
      ];
    }

    if (membership) {
      query.membership = membership;
    }

    if (level) {
      query.level = level;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object with proper typing
    const sort: SortOptions = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [universities, totalCount] = await Promise.all([
      School.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      School.countDocuments(query)
    ]);

    // Calculate statistics
    const stats = await School.aggregate([
      {
        $group: {
          _id: null,
          totalUniversities: { $sum: 1 },
          activeUniversities: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalFaculties: {
            $sum: { $size: '$faculties' }
          },
          totalDepartments: {
            $sum: {
              $sum: {
                $map: {
                  input: '$faculties',
                  as: 'faculty',
                  in: { $size: '$$faculty.departments' }
                }
              }
            }
          }
        }
      }
    ]);

    const statistics = stats[0] || {
      totalUniversities: 0,
      activeUniversities: 0,
      totalFaculties: 0,
      totalDepartments: 0
    };

    // Transform universities data for response with proper typing
    const transformedUniversities = (universities as unknown as SchoolDocument[]).map(uni => ({
      id: uni.id,
      name: uni.name,
      description: uni.description,
      location: uni.location,
      website: uni.website,
      logoUrl: uni.logoUrl,
      foundingYear: uni.foundingYear,
      status: uni.status,
      membership: uni.membership,
      level: uni.level,
      createdAt: uni.createdAt,
      updatedAt: uni.updatedAt,
      createdBy: uni.createdBy,
      facultiesCount: uni.faculties.length,
      departmentsCount: uni.faculties.reduce((total: number, faculty: Faculty) => 
        total + faculty.departments.length, 0
      ),
      faculties: uni.faculties.map(faculty => ({
        id: faculty.id,
        name: faculty.name,
        departmentsCount: faculty.departments.length,
        departments: faculty.departments
      })),
       motto: uni.motto ,
      chancellor: uni.chancellor,
      viceChancellor: uni.viceChancellor
    }));

    const totalPages = Math.ceil(totalCount / limit);

    console.log(`School View: Returning ${transformedUniversities.length} universities`);

    return NextResponse.json(
      {
        message: "Universities fetched successfully",
        success: true,
        universities: transformedUniversities,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        statistics,
        filters: {
          search,
          location,
          status,
          sortBy,
          sortOrder
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Fetch universities error:", error);
    return NextResponse.json(
      { 
        message: "Internal server error", 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST request for advanced search/filtering
export async function POST(request: NextRequest) {
  try {
    await getSchoolDBConnection();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      console.log('School View POST: Auth failed:', authResult.error);
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log('School View POST: Auth successful for user:', user.email);

    const body = await request.json();
    const {
      filters = {},
      pagination = { page: 1, limit: 10 },
      sort = { field: 'createdAt', order: 'desc' }
    } = body;

    // Build advanced query with proper typing
    const query: QueryFilter = {};

    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }

    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters.status && Array.isArray(filters.status)) {
      query.status = { $in: filters.status as SchoolStatus[] };
    }

    if (filters.ownership) {
      query.membership = filters.ownership;
    }

    if (filters.level) {
      query.level = filters.level;
    }

    if (filters.foundingYearRange) {
      query.foundingYear = {};
      if (filters.foundingYearRange.min) {
        query.foundingYear.$gte = filters.foundingYearRange.min;
      }
      if (filters.foundingYearRange.max) {
        query.foundingYear.$lte = filters.foundingYearRange.max;
      }
    }

    if (filters.facultyName) {
      query['faculties.name'] = { $regex: filters.facultyName, $options: 'i' };
    }

    if (filters.departmentName) {
      query['faculties.departments.name'] = { $regex: filters.departmentName, $options: 'i' };
    }

    if (filters.createdDateRange) {
      query.createdAt = {};
      if (filters.createdDateRange.from) {
        query.createdAt.$gte = new Date(filters.createdDateRange.from);
      }
      if (filters.createdDateRange.to) {
        query.createdAt.$lte = new Date(filters.createdDateRange.to);
      }
    }

    // Pagination
    const skip = (pagination.page - 1) * pagination.limit;

    // Sort with proper typing
    const sortObj: SortOptions = {};
    sortObj[sort.field] = sort.order === 'desc' ? -1 : 1;

    // Execute query
    const [universities, totalCount] = await Promise.all([
      School.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(pagination.limit)
        .lean(),
      School.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / pagination.limit);

    return NextResponse.json(
      {
        message: "Advanced search completed successfully",
        success: true,
        universities,
        pagination: {
          currentPage: pagination.page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: pagination.limit,
          hasNextPage: pagination.page < totalPages,
          hasPrevPage: pagination.page > 1
        },
        appliedFilters: filters
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Advanced search error:", error);
    return NextResponse.json(
      { 
        message: "Internal server error", 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}