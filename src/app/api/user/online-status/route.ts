import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
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

// GET request to check if user is online
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header
    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: "No authorization token provided", isOnline: false },
        { status: 401 }
      );
    }

    const token = authorization.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return NextResponse.json(
        { message: "Invalid token", isOnline: false },
        { status: 401 }
      );
    }

    // Check if session exists and is active in database
     // Fixed: Using standard Mongoose findOne method
    const activeSession = await SessionCache.findActiveSession(
      decoded.sessionToken,
      'sessionToken'
    );

    console.log("Active session found:", activeSession ? "Yes" : "No");


    if (!activeSession) {
      console.log("Session not found or expired");
      return NextResponse.json(
        { 
          message: "Session not found or expired", 
          isOnline: false,
          sessionExpired: true
        },
        { status: 401 }
      );
    }

    // Update last activity
     // Fixed: Using standard Mongoose findOneAndUpdate method
    // Update last activity
     try {
      await SessionCache.updateActivity(decoded.sessionToken);
      console.log("Last activity updated successfully");
    } catch (updateError) {
      console.error("Failed to update last activity:", updateError);
      // Don't fail the request if update fails
    }

    // Decrypt email for response (if needed)
    let decryptedEmail;
    try {
      decryptedEmail = SessionCache.decryptSensitiveData(activeSession.email);
    } catch (decryptError) {
      console.error("Failed to decrypt email:", decryptError);
      decryptedEmail = "encrypted";
    }


    return NextResponse.json(
      {
        message: "User is online",
        isOnline: true,
        user: decoded.user,
        sessionInfo: {
           signInTime: activeSession.signInTime,
          lastActivity: activeSession.lastActivity,
          expiresAt: activeSession.expiresAt,
          deviceInfo: activeSession.deviceInfo,
          email: decryptedEmail
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Online status check error:", error);
    return NextResponse.json(
      { 
        message: "Internal server error", 
        isOnline: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST request to check online status for specific user (admin use)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, email, sessionToken } = body;

    if (!userId && !email && !sessionToken) {
      return NextResponse.json(
        { message: "userId, email, or sessionToken is required" },
        { status: 400 }
      );
    }

    let activeSession;
    
    if (sessionToken) {
      activeSession = await SessionCache.findActiveSession(sessionToken, 'sessionToken');
    } else if (userId) {
      activeSession = await SessionCache.findActiveSession(userId, 'userId');
    } else if (email) {
      activeSession = await SessionCache.findActiveSession(email, 'email');
    }

    if (!activeSession) {
      return NextResponse.json(
        {
          message: "User is not online",
          isOnline: false
        },
        { status: 200 }
      );
    }

    // Decrypt sensitive data for response
    let decryptedEmail;
    try {
      decryptedEmail = SessionCache.decryptSensitiveData(activeSession.email);
    } catch (decryptError) {
      console.error("Failed to decrypt email:", decryptError);
      decryptedEmail = "encrypted";
    }

    return NextResponse.json(
      {
        message: "User is online",
        isOnline: true,
        sessionInfo: {
          userId: activeSession.userId,
          email: decryptedEmail,
          signInTime: activeSession.signInTime,
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
    return NextResponse.json(
      { 
        message: "Internal server error", 
        isOnline: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}