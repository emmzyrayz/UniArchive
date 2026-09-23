// sessionCacheModel.ts
//
// Only a SHA-256 hash of the session token is stored (sessionTokenHash). The
// raw token lives solely in the browser's httpOnly cookie. Every static that
// takes a session token accepts the RAW token and hashes it before querying.

import mongoose, { Schema, Document, Model } from "mongoose";
import crypto from "crypto";
import {
  encryptSensitiveData,
  decryptSensitiveData,
  hashForSearch,
} from "@/lib/encryption";
import { connectDB } from "@/lib/mongoose";
import type { UserRole } from "@/types/roles";

type Gender = "Male" | "Female" | "Other";

// Interface for decrypted user data
interface IDecryptedUserData {
  userId: string;
  uuid: string;
  email: string;
  fullName: string;
  dob?: Date;
  phone?: string;
  gender?: Gender;
  profilePhoto?: string;
  role: UserRole;
  school: string;
  faculty?: string;
  department?: string;
  regNumber?: string;
  level?: string;
  upid: string;
  isVerified: boolean;
  sessionInfo: {
    isActive: boolean;
    isSignedIn: boolean;
    expiresAt: Date;
    lastActivity: Date;
    deviceInfo?: string;
    ipAddress?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface ISessionCache extends Document {
  uuid: string;
  userId: string;
  sessionTokenHash: string;
  email: string;
  emailHash: string;
  fullName: string;
  dob?: Date;
  phone?: string;
  phoneHash?: string;
  gender?: Gender;
  profilePhoto?: string;
  role: UserRole;
  school: string;
  faculty?: string;
  department?: string;
  regNumber?: string;
  regNumberHash?: string;
  level?: string;
  upid: string;
  isVerified: boolean;
  isActive: boolean;
  isSignedIn: boolean;
  expiresAt: Date;
  lastActivity: Date;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  getDecryptedUserData(): IDecryptedUserData;
}

// Interface for user data parameter
interface IUserData {
  email: string;
  fullName: string;
  dob?: Date;
  phone?: string;
  gender?: Gender;
  profilePhoto?: string;
  role: UserRole;
  school: string;
  faculty?: string;
  department?: string;
  regNumber?: string;
  level?: string;
  upid: string;
  isVerified: boolean;
}

// Note: encryptSensitiveData/decryptSensitiveData/hashForSearch live in
// lib/encryption.ts and are called as plain imported functions.
interface ISessionCacheModel extends Model<ISessionCache> {
  invalidateSession(rawSessionToken: string): Promise<boolean>;
  invalidateAllUserSessions(userId: string): Promise<{ modifiedCount: number }>;
  updateActivity(rawSessionToken: string): Promise<ISessionCache | null>;
  createFullSession(
    userId: string,
    userData: IUserData,
    rawSessionToken: string,
    expirationHours?: number,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<ISessionCache>;
  findActiveSession(
    identifier: string,
    identifierType?: "userId" | "sessionToken" | "uuid",
  ): Promise<ISessionCache | null>;
  findByUUID(uuid: string): Promise<ISessionCache | null>;
  cleanupExpiredSessions(): Promise<{ deletedCount: number }>;
  signOutByUUID(uuid: string): Promise<boolean>;
  updateActivityByUUID(uuid: string): Promise<boolean>;
}

const SessionCacheSchema = new Schema<ISessionCache>({
  uuid: { type: String, required: true },
  userId: { type: String, required: true },
  sessionTokenHash: { type: String, required: true },
  email: { type: String, required: true },
  emailHash: { type: String, required: true },
  fullName: { type: String, required: true },
  dob: { type: Date },
  phone: { type: String },
  phoneHash: { type: String },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
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
    required: true,
  },
  school: { type: String, required: true },
  faculty: { type: String },
  department: { type: String },
  level: { type: String },
  regNumber: { type: String },
  regNumberHash: { type: String },
  upid: { type: String, required: true },
  isVerified: { type: Boolean, required: true },
  isActive: { type: Boolean, default: true },
  isSignedIn: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true },
  lastActivity: { type: Date, default: Date.now },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Instance method to get decrypted user data
SessionCacheSchema.methods.getDecryptedUserData = function (): IDecryptedUserData {
  try {
    return {
      userId: this.userId,
      uuid: this.uuid,
      email: decryptSensitiveData(this.email),
      fullName: this.fullName,
      dob: this.dob,
      phone: this.phone ? decryptSensitiveData(this.phone) : undefined,
      gender: this.gender,
      profilePhoto: this.profilePhoto,
      role: this.role,
      school: this.school,
      faculty: this.faculty,
      department: this.department,
      regNumber: this.regNumber ? decryptSensitiveData(this.regNumber) : undefined,
      level: this.level,
      upid: this.upid,
      isVerified: this.isVerified,
      sessionInfo: {
        isActive: this.isActive,
        isSignedIn: this.isSignedIn,
        expiresAt: this.expiresAt,
        lastActivity: this.lastActivity,
        deviceInfo: this.deviceInfo,
        ipAddress: this.ipAddress,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error decrypting user data:", error);
    throw new Error("Failed to decrypt user data");
  }
};

// Invalidate single session
SessionCacheSchema.statics.invalidateSession = async function (
  rawSessionToken: string,
): Promise<boolean> {
  try {
    const result = await this.findOneAndUpdate(
      { sessionTokenHash: hashForSearch(rawSessionToken) },
      { isActive: false, isSignedIn: false, updatedAt: new Date() },
      { returnDocument: "after" },
    );
    return result !== null;
  } catch (error) {
    console.error("Error invalidating session:", error);
    return false;
  }
};

// Invalidate all user sessions
SessionCacheSchema.statics.invalidateAllUserSessions = async function (
  userId: string,
): Promise<{ modifiedCount: number }> {
  try {
    const result = await this.updateMany(
      { userId, isSignedIn: true },
      { isActive: false, isSignedIn: false, updatedAt: new Date() },
    );
    return { modifiedCount: result.modifiedCount || 0 };
  } catch (error) {
    console.error("Error invalidating all user sessions:", error);
    return { modifiedCount: 0 };
  }
};

// Update session activity
SessionCacheSchema.statics.updateActivity = async function (
  rawSessionToken: string,
): Promise<ISessionCache | null> {
  try {
    return await this.findOneAndUpdate(
      { sessionTokenHash: hashForSearch(rawSessionToken), isActive: true },
      { lastActivity: new Date(), updatedAt: new Date() },
      { returnDocument: "after" },
    );
  } catch (error) {
    console.error("Error updating session activity:", error);
    return null;
  }
};

// Sign out session by UUID
SessionCacheSchema.statics.signOutByUUID = async function (uuid: string): Promise<boolean> {
  try {
    const result = await this.findOneAndUpdate(
      { uuid, isActive: true },
      { isActive: false, isSignedIn: false, updatedAt: new Date() },
      { returnDocument: "after" },
    );
    return result !== null;
  } catch (error) {
    console.error("Error signing out session by UUID:", error);
    return false;
  }
};

// Update activity by UUID
SessionCacheSchema.statics.updateActivityByUUID = async function (uuid: string): Promise<boolean> {
  try {
    const result = await this.findOneAndUpdate(
      { uuid, isActive: true, isSignedIn: true },
      { lastActivity: new Date(), updatedAt: new Date() },
      { returnDocument: "after" },
    );
    return result !== null;
  } catch (error) {
    console.error("Error updating session activity by UUID:", error);
    return false;
  }
};

// Create full session. Stores only the hash of the raw token.
SessionCacheSchema.statics.createFullSession = async function (
  userId: string,
  userData: IUserData,
  rawSessionToken: string,
  expirationHours: number = 24 * 7,
  deviceInfo?: string,
  ipAddress?: string,
): Promise<ISessionCache> {
  try {
    const uuid = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    const sessionData: Partial<ISessionCache> = {
      uuid,
      userId,
      sessionTokenHash: hashForSearch(rawSessionToken),
      email: encryptSensitiveData(userData.email),
      emailHash: hashForSearch(userData.email),
      fullName: userData.fullName,
      dob: userData.dob,
      gender: userData.gender,
      profilePhoto: userData.profilePhoto,
      role: userData.role,
      school: userData.school,
      faculty: userData.faculty,
      department: userData.department,
      level: userData.level,
      upid: userData.upid,
      isVerified: userData.isVerified,
      isActive: true,
      isSignedIn: true,
      expiresAt,
      lastActivity: now,
      deviceInfo: deviceInfo || "Unknown",
      ipAddress: ipAddress || "unknown",
      createdAt: now,
      updatedAt: now,
    };

    if (userData.phone) {
      sessionData.phone = encryptSensitiveData(userData.phone);
      sessionData.phoneHash = hashForSearch(userData.phone);
    }

    if (userData.regNumber) {
      sessionData.regNumber = encryptSensitiveData(userData.regNumber);
      sessionData.regNumberHash = hashForSearch(userData.regNumber);
    }

    return await this.create(sessionData);
  } catch (error) {
    console.error("Error creating full session:", error);
    throw new Error(`Failed to create session: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

// Find active session. For "sessionToken", pass the RAW token.
SessionCacheSchema.statics.findActiveSession = async function (
  identifier: string,
  identifierType: "userId" | "sessionToken" | "uuid" = "userId",
): Promise<ISessionCache | null> {
  try {
    const now = new Date();
    const query: Record<string, unknown> = {
      isActive: true,
      isSignedIn: true,
      expiresAt: { $gt: now },
    };

    switch (identifierType) {
      case "userId":
        query.userId = identifier;
        break;
      case "sessionToken":
        query.sessionTokenHash = hashForSearch(identifier);
        break;
      case "uuid":
        query.uuid = identifier;
        break;
      default:
        throw new Error("Invalid identifier type");
    }

    return await this.findOne(query).sort({ lastActivity: -1 });
  } catch (error) {
    console.error("Error finding active session:", error);
    return null;
  }
};

// Find by UUID
SessionCacheSchema.statics.findByUUID = async function (uuid: string): Promise<ISessionCache | null> {
  try {
    const now = new Date();
    return await this.findOne({
      uuid,
      isActive: true,
      isSignedIn: true,
      expiresAt: { $gt: now },
    });
  } catch (error) {
    console.error("Error finding session by UUID:", error);
    return null;
  }
};

// Cleanup expired sessions
SessionCacheSchema.statics.cleanupExpiredSessions = async function (): Promise<{ deletedCount: number }> {
  try {
    const now = new Date();
    const result = await this.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { isActive: false, updatedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      ],
    });
    return { deletedCount: result.deletedCount || 0 };
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return { deletedCount: 0 };
  }
};

// Indexes
SessionCacheSchema.index({ uuid: 1 }, { unique: true });
SessionCacheSchema.index({ sessionTokenHash: 1 }, { unique: true });
SessionCacheSchema.index({ userId: 1, isActive: 1, isSignedIn: 1 });
// TTL: MongoDB removes a session document once expiresAt has passed.
SessionCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionCacheSchema.index({ emailHash: 1 });
SessionCacheSchema.index({ phoneHash: 1 });
SessionCacheSchema.index({ regNumberHash: 1 });
SessionCacheSchema.index({ isActive: 1, isSignedIn: 1, expiresAt: 1 });

const SessionCache = (mongoose.models.SessionCache ||
  mongoose.model<ISessionCache, ISessionCacheModel>("SessionCache", SessionCacheSchema)) as ISessionCacheModel;

/** Connects first, then returns the model. Prefer this in route handlers. */
export async function getSessionCacheModel(): Promise<ISessionCacheModel> {
  await connectDB();
  return SessionCache;
}

export default SessionCache;
