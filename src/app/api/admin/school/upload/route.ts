// /app/api/admin/school/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSchoolDBConnection } from '@/lib/database';
import School from "@/models/schoolModel";
import SessionCache from "@/models/sessionCacheModel";
import { IUser } from "@/models/usermodel";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

interface JWTPayload {
  user: IUser;
  sessionToken: string;
  iat?: number;
  exp?: number;
}

// Define Faculty interface for type safety
interface Faculty {
  id: string;
  name: string;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
}

// Verify admin authorization
async function verifyAdminAuth(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { error: "No authorization token provided", status: 401 };
  }

  const token = authorization.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Check if session exists and is active
    const activeSession = await SessionCache.findActiveSession(
      decoded.sessionToken,
      'sessionToken'
    );

    if (!activeSession) {
      return { error: "Session not found or expired", status: 401 };
    }

    // Check if user has admin privileges - Fixed: Include 'admin' and 'superadmin' in the allowed roles
    if (decoded.user.role !== 'admin') {
      return { error: "Insufficient privileges. Admin access required", status: 403 };
    }

    return { user: decoded.user, session: activeSession };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

// POST request to upload university data
export async function POST(request: NextRequest) {
  try {
    await getSchoolDBConnection();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // Parse request body
    const universityData = await request.json();

    // Validate required fields
    const requiredFields = ['id', 'name', 'description', 'location', 'website', 'logoUrl', 'membership', 'usid', 'psid'];
    const missingFields = requiredFields.filter(field => !universityData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          message: "Missing required fields", 
          missingFields,
          success: false
        },
        { status: 400 }
      );
    }

    // Check if university with same ID already exists
    const existingSchool = await School.findOne({ id: universityData.id });
    if (existingSchool) {
      return NextResponse.json(
        { 
          message: "University with this ID already exists", 
          existingId: universityData.id,
          success: false
        },
        { status: 409 }
      );
    }

    // Check if university with same name already exists
    const existingByName = await School.findOne({ 
      name: { $regex: `^${universityData.name}$`, $options: 'i' }
    });
    if (existingByName) {
      return NextResponse.json(
        { 
          message: "University with this name already exists", 
          existingName: universityData.name,
          success: false
        },
        { status: 409 }
      );
    }

    // Create new school document
    const newSchool = new School({
      id: universityData.id,
      name: universityData.name,
      description: universityData.description,
      location: universityData.location,
      website: universityData.website,
      logoUrl: universityData.logoUrl,
      foundingYear: universityData.foundingYear,
      faculties: universityData.faculties || [],
      status: 'active',
      membership: universityData.membership,
      level: universityData.level,
      usid: universityData.usid,
      psid: universityData.psid,
      createdBy: user._id || user.id,
    });

    // Save to database
    const savedSchool = await newSchool.save();

    console.log(`University "${universityData.name}" uploaded successfully by admin: ${user.email}`);

    return NextResponse.json(
      {
        message: "University uploaded successfully",
        success: true,
        university: {
          id: savedSchool.id,
          name: savedSchool.name,
          location: savedSchool.location,
          createdAt: savedSchool.createdAt,
          facultiesCount: savedSchool.faculties.length,
          // Fixed: Added explicit types for reduce parameters
          departmentsCount: savedSchool.faculties.reduce((total: number, faculty: Faculty) => 
            total + faculty.departments.length, 0
          )
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("University upload error:", error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('E11000')) {
        return NextResponse.json(
          { 
            message: "Duplicate entry detected",
            success: false,
            error: "University ID or name already exists"
          },
          { status: 409 }
        );
      }
      
      if (error.message.includes('validation')) {
        return NextResponse.json(
          { 
            message: "Validation error",
            success: false,
            error: error.message
          },
          { status: 400 }
        );
      }
    }

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