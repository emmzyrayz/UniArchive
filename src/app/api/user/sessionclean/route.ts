import { NextRequest, NextResponse } from "next/server";
import { SessionManager } from "@/lib/sessionManagement"; // Adjust path as needed

// GET - Session statistics and info
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication check here for admin access
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await SessionManager.getSessionStats();
        return NextResponse.json({
          message: "Session statistics retrieved",
          data: stats
        }, { status: 200 });

      case 'cleanup':
        const cleanupResult = await SessionManager.cleanupExpiredSessions();
        return NextResponse.json({
          message: "Session cleanup completed",
          deletedCount: cleanupResult.deletedCount
        }, { status: 200 });

      case 'count':
        const count = await SessionManager.getActiveSessionsCount();
        return NextResponse.json({
          message: "Active sessions count retrieved",
          activeSessionsCount: count
        }, { status: 200 });

      default:
        return NextResponse.json({
          message: "Available actions: stats, cleanup, count",
          usage: {
            stats: "GET /api/auth/session-management?action=stats",
            cleanup: "GET /api/auth/session-management?action=cleanup",
            count: "GET /api/auth/session-management?action=count"
          }
        }, { status: 200 });
    }

  } catch (error) {
    console.error("Session management error:", error);
    return NextResponse.json(
      { 
        message: "Session management operation failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Admin operations
export async function POST(request: NextRequest) {
  try {
    // Add authentication check here for admin access
    const body = await request.json();
    const { action, userId, sessionToken, additionalHours } = body;

    switch (action) {
      case 'force-logout-user':
        if (!userId) {
          return NextResponse.json(
            { message: "userId is required for force-logout-user action" },
            { status: 400 }
          );
        }
        
        const userLogoutResult = await SessionManager.forceLogoutUser(userId);
        return NextResponse.json({
          message: "User logged out from all sessions",
          sessionsLoggedOut: userLogoutResult.modifiedCount
        }, { status: 200 });

      case 'force-logout-session':
        if (!sessionToken) {
          return NextResponse.json(
            { message: "sessionToken is required for force-logout-session action" },
            { status: 400 }
          );
        }
        
        const sessionLogoutResult = await SessionManager.forceLogoutSession(sessionToken);
        return NextResponse.json({
          message: sessionLogoutResult ? "Session logged out successfully" : "Session not found or already logged out",
          success: sessionLogoutResult
        }, { status: 200 });

      case 'extend-session':
        if (!sessionToken) {
          return NextResponse.json(
            { message: "sessionToken is required for extend-session action" },
            { status: 400 }
          );
        }
        
        const hours = additionalHours || 24;
        const extendResult = await SessionManager.extendSession(sessionToken, hours);
        return NextResponse.json({
          message: extendResult ? `Session extended by ${hours} hours` : "Session not found or already expired",
          success: extendResult
        }, { status: 200 });

      case 'get-user-sessions':
        if (!userId) {
          return NextResponse.json(
            { message: "userId is required for get-user-sessions action" },
            { status: 400 }
          );
        }
        
        const userSessions = await SessionManager.getUserActiveSessions(userId);
        return NextResponse.json({
          message: "User sessions retrieved",
          sessions: userSessions
        }, { status: 200 });

      case 'get-inactive-sessions':
        const inactiveMinutes = body.inactiveMinutes || 30;
        const inactiveSessions = await SessionManager.getInactiveSessions(inactiveMinutes);
        return NextResponse.json({
          message: `Inactive sessions (>${inactiveMinutes} minutes) retrieved`,
          sessions: inactiveSessions
        }, { status: 200 });

      default:
        return NextResponse.json({
          message: "Invalid action",
          availableActions: [
            'force-logout-user',
            'force-logout-session', 
            'extend-session',
            'get-user-sessions',
            'get-inactive-sessions'
          ]
        }, { status: 400 });
    }

  } catch (error) {
    console.error("Session management POST error:", error);
    return NextResponse.json(
      { 
        message: "Session management operation failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Cleanup operations
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'cleanup-expired':
        const cleanupResult = await SessionManager.cleanupExpiredSessions();
        return NextResponse.json({
          message: "Expired sessions cleaned up",
          deletedCount: cleanupResult.deletedCount
        }, { status: 200 });

      default:
        return NextResponse.json({
          message: "Available DELETE actions: cleanup-expired",
          usage: "DELETE /api/auth/session-management?action=cleanup-expired"
        }, { status: 200 });
    }

  } catch (error) {
    console.error("Session management DELETE error:", error);
    return NextResponse.json(
      { 
        message: "Session cleanup operation failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}