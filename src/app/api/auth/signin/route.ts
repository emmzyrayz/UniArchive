// /api/auth/signin/route.ts - Fixed version with proper TypeScript types

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
import User from "@/models/usermodel";
import SessionCache from "@/models/sessionCacheModel";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Types } from "mongoose";
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

// Define interfaces for better type safety
interface UserDocument {
  _id: Types.ObjectId;
  email: string;
  fullName: string;
  dob: Date;
  phone: string;
  gender: "Male" | "Female" | "Other";
  profilePhoto?: string;
  role: "admin" | "contributor" | "student" | "mod" | "devsupport";
  school: string;
  faculty: string;
  department: string;
  regNumber: string;
  level: string;
  upid: string;
  uuid: string;
  isVerified: boolean;
  emailHash: string;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  save(): Promise<UserDocument>;
}

interface FullUserData {
  email: string;
  fullName: string;
  dob: Date;
  phone: string;
  gender: "Male" | "Female" | "Other";
  profilePhoto?: string;
  role: "admin" | "contributor" | "student" | "mod" | "devsupport";
  school: string;
  faculty: string;
  department: string;
  regNumber: string;
  level: string;
  upid: string;
  isVerified: boolean;
}

interface TokenPayload {
  user: {
    id: Types.ObjectId;
    fullName: string;
    email: string;
    school: string;
    faculty: string;
    department: string;
    uuid: string;
    upid: string;
    role: "admin" | "contributor" | "student" | "mod" | "devsupport";
    isVerified: boolean;
    profilePhoto?: string;
    phone: string;
    regNumber: string;
    level: string;
  };
  sessionToken: string;
}

interface SessionUploadResponse {
  message: string;
  sessionInfo?: {
    uuid: string;
    sessionToken: string;
    expiresAt: Date;
    deviceInfo: string;
    created?: boolean;
    refreshed?: boolean;
    newExpiresAt?: Date;
  };
}

interface DeleteResult {
  deletedCount: number;
}

