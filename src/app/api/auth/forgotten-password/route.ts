import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/usermodel';
import { emailService } from '@/utils/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create hash for searching the user by email
    const emailHash = User.hashForSearch(email);

    // Find user by email hash (since email is encrypted, we search by hash)
    const user = await User.findOne({ emailHash });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: 'If an account with this email exists, you will receive a password reset link.' },
        { status: 200 }
      );
    }

    // Check if user is verified
    if (!user.isVerified) {
      return NextResponse.json(
        { message: 'Please verify your email before requesting a password reset.' },
        { status: 400 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set reset token and expiry (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Decrypt the stored email to send the reset email
    let decryptedEmail: string;
    try {
      decryptedEmail = User.decryptSensitiveData(user.email);
    } catch (decryptError) {
      console.error('Failed to decrypt email:', decryptError);
      return NextResponse.json(
        { message: 'Failed to process request. Please contact support.' },
        { status: 500 }
      );
    }

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        decryptedEmail,
        user.fullName,
        resetToken
      );

      return NextResponse.json(
        { message: 'Password reset link has been sent to your email.' },
        { status: 200 }
      );
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // Clear reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return NextResponse.json(
        { message: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: 'Password reset request failed', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}