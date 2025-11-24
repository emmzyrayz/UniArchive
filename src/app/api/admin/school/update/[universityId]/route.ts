import { NextRequest, NextResponse } from "next/server";
import { getSchoolDBConnection } from '@/lib/database';
import School from "@/models/schoolModel";
import SessionCache from "@/models/sessionCacheModel";

// Use same auth function as other endpoints
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ universityId: string }> }) {
  try {
    await getSchoolDBConnection();
    const universityId = (await params).universityId;

    console.log('PUT request received for university:', universityId);

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status }
      );
    }

    // const { user } = authResult;
    const updateData = await request.json();

    console.log('Update data received:', JSON.stringify(updateData, null, 2));


    // Find university by ID
    const university = await School.findOne({ id: universityId });
    if (!university) {
      console.log('University not found:', universityId);
      return NextResponse.json(
        { message: "University not found", success: false },
        { status: 404 }
      );
    }

    console.log('Found university:', university.name);

    // Update fields
    const allowedUpdates = [
      'name', 'description', 'location', 'website', 'logoUrl', 'foundingYear',
      'faculties', 'campuses', 'membership', 'level', 'motto',
      'chancellor', 'viceChancellor'
    ];

    let hasUpdates = false;
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== university[field]) {
        console.log(`Updating ${field}: ${university[field]} -> ${updateData[field]}`);
        university[field] = updateData[field];
        hasUpdates = true;
      }
    });

    if (!hasUpdates) {
      return NextResponse.json(
        { message: "No changes detected", success: true },
        { status: 200 }
      );
    }

    university.updatedAt = new Date();

     // Add validation before saving
    if (!university.name || !university.location) {
      return NextResponse.json(
        { message: "Name and location are required", success: false },
        { status: 400 }
      );
    }

    await university.save();
    console.log('University saved successfully');

     // Return full university data for state update
    const updatedUniversity = await School.findOne({ id: universityId }).populate('faculties.departments');


    return NextResponse.json(
      {
       message: "University updated successfully",
        success: true,
        university: updatedUniversity
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("University update error:", error);
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