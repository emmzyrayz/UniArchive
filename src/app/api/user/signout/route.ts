// /signout/route.ts - Sign out route using UUID-based session management
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
import SessionCache from "@/models/sessionCacheModel";
import { cookies } from "next/headers";

export async function POST() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    console.log("Processing sign out for session UUID:", sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { message: "No active session found", success: false },
        { status: 400 }
      );
    }

    // Find and invalidate the session
    const session = await SessionCache.findOne({ uuid: sessionId });
    
    if (!session) {
      console.log("Session not found for UUID:", sessionId);
      
      // Create response and clear cookie
      const response = NextResponse.json(
        { message: "Session not found", success: false },
        { status: 404 }
      );
      
      response.cookies.delete("sessionId");
      return response;
    }

    // Update session to mark as signed out and inactive
    await SessionCache.findOneAndUpdate(
      { uuid: sessionId },
      {
        isSignedIn: false,
        isActive: false,
        updatedAt: new Date()
      }
    );

    console.log("User signed out successfully, session UUID:", sessionId);

    // Create response and clear the session cookie
    const response = NextResponse.json(
      {
        message: "Sign out successful",
        success: true
      },
      { status: 200 }
    );

    response.cookies.delete("sessionId");
    return response;

  } catch (error) {
    console.error("Sign out error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Sign out failed", error: error.message, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error", success: false },
      { status: 500 }
    );
  }
}

// GET method to check sign out status or clean up expired sessions
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'cleanup') {
      // Clean up expired sessions
      const deletedCount = await SessionCache.cleanupExpiredSessions();
      
      return NextResponse.json(
        {
          message: `Cleaned up ${deletedCount} expired sessions`,
          deletedCount
        },
        { status: 200 }
      );
    }

    // Default: Check current session status
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { 
          message: "No session cookie found",
          isSignedIn: false,
          hasSession: false
        },
        { status: 200 }
      );
    }

    const session = await SessionCache.findOne({ uuid: sessionId });

    if (!session) {
      // Create response and clear stale cookie
      const response = NextResponse.json(
        {
          message: "Session not found, cookie cleared",
          isSignedIn: false,
          hasSession: false
        },
        { status: 200 }
      );
      
      response.cookies.delete("sessionId");
      return response;
    }

    return NextResponse.json(
      {
        message: "Session status checked",
        isSignedIn: session.isSignedIn && session.isActive,
        hasSession: true,
        sessionInfo: {
          uuid: session.uuid,
          isActive: session.isActive,
          isSignedIn: session.isSignedIn,
          expiresAt: session.expiresAt,
          lastActivity: session.lastActivity
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Sign out status check error:", error);

    return NextResponse.json(
      { 
        message: "Internal server error",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}