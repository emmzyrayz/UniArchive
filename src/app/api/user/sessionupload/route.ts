// /api/user/sessionupload/route.ts - Fixed version with proper TypeScript types

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
import User from "@/models/usermodel";
import SessionCache from "@/models/sessionCacheModel";

// Define interfaces for better type safety
interface UserData {
  fullName: string;
  email: string;
  dob: string | Date; // Allow both string and Date to handle incoming data
  phone: string;
  gender: "Male" | "Female" | "Other";
  role: "admin" | "contributor" | "student" | "mod" | "devsupport";
  school: string;
  faculty: string;
  department: string;
  regNumber: string;
  level: string;
  upid: string;
  isVerified: boolean;
  profilePhoto?: string;
}

interface RequestBody {
  userId: string;
  email: string;
  userData: UserData;
  sessionToken: string;
  deviceInfo?: string;
  ipAddress?: string;
}

interface SessionUpdateData {
  lastActivity: Date;
  expiresAt: Date;
  deviceInfo: string;
  ipAddress: string;
  updatedAt: Date;
  fullName: string;
  dob: string | Date;
  gender: "Male" | "Female" | "Other";
  profilePhoto?: string;
  role: "admin" | "contributor" | "student" | "mod" | "devsupport";
  school: string;
  faculty: string;
  department: string;
  upid: string;
  isVerified: boolean;
  phone?: string;
  phoneHash?: string;
  regNumber?: string;
  regNumberHash?: string;
  level: string;
}

// Define MongoDB filter interface
interface MongoFilter {
  userId: string;
  uuid?: { $ne: string };
}

// Define session document interface (extend as needed based on your model)
interface SessionDocument {
  uuid: string;
  userId: string;
  sessionToken: string;
  isActive: boolean;
  isSignedIn: boolean;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
  deviceInfo: string;
  ipAddress: string;
  level: string;
  fullName: string;
  dob: Date;
  gender: "Male" | "Female" | "Other";
  profilePhoto?: string;
  role: "admin" | "contributor" | "student" | "mod" | "devsupport";
  school: string;
  faculty: string;
  department: string;
  upid: string;
  isVerified: boolean;
  phone?: string;
  phoneHash?: string;
  regNumber?: string;
  regNumberHash?: string;
}

// Define MongoDB delete result interface
interface DeleteResult {
  deletedCount: number;
}