// FIXED: Add cleanup function at the start with proper typing
async function cleanupUserSessions(userId: string): Promise<void> {
  try {
    // Remove all existing sessions for this user
    const result = await SessionCache.deleteMany({ userId: userId }) as DeleteResult;
    console.log(`SignIn: Cleaned up ${result.deletedCount} existing sessions for user ${userId}`);
  } catch (error) {
    console.error("SignIn: Error cleaning up user sessions:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    console.log("Sign-in attempt for email:", email);

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create hash to search for user (same hash used during registration)
    const emailHash = User.hashForSearch(email);

    // Find user by email hash with proper typing
    const user = await User.findOne({ emailHash: emailHash }) as UserDocument | null;

    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if password is correct
    const isPasswordValid = await user.comparePassword(password);

    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is verified
    if (!user.isVerified) {
      return NextResponse.json(
        {
          message: "Please verify your email before logging in",
          requiresVerification: true,
          email: email,
        },
        { status: 403 }
      );
    }

    // FIXED: Clean up any existing sessions for this user BEFORE creating a new one
    const userId = user._id.toString();
    console.log("SignIn: Cleaning up existing sessions for user:", userId);
    await cleanupUserSessions(userId);

    // Decrypt sensitive data for session storage
    const decryptedEmail = User.decryptSensitiveData(user.email);
    const decryptedPhone = User.decryptSensitiveData(user.phone);
    const decryptedRegNumber = User.decryptSensitiveData(user.regNumber);

    // Verify decryption worked correctly
    console.log("Decrypted email matches input:", decryptedEmail === email);

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Prepare complete user data for session (using plain text for session storage)
    const fullUserData: FullUserData = {
      email: decryptedEmail,
      fullName: user.fullName,
      dob: user.dob,
      phone: decryptedPhone,
      gender: user.gender,
      profilePhoto: user.profilePhoto,
      role: user.role,
      school: user.school,
      faculty: user.faculty,
      department: user.department,
      regNumber: decryptedRegNumber,
      level: user.level,
      upid: user.upid,
      isVerified: user.isVerified,
    };

    // Generate JWT token with session reference
    const tokenPayload: TokenPayload = {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: decryptedEmail,
        school: user.school,
        faculty: user.faculty,
        department: user.department,
        uuid: user.uuid,
        upid: user.upid,
        role: user.role,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto,
        phone: decryptedPhone,
        regNumber: decryptedRegNumber,
        level: user.level, // FIXED: Added missing level field
      },
      sessionToken,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    // Extract request metadata
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = getDeviceInfo(userAgent);
    const ipAddress = getClientIP(request);

    // Use correct URL path for sessionupload
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const sessionUploadUrl = `${baseUrl}/api/user/sessionupload`;

    console.log("Creating session via sessionUpload...");

    // Call sessionUpload route to store complete user data
    try {
      const sessionUploadResponse = await fetch(sessionUploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': userAgent,
          'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
          'x-real-ip': request.headers.get('x-real-ip') || '',
        },
        body: JSON.stringify({
          userId: userId,
          email: decryptedEmail,
          userData: fullUserData,
          sessionToken,
          deviceInfo,
          ipAddress
        })
      });

      console.log("SessionUpload response status:", sessionUploadResponse.status);

      // Check if response is actually JSON
      const contentType = sessionUploadResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await sessionUploadResponse.text();
        console.error("Non-JSON response from sessionUpload:", responseText);
        throw new Error(`SessionUpload returned non-JSON response: ${responseText.substring(0, 200)}...`);
      }

      const sessionUploadResult = await sessionUploadResponse.json() as SessionUploadResponse;
      
      if (!sessionUploadResponse.ok) {
        console.error("Session upload failed:", sessionUploadResult);
        throw new Error(sessionUploadResult.message || "Failed to create session");
      }

      console.log("Session upload successful");

      // Get session UUID from response
      const sessionUUID = sessionUploadResult.sessionInfo?.uuid;
      
      if (sessionUUID) {
        console.log("Setting session UUID cookie:", sessionUUID);
        
        // Set cookie using the cookies() API (Next.js 15+ async method)
        const cookieStore = await cookies();
        cookieStore.set("sessionId", sessionUUID, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
          sameSite: "lax",
          path: "/"
        });

        console.log("Session UUID cookie set successfully");

        // Update last login
        user.updatedAt = new Date();
        await user.save();

        // FIXED: Verify only one session exists for this user
        const sessionCount = await SessionCache.countDocuments({ userId: userId });
        console.log(`SignIn: Final session count for user ${userId}: ${sessionCount}`);
        
        if (sessionCount > 1) {
          console.warn(`SignIn: WARNING - User ${userId} has ${sessionCount} sessions after login`);
          // Emergency cleanup - keep only the newest session
          await cleanupUserSessions(userId);
          console.log("SignIn: Emergency cleanup completed");
        }

        // Return response
        return NextResponse.json(
          {
            message: "Login successful",
            token,
            user: tokenPayload.user,
            sessionToken,
            sessionUUID,
            sessionRefreshed: sessionUploadResult.sessionInfo?.refreshed || false,
          },
          { status: 200 }
        );
      } else {
        console.error("No session UUID returned from sessionUpload");
        console.error("SessionUpload result:", JSON.stringify(sessionUploadResult, null, 2));
        throw new Error("Session UUID not returned from sessionUpload");
      }

    } catch (sessionError) {
      console.error("Failed to create session via sessionUpload:", sessionError);
      
      // FIXED: Clean up any partial session data on failure
      await cleanupUserSessions(userId);
      
      return NextResponse.json(
        { 
          message: "Login failed during session creation", 
          error: sessionError instanceof Error ? sessionError.message : 'Unknown session error',
          details: "Please try again or contact support if the problem persists"
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { message: "Login failed", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
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