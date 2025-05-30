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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header or request body
    let token: string | null = null;
    
    const authorization = request.headers.get('Authorization');
    if (authorization && authorization.startsWith('Bearer ')) {
      token = authorization.substring(7);
    } else {
      // Fallback: check request body
      const body = await request.json();
      token = body.token;
    }

    if (!token) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 400 }
      );
    }

    // Verify JWT token to get session token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      console.log("JWT verification failed, but proceeding with logout");
      return NextResponse.json(
        { message: "Logged out successfully" },
        { status: 200 }
      );
    }

    // Invalidate the session in database
    if (decoded.sessionToken) {
      const result = await SessionCache.invalidateSession(decoded.sessionToken);
      
      
      if (result) {
        console.log("Session invalidated:", decoded.sessionToken);
      } else {
        console.log("Session not found or already invalidated");
      }
    }

    return NextResponse.json(
      { 
        message: "Logged out successfully",
        sessionInvalidated: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Logout error:", error);
    
    // Even if there's an error, we should still consider it a successful logout
    return NextResponse.json(
      { 
        message: "Logged out successfully",
        note: "Session cleanup may have failed, but logout completed"
      },
      { status: 200 }
    );
  }
}

// DELETE method for logging out all sessions for a user
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }

    // Invalidate all sessions for this user
    const result = await SessionCache.deleteMany({ 
      userId: decoded.user.id 
    });

    return NextResponse.json(
      { 
        message: "All sessions logged out successfully",
        sessionsInvalidated: result.deletedCount
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Logout all sessions error:", error);
    return NextResponse.json(
      { 
        message: "Error logging out all sessions",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}