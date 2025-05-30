import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
import User from "@/models/usermodel";
import SessionCache from "@/models/sessionCacheModel";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

// Helper function to extract device/browser info from user agent
function getDeviceInfo(userAgent: string): string {
  // Simple device detection - you can make this more sophisticated
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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    console.log("Plain email received:", email);

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create hash to search for user (same hash used during registration)
    const emailHash = User.hashForSearch(email);

    // Find user by email hash
    const user = await User.findOne({ emailHash: emailHash });

    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if password is correct
    const isPasswordValid = await user.comparePassword(password);

    console.log("Password comparison result:", isPasswordValid);

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
          email: email, // Send plain email back for verification process
        },
        { status: 403 }
      );
    }

    // Decrypt sensitive data for token payload
    const decryptedEmail = User.decryptSensitiveData(user.email);
    const decryptedPhone = User.decryptSensitiveData(user.phone);
    const decryptedRegNumber = User.decryptSensitiveData(user.regNumber);

    // Verify decryption worked correctly
    console.log("Decrypted email matches input:", decryptedEmail === email);

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Fixed: Properly type user._id
    const userId = user._id as Types.ObjectId;

    // Generate JWT token with session reference
    const tokenPayload = {
      user: {
        id: userId,
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
      },
      sessionToken, // Include session token in JWT
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    // Extract request metadata
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = getDeviceInfo(userAgent);
    const ipAddress = getClientIP(request);

    // Create session cache entry
    try {
     const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (24 * 7)); // 7 days from now

      await SessionCache.createSession(
        userId.toString(),
        decryptedEmail, // Use decrypted email (plain text)
        sessionToken,
        24 * 7, // 7 days in hours
        deviceInfo,
        ipAddress
      );

      console.log("Session cache created successfully");
    } catch (sessionError) {
      console.error("Failed to create session cache:", sessionError);
      // Continue with login even if session cache fails (fallback to JWT only)
    }

    // Update last login
    user.updatedAt = new Date();
    await user.save();

    // Clean up old expired sessions (optional - run periodically)
    SessionCache.cleanupExpiredSessions().catch((err: Error) => 
      console.error("Session cleanup error:", err)
    );

    // Clean up old expired sessions (optional - run periodically)
    SessionCache.deleteMany({ 
      expiresAt: { $lt: new Date() } 
    }).catch((err: Error) => 
      console.error("Session cleanup error:", err)
    );

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: tokenPayload.user,
        sessionToken, // Return session token for client-side reference
      },
      { status: 200 }
    );
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