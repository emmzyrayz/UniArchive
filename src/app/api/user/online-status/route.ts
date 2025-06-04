// /api/user/online-status/route.ts - Fixed version with proper error handling

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
import SessionCache from "@/models/sessionCacheModel";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

interface JWTPayload {
  user: {
    id: string;
    email: string;
    fullName: string;
    school: string;
    faculty: string;
    department: string;
    uuid: string;
    upid: string;
    role: string;
    isVerified: boolean;
    profilePhoto?: string;
    phone?: string;
    regNumber?: string;
    level: string;
  };
  sessionToken: string;
  iat?: number;
  exp?: number;
}

interface UserData {
  id: string;
  fullName: string;
  role: string;
  school: string;
  faculty: string;
  department: string;
  upid: string;
  isVerified: boolean;
  profilePhoto?: string;
  dob: Date;
  gender: 'Male' | 'Female' | 'Other';
  email?: string;
  phone?: string;
  regNumber?: string;
  level: string;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const sessionUUID = cookieStore.get("sessionId")?.value;

    console.log("Session UUID from cookie:", sessionUUID);

    // Try to get JWT token from Authorization header
    let token: string | null = null;
    const authorization = request.headers.get('Authorization');
    
    if (authorization && authorization.startsWith('Bearer ')) {
      token = authorization.substring(7);
    }

    if (!token && !sessionUUID) {
      return NextResponse.json(
        { 
          message: "No authentication provided",
          isOnline: false,
          hasValidSession: false
        },
        { status: 401 }
      );
    }

    let decoded: JWTPayload | null = null;
    
    // Try to decode JWT if available
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        console.log("JWT decoded successfully for user:", decoded.user.email);
      } catch (jwtError) {
        console.log("JWT verification failed:", jwtError instanceof Error ? jwtError.message : 'Unknown error');
        // Continue with UUID-based session check
      }
    }

    // Check session using different methods
    let activeSession = null;

    // Method 1: Try finding by UUID from cookie
    if (sessionUUID) {
      console.log("UUID not found, trying sessionToken:", sessionUUID.substring(0, 8) + "...");
      try {
        activeSession = await SessionCache.findActiveSession(sessionUUID, 'uuid');
        if (!activeSession) {
          console.log("No active session found by UUID, trying as sessionToken");
          activeSession = await SessionCache.findActiveSession(sessionUUID, 'sessionToken');
        }
      } catch (error) {
        console.log("Error finding session by UUID:", error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Method 2: Try finding by sessionToken from JWT
    if (!activeSession && decoded?.sessionToken) {
      console.log("SessionToken not found, trying userId:", decoded.user.id);
      try {
        activeSession = await SessionCache.findActiveSession(decoded.sessionToken, 'sessionToken');
      } catch (error) {
        console.log("Error finding session by sessionToken:", error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Method 3: Try finding by userId from JWT
    if (!activeSession && decoded?.user?.id) {
      try {
        activeSession = await SessionCache.findActiveSession(decoded.user.id, 'userId');
      } catch (error) {
        console.log("Error finding session by userId:", error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log("Active session found via JWT:", activeSession ? "Yes" : "No");

    if (!activeSession) {
      return NextResponse.json(
        {
          message: "No active session found",
          isOnline: false,
          hasValidSession: false
        },
        { status: 404 }
      );
    }

    // Check if session is still valid
    const now = new Date();
    const isSessionValid = activeSession.isActive && 
                          activeSession.isSignedIn && 
                          new Date(activeSession.expiresAt) > now;

    console.log("Session is active and valid");

    if (!isSessionValid) {
      return NextResponse.json(
        {
          message: "Session expired or inactive",
          isOnline: false,
          hasValidSession: false,
          sessionExpired: true
        },
        { status: 401 }
      );
    }

    // Update last activity
    await SessionCache.findOneAndUpdate(
      { uuid: activeSession.uuid },
      { 
        lastActivity: now,
        updatedAt: now
      }
    );

    // Prepare user data - handle decryption safely
    const userData: UserData = {
      id: activeSession.userId,
      fullName: activeSession.fullName,
      role: activeSession.role,
      school: activeSession.school,
      faculty: activeSession.faculty,
      department: activeSession.department,
      upid: activeSession.upid,
      isVerified: activeSession.isVerified,
      profilePhoto: activeSession.profilePhoto,
      dob: activeSession.dob,
      gender: activeSession.gender,
      level: activeSession.level
    };

    // Safely decrypt sensitive data
    try {
      if (activeSession.email) {
        userData.email = SessionCache.decryptSensitiveData(activeSession.email);
      }
    } catch (error) {
      console.log("Failed to decrypt email:", error instanceof Error ? error.message : 'Unknown error');
      // Don't include email if decryption fails
    }

    try {
      if (activeSession.phone) {
        userData.phone = SessionCache.decryptSensitiveData(activeSession.phone);
      }
    } catch (error) {
      console.log("Failed to decrypt phone:", error instanceof Error ? error.message : 'Unknown error');
      // Don't include phone if decryption fails
    }

    try {
      if (activeSession.regNumber) {
        userData.regNumber = SessionCache.decryptSensitiveData(activeSession.regNumber);
      }
    } catch (error) {
      console.log("Failed to decrypt regNumber:", error instanceof Error ? error.message : 'Unknown error');
      // Don't include regNumber if decryption fails
    }

    return NextResponse.json(
      {
        message: "User is online",
        isOnline: true,
        hasValidSession: true,
        user: userData,
        sessionInfo: {
          uuid: activeSession.uuid,
          lastActivity: activeSession.lastActivity,
          expiresAt: activeSession.expiresAt,
          deviceInfo: activeSession.deviceInfo,
          ipAddress: activeSession.ipAddress
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Online status check error:", error);

    // Handle specific decryption errors
    if (error instanceof Error && error.message.includes("Invalid initialization vector")) {
      console.error("Decryption IV error - possibly corrupted session data");
      return NextResponse.json(
        {
          message: "Session data corrupted, please log in again",
          isOnline: false,
          hasValidSession: false,
          sessionCorrupted: true
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message: "Internal server error",
        isOnline: false,
        hasValidSession: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}