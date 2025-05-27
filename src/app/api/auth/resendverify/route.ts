import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/usermodel';
import { emailService } from '@/utils/email';

// Generate verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    
    // Receive plain email from client
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Create hash to search for user (same hash used during registration)
    const emailHash = User.hashForSearch(email);

    // Find user by email hash
    const user = await User.findOne({ emailHash: emailHash });

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

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with new verification code
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    // Send verification email using plain email
    try {
      await emailService.sendVerificationEmail(
        email, // Use plain email for sending
        user.fullName,
        verificationCode
      );

      return NextResponse.json(
        { message: 'Verification code sent successfully' },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { message: 'Failed to send verification email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: 'Failed to resend verification code', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}