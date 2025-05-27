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
    
    // Receive all plain data from client
    // Receive all plain data from client
    const {
      name: fullName,
      email,
      password,
      gender,
      dob,
      phone,
      university: school,
      faculty,
      department,
      regnumber
    } = body;


    // Validate required fields
    if (!fullName || !email || !password || !dob || !phone || !gender || !school || !faculty || !department || !regnumber) {
      return NextResponse.json(
        { message: 'All required fields must be provided' },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

     // Create hashes for searching (one-way hashes)
    const emailHash = User.hashForSearch(email);
    const phoneHash = User.hashForSearch(phone);
    const regNumberHash = User.hashForSearch(regnumber);

    // Check if user already exists using search hashes
    const existingUser = await User.findOne({
      $or: [
        { emailHash: emailHash },
        { regNumberHash: regNumberHash }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email or registration number already exists' },
        { status: 409 }
      );
    }

    // Encrypt sensitive data for storage (deterministic encryption)
    const encryptedEmail = User.encryptSensitiveData(email);
    const encryptedPhone = User.encryptSensitiveData(phone);
    const encryptedRegNumber = User.encryptSensitiveData(regnumber);

    // Generate UUID and UPID using static methods
    const dobDate = new Date(dob);
    const uuid = User.generateUUID(dobDate, phone);
    const upid = User.generateUPID(fullName, school);

    // Check if generated IDs are unique
    const existingUUID = await User.findOne({ uuid });
    const existingUPID = await User.findOne({ upid });
    
    let finalUuid = uuid;
    let finalUpid = upid;

    if (existingUUID || existingUPID) {
      // Regenerate if collision (very rare)
      finalUuid = uuid + Math.floor(Math.random() * 1000);
      finalUpid = upid + Math.floor(Math.random() * 1000);
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create new user
    // Create new user with encrypted sensitive data and search hashes
    const newUser = new User({
      fullName,
      email: encryptedEmail, // Store encrypted
      emailHash: emailHash, // Store hash for searching
      password, // Will be hashed by pre-save middleware
      dob: dobDate,
      phone: encryptedPhone, // Store encrypted
      phoneHash: phoneHash, // Store hash for searching
      gender,
      school,
      faculty,
      department,
      regNumber: encryptedRegNumber, // Store encrypted
      regNumberHash: regNumberHash, // Store hash for searching
      uuid: finalUuid,
      upid: finalUpid,
      verificationCode,
      verificationCodeExpires,
      isVerified: false,
    });

    await newUser.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        email,
        fullName,
        verificationCode
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, but log it
    }

    return NextResponse.json(
      { 
        message: 'Registration successful! Please check your email for verification code.',
        uuid: finalUuid,
        upid: finalUpid 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      // Handle specific MongoDB duplicate key errors
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { message: 'User with this email or registration number already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { message: 'Registration failed', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}