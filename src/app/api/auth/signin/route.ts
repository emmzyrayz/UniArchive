// /api/auth/signin/route.ts - Fixed version with proper sessionUUID handling

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
import User from "@/models/usermodel";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

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
          email: email, // Send plain email back for verification process
        },
        { status: 403 }
      );
    }

    // Decrypt sensitive data for session storage
    const decryptedEmail = User.decryptSensitiveData(user.email);
    const decryptedPhone = User.decryptSensitiveData(user.phone);
    const decryptedRegNumber = User.decryptSensitiveData(user.regNumber);

    // Verify decryption worked correctly
    console.log("Decrypted email matches input:", decryptedEmail === email);

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Fixed: Properly type user._id
    const userId = user._id as Types.ObjectId;

    // Prepare complete user data for session (using plain text for session storage)
    const fullUserData = {
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
      upid: user.upid,
      isVerified: user.isVerified,
    };

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

    // Use correct URL path for sessionupload
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
          userId: userId.toString(),
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

      const sessionUploadResult = await sessionUploadResponse.json();
      
      if (!sessionUploadResponse.ok) {
        console.error("Session upload failed:", sessionUploadResult);
        throw new Error(sessionUploadResult.message || "Failed to create session");
      }

      console.log("Session upload successful");

      // Get session UUID from response - handle both new and existing sessions
      const sessionUUID = sessionUploadResult.sessionInfo?.uuid;
      
      if (sessionUUID) {
        console.log("Setting session UUID cookie:", sessionUUID);
        
        // Create response first, then set cookie
        const response = NextResponse.json(
          {
            message: "Login successful",
            token,
            user: tokenPayload.user,
            sessionToken,
            sessionUUID, // Include UUID in response for debugging
            sessionRefreshed: sessionUploadResult.sessionInfo?.refreshed || false,
          },
          { status: 200 }
        );

        // Set the cookie on the response
        response.cookies.set("sessionId", sessionUUID, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
          sameSite: "strict",
          path: "/"
        });

        console.log("Session UUID cookie set successfully");

        // Update last login
        user.updatedAt = new Date();
        await user.save();

        return response;
      } else {
        console.error("No session UUID returned from sessionUpload");
        console.error("SessionUpload result:", JSON.stringify(sessionUploadResult, null, 2));
        throw new Error("Session UUID not returned from sessionUpload");
      }

    } catch (sessionError) {
      console.error("Failed to create session via sessionUpload:", sessionError);
      
      // Return error response with details
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