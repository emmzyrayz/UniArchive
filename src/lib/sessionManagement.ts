import connectDB from "@/lib/database";
import SessionCache from "@/models/sessionCacheModel";

// Session management utilities
export class SessionManager {
  
  /**
   * Clean up expired sessions
   * Run this periodically (e.g., via cron job or scheduled task)
   */
  static async cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    try {
      await connectDB();
      const result = await SessionCache.cleanupExpiredSessions();
      console.log(`Cleaned up ${result.deletedCount} expired sessions`);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Session cleanup error:', error);
      throw error;
    }
  }

  /**
   * Get active sessions count
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      await connectDB();
      const count = await SessionCache.countDocuments({
        isSignedIn: true,
        expiresAt: { $gt: new Date() }
      });
      return count;
    } catch (error) {
      console.error('Get active sessions count error:', error);
      throw error;
    }
  }

  /**
   * Get active sessions for a specific user
   */
  static async getUserActiveSessions(userId: string) {
    try {
      await connectDB();
      const sessions = await SessionCache.find({
        userId,
        isSignedIn: true,
        expiresAt: { $gt: new Date() }
      }).select('sessionToken signInTime lastActivity expiresAt deviceInfo ipAddress').sort({ signInTime: -1 });
      
      return sessions;
    } catch (error) {
      console.error('Get user active sessions error:', error);
      throw error;
    }
  }

  /**
   * Force logout user from all devices
   */
  static async forceLogoutUser(userId: string): Promise<{ modifiedCount: number }> {
    try {
      await connectDB();
      const result = await SessionCache.invalidateAllUserSessions(userId);
      console.log(`Logged out user ${userId} from ${result.modifiedCount} sessions`);
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('Force logout user error:', error);
      throw error;
    }
  }

  /**
   * Force logout specific session
   */
  static async forceLogoutSession(sessionToken: string): Promise<boolean> {
    try {
      await connectDB();
      const result = await SessionCache.invalidateSession(sessionToken);
      return !!result;
    } catch (error) {
      console.error('Force logout session error:', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<{
    totalActiveSessions: number;
    totalExpiredSessions: number;
    activeUsersCount: number;
    sessionsExpiringSoon: number; // expires in next 24 hours
  }> {
    try {
      await connectDB();
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const [
        totalActiveSessions,
        totalExpiredSessions,
        activeUsersCount,
        sessionsExpiringSoon
      ] = await Promise.all([
        SessionCache.countDocuments({
          isSignedIn: true,
          expiresAt: { $gt: now }
        }),
        SessionCache.countDocuments({
          $or: [
            { isSignedIn: false },
            { expiresAt: { $lt: now } }
          ]
        }),
        SessionCache.distinct('userId', {
          isSignedIn: true,
          expiresAt: { $gt: now }
        }).then(users => users.length),
        SessionCache.countDocuments({
          isSignedIn: true,
          expiresAt: { $gt: now, $lt: tomorrow }
        })
      ]);

      return {
        totalActiveSessions,
        totalExpiredSessions,
        activeUsersCount,
        sessionsExpiringSoon
      };
    } catch (error) {
      console.error('Get session stats error:', error);
      throw error;
    }
  }

  /**
   * Check if user has active session
   */
  static async isUserOnline(userId: string): Promise<boolean> {
    try {
      await connectDB();
      const session = await SessionCache.findActiveSession(userId, 'userId');
      return !!session;
    } catch (error) {
      console.error('Check user online status error:', error);
      return false;
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionToken: string): Promise<boolean> {
    try {
      await connectDB();
      const result = await SessionCache.updateActivity(sessionToken);
      return !!result;
    } catch (error) {
      console.error('Update session activity error:', error);
      return false;
    }
  }

  /**
   * Get sessions that need activity update (inactive for more than X minutes)
   */
  static async getInactiveSessions(inactiveMinutes: number = 30) {
    try {
      await connectDB();
      const cutoffTime = new Date(Date.now() - inactiveMinutes * 60 * 1000);
      
      const sessions = await SessionCache.find({
        isSignedIn: true,
        expiresAt: { $gt: new Date() },
        lastActivity: { $lt: cutoffTime }
      }).select('userId email sessionToken lastActivity deviceInfo');
      
      return sessions;
    } catch (error) {
      console.error('Get inactive sessions error:', error);
      throw error;
    }
  }

  /**
   * Extend session expiration
   */
  static async extendSession(sessionToken: string, additionalHours: number = 24): Promise<boolean> {
    try {
      await connectDB();
      
      const session = await SessionCache.findOne({ sessionToken, isSignedIn: true });
      if (!session) return false;

      const newExpiryTime = new Date(session.expiresAt.getTime() + additionalHours * 60 * 60 * 1000);
      
      const result = await SessionCache.findOneAndUpdate(
        { sessionToken },
        { 
          expiresAt: newExpiryTime,
          lastActivity: new Date()
        },
        { new: true }
      );

      return !!result;
    } catch (error) {
      console.error('Extend session error:', error);
      return false;
    }
  }
}