// Helper function to extract device/browser info from user agent
function getDeviceInfo(userAgent: string): string {
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Chrome')) return 'Chrome Browser';
  if (userAgent.includes('Firefox')) return 'Firefox Browser';
  if (userAgent.includes('Safari')) return 'Safari Browser';
  return 'Unknown Device';
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Helper function to validate user data
function validateUserData(userData: UserData): { isValid: boolean; missingFields: string[] } {
  const requiredFields: (keyof UserData)[] = [
    'fullName', 'email', 'dob', 'phone', 'gender', 'role', 
    'school', 'faculty', 'department', 'regNumber', 'level', 'upid', 'isVerified'
  ];
  
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (userData[field] === undefined || userData[field] === null || userData[field] === '') {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// FIXED: Enhanced cleanup function to remove ALL sessions for a user
async function cleanupUserSessions(userId: string, excludeUUID?: string): Promise<number> {
  try {
    const filter: MongoFilter = { userId: userId };
    
    // If we want to keep one specific session, exclude it
    if (excludeUUID) {
      filter.uuid = { $ne: excludeUUID };
    }
    
    const result = await SessionCache.deleteMany(filter) as DeleteResult;
    console.log(`SessionUpload: Cleaned up ${result.deletedCount} old sessions for user ${userId}`);
    return result.deletedCount;
  } catch (error) {
    console.error("SessionUpload: Error cleaning up user sessions:", error);
    return 0;
  }
}

// FIXED: Enhanced function to cleanup expired sessions
async function cleanupExpiredSessions(): Promise<number> {
  try {
    const now = new Date();
    const result = await SessionCache.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { isActive: false },
        { isSignedIn: false }
      ]
    }) as DeleteResult;
    console.log(`SessionUpload: Cleaned up ${result.deletedCount} expired/inactive sessions`);
    return result.deletedCount;
  } catch (error) {
    console.error("SessionUpload: Error cleaning up expired sessions:", error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("SessionUpload: Starting session upload process");
    
    await connectDB();
    console.log("SessionUpload: Database connected");

    const body: RequestBody = await request.json();
    const { userId, email, userData, sessionToken, deviceInfo: providedDeviceInfo, ipAddress: providedIpAddress } = body;

    console.log("SessionUpload: Received data for userId:", userId);
    console.log("SessionUpload: User level received:", userData.level);

    // Validate required fields
    if (!userId || !email || !userData || !sessionToken) {
      console.error("SessionUpload: Missing required fields");
      return NextResponse.json(
        { message: "userId, email, userData, and sessionToken are required" },
        { status: 400 }
      );
    }

    // Validate user data structure
    const validation = validateUserData(userData);
    if (!validation.isValid) {
      console.error("SessionUpload: Invalid user data, missing fields:", validation.missingFields);
      return NextResponse.json(
        { 
          message: `Missing required user data fields: ${validation.missingFields.join(', ')}`,
          missingFields: validation.missingFields
        },
        { status: 400 }
      );
    }

    // Extract request metadata (use provided values or detect from request)
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = providedDeviceInfo || getDeviceInfo(userAgent);
    const ipAddress = providedIpAddress || getClientIP(request);

    console.log("SessionUpload: Device info:", deviceInfo, "IP:", ipAddress);

   // FIXED: First cleanup all expired sessions globally
    await cleanupExpiredSessions();

    // FIXED: Get ALL sessions for this user (not just active ones)
    const existingSessions = await SessionCache.find({ userId: userId }).sort({ createdAt: -1 }) as SessionDocument[];
    
    console.log(`SessionUpload: Found ${existingSessions.length} existing sessions for user ${userId}`);

    const now = new Date();
    let sessionToKeep: SessionDocument | null = null;
    let shouldCreateNew = true;

    // FIXED: Check if any existing session is still valid and recent
    for (const session of existingSessions) {
      const expiresAt = new Date(session.expiresAt);
      const lastActivity = new Date(session.lastActivity);
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      console.log(`SessionUpload: Session ${session.uuid.substring(0, 8)}... - Hours since activity: ${hoursSinceActivity}, Expires: ${expiresAt > now}`);
      
      // If session is still valid (not expired and active within last 2 hours)
      if (expiresAt > now && session.isActive && session.isSignedIn && hoursSinceActivity < 2) {
        console.log("SessionUpload: Found valid recent session, will update it");
        sessionToKeep = session;
        shouldCreateNew = false;
        break;
      }
    }

    // FIXED: Always cleanup all other sessions for this user first
    if (sessionToKeep) {
      await cleanupUserSessions(userId, sessionToKeep.uuid);
    } else {
      await cleanupUserSessions(userId);
    }

    if (sessionToKeep && !shouldCreateNew) {
      // Update the existing valid session
      console.log("SessionUpload: Updating existing valid session");
      
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + (24 * 7)); // 7 days from now
      
      const updateData: SessionUpdateData = {
        lastActivity: now,
        expiresAt: newExpiresAt,
        deviceInfo: deviceInfo,
        ipAddress: ipAddress,
        updatedAt: now,
        
        // Update user data fields (in case they've changed)
        fullName: userData.fullName,
        dob: typeof userData.dob === 'string' ? new Date(userData.dob) : userData.dob,
        gender: userData.gender,
        profilePhoto: userData.profilePhoto,
        role: userData.role,
        school: userData.school,
        faculty: userData.faculty,
        department: userData.department,
        upid: userData.upid,
        isVerified: userData.isVerified,
        level: userData.level,
      };
      
      // Update encrypted fields
      if (userData.phone) {
        updateData.phone = SessionCache.encryptSensitiveData(userData.phone);
        updateData.phoneHash = SessionCache.hashForSearch(userData.phone);
      }
      
      if (userData.regNumber) {
        updateData.regNumber = SessionCache.encryptSensitiveData(userData.regNumber);
        updateData.regNumberHash = SessionCache.hashForSearch(userData.regNumber);
      }
      
      await SessionCache.findOneAndUpdate(
        { uuid: sessionToKeep.uuid },
        updateData,
        { new: true }
      );
      
      console.log("SessionUpload: Existing session updated successfully");
      
      return NextResponse.json(
        {
          message: "Session updated successfully",
          sessionInfo: {
            uuid: sessionToKeep.uuid,
            sessionToken: sessionToKeep.sessionToken,
            refreshed: true,
            newExpiresAt: newExpiresAt
          }
        },
        { status: 200 }
      );
    }

    // FIXED: Create new session (we've already cleaned up all old ones)
    console.log("SessionUpload: Creating new session with full user data");
    
    try {
      // Convert dob to Date if it's a string
      const processedUserData = {
        ...userData,
        dob: typeof userData.dob === 'string' ? new Date(userData.dob) : userData.dob,
        level: userData.level
      };

      const newSession = await SessionCache.createFullSession(
        userId,
        processedUserData,
        sessionToken,
        24 * 7, // 7 days in hours
        deviceInfo,
        ipAddress
      ) as SessionDocument;

      console.log("SessionUpload: New comprehensive session created successfully with UUID:", newSession.uuid);
      
      // Update user's last login time
      await User.findByIdAndUpdate(userId, { 
        updatedAt: new Date() 
      });

      // Clean up old expired sessions (optional - run periodically)
      // FIXED: Final verification - ensure only one session exists for this user
      const finalSessionCount = await SessionCache.countDocuments({ userId: userId });
      console.log(`SessionUpload: Final session count for user ${userId}: ${finalSessionCount}`);
      
      if (finalSessionCount > 1) {
        console.warn(`SessionUpload: WARNING - User ${userId} still has ${finalSessionCount} sessions after cleanup`);
        // Emergency cleanup - keep only the newest session
        const allUserSessions = await SessionCache.find({ userId: userId }).sort({ createdAt: -1 }) as SessionDocument[];
        const sessionsToDelete = allUserSessions.slice(1); // Keep the first (newest), delete the rest
        
        for (const session of sessionsToDelete) {
          await SessionCache.deleteOne({ uuid: session.uuid });
          console.log(`SessionUpload: Emergency cleanup - deleted session ${session.uuid}`);
        }
      }

      return NextResponse.json(
        {
          message: "Session uploaded successfully",
          sessionInfo: {
            uuid: newSession.uuid,
            sessionToken: sessionToken,
            expiresAt: newSession.expiresAt,
            deviceInfo: deviceInfo,
            created: true
          }
        },
        { status: 201 }
      );
      
    } catch (sessionError) {
      console.error("SessionUpload: Failed to create comprehensive session:", sessionError);
      return NextResponse.json(
        { 
          message: "Failed to create session", 
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("SessionUpload: Session upload error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Session upload failed", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET method to check session upload status (optional)
// FIXED: Enhanced GET method with better session checking
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const uuid = searchParams.get('uuid');
    const action = searchParams.get('action');
    
    // Special action to check for duplicate sessions
    if (action === 'check-duplicates' && userId) {
      const userSessions = await SessionCache.find({ userId: userId }) as SessionDocument[];
      const activeSessions = userSessions.filter(s => s.isActive && new Date(s.expiresAt) > new Date());
      
      return NextResponse.json({
        message: "Duplicate check completed",
        userId: userId,
        totalSessions: userSessions.length,
        activeSessions: activeSessions.length,
        hasDuplicates: activeSessions.length > 1,
        sessions: userSessions.map(s => ({
          uuid: s.uuid.substring(0, 8) + "...",
          isActive: s.isActive,
          expiresAt: s.expiresAt,
          lastActivity: s.lastActivity,
          createdAt: s.createdAt
        }))
      }, { status: 200 });
    }
    
    if (!userId && !uuid) {
      return NextResponse.json(
        { message: "userId or uuid parameter is required" },
        { status: 400 }
      );
    }
    
    let session: SessionDocument | null = null;
    if (uuid) {
      session = await SessionCache.findByUUID(uuid) as SessionDocument | null;
    } else if (userId) {
      // Get the most recent active session for the user
      session = await SessionCache.findOne({ 
        userId: userId, 
        isActive: true, 
        isSignedIn: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 }) as SessionDocument | null;
    }
    
    if (!session) {
      return NextResponse.json(
        { message: "Session not found", exists: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        message: "Session found",
        exists: true,
        sessionInfo: {
          uuid: session.uuid,
          userId: session.userId,
          isActive: session.isActive,
          expiresAt: session.expiresAt,
          lastActivity: session.lastActivity,
          deviceInfo: session.deviceInfo,
          level: session.level
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error("SessionUpload: Session check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}