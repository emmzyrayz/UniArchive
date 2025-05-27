import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/usermodel';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    
    // Receive plain email and code from client
    const { email, code } = body;

    // Validate required fields
    if (!email || !code) {
      return NextResponse.json(
        { message: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Create hash to search for user (same hash used during registration)
    const emailHash = User.hashForSearch(email);

    // Find user by email hash
    const user = await User.findOne({ emailHash: emailHash });

    console.log("User found:", user ? "Yes" : "No");
    console.log("Plain email received:", email);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.isVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Check if verification code exists
    if (!user.verificationCode) {
      return NextResponse.json(
        { message: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if verification code has expired
    if (user.verificationCodeExpires && user.verificationCodeExpires < new Date()) {
      return NextResponse.json(
        { message: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if verification code matches
    if (user.verificationCode !== code) {
      return NextResponse.json(
        { message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Decrypt sensitive data for token payload
    const decryptedEmail = User.decryptSensitiveData(user.email);
    const decryptedPhone = User.decryptSensitiveData(user.phone);

    // Generate JWT token for auto-login
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
        phone: decryptedPhone,
      }
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        token,
        user: tokenPayload.user
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: 'Email verification failed', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}