// /api/user/sessionupload/route.ts - Fixed version with UUID in all responses

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

    // Check if user already has an active session
    const existingSession = await SessionCache.findActiveSession(userId, 'userId');
    
    if (existingSession) {
      console.log("SessionUpload: Found existing session, checking if it needs refresh");

      console.log("SessionUpload: userData received:", userData);
console.log("SessionUpload: userData.level:", userData.level);
      
      // Calculate time difference in hours
      const now = new Date();
      const lastActivity = new Date(existingSession.lastActivity);
      const hoursDifference = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      console.log(`SessionUpload: Hours since last activity: ${hoursDifference}`);
      
      // If more than 1-2 hours have passed, refresh the session
      if (hoursDifference >= 1) {
        console.log("SessionUpload: Session timeout exceeded 1 hour, refreshing session");
        
        // Check if session has completely expired (beyond recovery)
        const expiresAt = new Date(existingSession.expiresAt);
        
        if (now > expiresAt) {
          console.log("SessionUpload: Session completely expired, creating new session");
          
          // Delete the expired session
          await SessionCache.deleteOne({ uuid: existingSession.uuid });
        } else {
          console.log("SessionUpload: Session still recoverable, updating timeout and activity");
          
          // Update the existing session with new timeout, activity, and potentially updated user data
          const newExpiresAt = new Date();
          newExpiresAt.setHours(newExpiresAt.getHours() + (24 * 7)); // 7 days from now
          
          // Update session with fresh user data and metadata
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
          
          // Update encrypted fields if they've changed
          if (userData.phone) {
            updateData.phone = SessionCache.encryptSensitiveData(userData.phone);
            updateData.phoneHash = SessionCache.hashForSearch(userData.phone);
          }
          
          if (userData.regNumber) {
            updateData.regNumber = SessionCache.encryptSensitiveData(userData.regNumber);
            updateData.regNumberHash = SessionCache.hashForSearch(userData.regNumber);
          }
          
          await SessionCache.findOneAndUpdate(
            { uuid: existingSession.uuid },
            updateData,
            { new: true }
          );
          
          console.log("SessionUpload: Existing session updated successfully");
          
          // FIXED: Include UUID in the response
          return NextResponse.json(
            {
              message: "Session refreshed successfully",
              sessionInfo: {
                uuid: existingSession.uuid, // ✅ Added missing UUID
                sessionToken: existingSession.sessionToken,
                refreshed: true,
                newExpiresAt: newExpiresAt
              }
            },
            { status: 200 }
          );
        }
      } else {
        console.log("SessionUpload: Session still active within timeout, updating activity and user data only");
        console.log("Refreshed session UUID:", existingSession.uuid);
        
        // Update activity and potentially changed user data
        const updateData = {
          lastActivity: now,
          updatedAt: now,
          
          // Update user data fields that might have changed
          fullName: userData.fullName,
          profilePhoto: userData.profilePhoto,
          role: userData.role,
          isVerified: userData.isVerified,
          level: userData.level,
        };
        
        await SessionCache.findOneAndUpdate(
          { uuid: existingSession.uuid },
          updateData
        );
        
        console.log("SessionUpload: Session activity updated");
        
        // FIXED: Include UUID in the response
        return NextResponse.json(
          {
            message: "Session activity updated",
            sessionInfo: {
              uuid: existingSession.uuid, // ✅ Added missing UUID
              refreshed: false
            }
          },
          { status: 200 }
        );
      }
    }

    // Create new session with complete user data
    console.log("SessionUpload: Creating new session with full user data");
    console.log("SessionUpload: userData received:", userData);
console.log("SessionUpload: userData.level:", userData.level);
    
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
      );

      console.log("SessionUpload: New comprehensive session created successfully with UUID:", newSession.uuid);
      
      // Update user's last login time
      await User.findByIdAndUpdate(userId, { 
        updatedAt: new Date() 
      });

      // Clean up old expired sessions (optional - run periodically)
      SessionCache.cleanupExpiredSessions().catch((err: Error) => 
        console.error("SessionUpload: Session cleanup error:", err)
      );

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
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const uuid = searchParams.get('uuid');
    
    if (!userId && !uuid) {
      return NextResponse.json(
        { message: "userId or uuid parameter is required" },
        { status: 400 }
      );
    }
    
    let session;
    if (uuid) {
      session = await SessionCache.findByUUID(uuid);
    } else if (userId) {
      session = await SessionCache.findActiveSession(userId, 'userId');
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