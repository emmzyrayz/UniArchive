import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database";
import User from "@/models/usermodel";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

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

    // Generate JWT token
    const tokenPayload = {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: decryptedEmail, // Use decrypted email in token
        school: user.school,
        faculty: user.faculty,
        department: user.department,
        uuid: user.uuid,
        upid: user.upid,
        role: user.role,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto,
        phone: decryptedPhone, // Include decrypted phone
        regNumber: decryptedRegNumber, // Include decrypted reg number if needed
      },
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    // Update last login (optional)
    user.updatedAt = new Date();
    await user.save();

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: tokenPayload.user,
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