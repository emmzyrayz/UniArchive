import crypto from "crypto";
import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import {
  encryptSensitiveData,
  decryptSensitiveData,
  hashForSearch,
} from "@/lib/encryption";
import { connectDB } from "@/lib/mongoose";
import type { UserRole } from "@/types/roles";

// email, phone and regNumber hold ciphertext from encryptSensitiveData; the
// matching *Hash fields hold hashForSearch digests used for lookups.
//
// Verification codes, reset tokens and reset codes are stored ONLY as hashes.
// The raw values exist in the email sent to the user and nowhere else.
export interface IUser extends Document {
  fullName: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
  emailHash: string;
  password: string;
  role: UserRole;
  // Collected later in profile completion; not part of the signup wizard.
  dob?: Date;
  phone?: string;
  phoneHash?: string;
  gender?: "Male" | "Female" | "Other";
  level?: string;
  profilePhoto?: string;
  school: string;
  faculty?: string;
  department?: string;
  regNumber?: string;
  regNumberHash?: string;
  uuid: string;
  upid: string;
  isVerified: boolean;

  // Email verification (6-digit code)
  verificationCodeHash?: string;
  verificationCodeExpires?: Date;
  verificationAttempts: number;

  // Password reset: link token and 6-digit code are both issued by
  // /api/auth/request-reset; either one can be exchanged for a short-lived
  // reset session by /api/auth/verify-reset-code.
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  resetCodeHash?: string;
  resetCodeExpires?: Date;
  resetCodeAttempts: number;
  resetSessionHash?: string;
  resetSessionExpires?: Date;

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  generateUUID(): string;
  generateUPID(fullName: string, school: string): string;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    username: { type: String, trim: true, lowercase: true },
    email: { type: String, required: true },
    emailHash: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    dob: { type: Date },
    phone: { type: String },
    phoneHash: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    level: { type: String },
    profilePhoto: { type: String },
    role: {
      type: String,
      enum: [
        "student",
        "collaborator",
        "auditor",
        "course_rep",
        "lecturer",
        "ed_admin",
        "com_admin",
        "webmaster",
        "dev",
      ],
      default: "student",
    },
    school: { type: String, required: true },
    faculty: { type: String },
    department: { type: String },
    regNumber: { type: String },
    regNumberHash: { type: String },
    uuid: { type: String, required: true, unique: true },
    upid: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },

    verificationCodeHash: { type: String },
    verificationCodeExpires: { type: Date },
    verificationAttempts: { type: Number, default: 0 },

    resetTokenHash: { type: String },
    resetTokenExpires: { type: Date },
    resetCodeHash: { type: String },
    resetCodeExpires: { type: Date },
    resetCodeAttempts: { type: Number, default: 0 },
    resetSessionHash: { type: String },
    resetSessionExpires: { type: Date },
  },
  { timestamps: true },
);

// Optional-but-unique fields: sparse so documents without them don't collide.
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ regNumberHash: 1 }, { unique: true, sparse: true });
UserSchema.index({ resetTokenHash: 1 }, { sparse: true });
UserSchema.index({ resetSessionHash: 1 }, { sparse: true });

UserSchema.pre("save", async function () {
  // If password is not modified, simply return to exit the function
  if (!this.isModified("password")) return;

  // Otherwise, hash the password
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Opaque, random system id. (The old version was derived from DOB and phone
// digits, which leaked personal data and wasn't reliably unique.)
UserSchema.statics.generateUUID = function (): string {
  return crypto.randomUUID();
};

UserSchema.statics.generateUPID = function (
  fullName: string,
  school: string,
): string {
  const nameInitials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n.charAt(0))
    .join("")
    .toLowerCase();
  const schoolInitials = school
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s.charAt(0))
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const randomNum = crypto.randomInt(0, 10000).toString().padStart(4, "0");

  return `${nameInitials}${schoolInitials}${randomNum}`;
};

const User = (mongoose.models.User ||
  mongoose.model<IUser, IUserModel>("User", UserSchema)) as IUserModel;

/** Connects first, then returns the model. Use this in route handlers. */
export async function getUserModel(): Promise<IUserModel> {
  await connectDB();
  return User;
}

export default User;
export { encryptSensitiveData, decryptSensitiveData, hashForSearch };
