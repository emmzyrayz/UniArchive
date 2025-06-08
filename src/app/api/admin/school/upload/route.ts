// /app/api/admin/school/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSchoolDBConnection } from '@/lib/database';
import School from "@/models/schoolModel";
import SessionCache from "@/models/sessionCacheModel";

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

// Updated auth function to handle both cookie and Bearer token (consistent with your pattern)
async function verifyAdminAuth(request: NextRequest) {
  await getSchoolDBConnection();
  
  // Try to get session from cookie first (matching your adminContext pattern)
  const sessionId = request.cookies.get('sessionId')?.value;
  
  if (sessionId) {
    console.log('School Upload: Checking session from cookie:', sessionId.substring(0, 8) + '...');
    
    const activeSession = await SessionCache.findActiveSession(sessionId, 'uuid');
    
    if (activeSession) {
      console.log('School Upload: Active session found via cookie');
      
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
          role: activeSession.role,
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
        console.log('School Upload: Active session found via Bearer token');
        
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
            role: activeSession.role,
            fullName: activeSession.fullName
          }, 
          session: activeSession 
        };
      }
    } catch (error) {
      console.error('School Upload: Error checking Bearer token:', error);
    }
  }
  
  return { error: "No valid session found", status: 401 };
}

// POST request to upload university data
export async function POST(request: NextRequest) {
  try {
    await getSchoolDBConnection();

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      console.log('School Upload: Auth failed:', authResult.error);
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    console.log('School Upload: Auth successful for user:', user.email);

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