// sessionCacheModel.ts - Fixed version with all required methods

import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';

// Proper encryption key handling
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey) {
    // If environment key exists, ensure it's the right length
    if (envKey.length === 64) {
      // Already a 64-character hex string (32 bytes)
      return Buffer.from(envKey, 'hex');
    } else if (envKey.length === 32) {
      // 32-character string, convert to buffer directly
      return Buffer.from(envKey);
    } else {
      // Hash the provided key to get consistent 32 bytes
      return crypto.createHash('sha256').update(envKey).digest();
    }
  } else {
    // Generate a consistent key from a default string for development
    console.warn('ENCRYPTION_KEY not found in environment. Using default key for development.');
    return crypto.createHash('sha256').update('default-development-encryption-key').digest();
  }
}

const KEY_BUFFER = getEncryptionKey();

// Interface for decrypted user data
interface IDecryptedUserData {
  userId: string;
  uuid: string;
  email: string;
  fullName: string;
  dob: Date;
  phone?: string;
  gender: 'Male' | 'Female' | 'Other';
  profilePhoto?: string;
  role: 'admin' | 'contributor' | 'student' | 'mod';
  school: string;
  faculty: string;
  department: string;
  regNumber?: string;
  level: string;
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
  sessionToken: string;
  email: string;
  emailHash: string;
  fullName: string;
  dob: Date;
  phone?: string;
  phoneHash?: string;
  gender: 'Male' | 'Female' | 'Other';
  profilePhoto?: string;
  role: 'admin' | 'contributor' | 'student' | 'mod';
  school: string;
  faculty: string;
  department: string;
  regNumber?: string;
  regNumberHash?: string;
  level: string;
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
  dob: Date;
  phone?: string;
  gender: 'Male' | 'Female' | 'Other';
  profilePhoto?: string;
  role: 'admin' | 'contributor' | 'student' | 'mod';
  school: string;
  faculty: string;
  department: string;
  regNumber?: string;
  level: string;
  upid: string;
  isVerified: boolean;
}

// Interface for static methods
interface ISessionCacheModel extends Model<ISessionCache> {
  encryptSensitiveData(data: string): string;
  decryptSensitiveData(encryptedData: string): string;
  hashForSearch(data: string): string;
  invalidateSession(sessionToken: string): Promise<boolean>;
  invalidateAllUserSessions(userId: string): Promise<{ modifiedCount: number }>;
  updateActivity(sessionToken: string): Promise<ISessionCache | null>;
  createFullSession(
    userId: string,
    userData: IUserData,
    sessionToken: string,
    expirationHours?: number,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<ISessionCache>;
  findActiveSession(
    identifier: string,
    identifierType?: 'userId' | 'sessionToken' | 'uuid'
  ): Promise<ISessionCache | null>;
  findByUUID(uuid: string): Promise<ISessionCache | null>;
  cleanupExpiredSessions(): Promise<{ deletedCount: number }>;
  
  // New methods needed by sessionUtils
  signOutByUUID(uuid: string): Promise<boolean>;
  updateActivityByUUID(uuid: string): Promise<boolean>;
}

const SessionCacheSchema = new Schema<ISessionCache>({
  uuid: { type: String, required: true },
  userId: { type: String, required: true },
  sessionToken: { type: String, required: true },
  email: { type: String, required: true },
  emailHash: { type: String, required: true },
  fullName: { type: String, required: true },
  dob: { type: Date, required: true },
  phone: { type: String },
  phoneHash: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  profilePhoto: { type: String },
  role: { type: String, enum: ['admin', 'contributor', 'student', 'mod'], required: true },
  school: { type: String, required: true },
  faculty: { type: String, required: true },
  department: { type: String, required: true },
  level: { type: String, required: true },
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
  updatedAt: { type: Date, default: Date.now }
});

// Instance method to get decrypted user data
SessionCacheSchema.methods.getDecryptedUserData = function(): IDecryptedUserData {
  const SessionCacheModel = this.constructor as ISessionCacheModel;
  
  try {
    return {
      userId: this.userId,
      uuid: this.uuid,
      email: SessionCacheModel.decryptSensitiveData(this.email),
      fullName: this.fullName,
      dob: this.dob,
      phone: this.phone ? SessionCacheModel.decryptSensitiveData(this.phone) : undefined,
      gender: this.gender,
      profilePhoto: this.profilePhoto,
      role: this.role,
      school: this.school,
      faculty: this.faculty,
      department: this.department,
      regNumber: this.regNumber ? SessionCacheModel.decryptSensitiveData(this.regNumber) : undefined,
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
        updatedAt: this.updatedAt
      }
    };
  } catch (error) {
    console.error('Error decrypting user data:', error);
    throw new Error('Failed to decrypt user data');
  }
};

// Enhanced encryption function with proper key validation
SessionCacheSchema.statics.encryptSensitiveData = function(data: string): string {
  try {
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid data for encryption');
    }

    // Validate key buffer length
    console.log('Encryption key buffer length:', KEY_BUFFER.length);
    if (KEY_BUFFER.length !== 32) {
      throw new Error(`Invalid encryption key length: expected 32 bytes, got ${KEY_BUFFER.length}`);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV:encrypted format
    return iv.toString('hex') + ':' + encrypted;
  } catch (encryptionError) {
    console.error('Encryption error:', encryptionError);
    console.error('Key buffer details:', {
      length: KEY_BUFFER.length,
      type: typeof KEY_BUFFER,
      isBuffer: Buffer.isBuffer(KEY_BUFFER)
    });
    throw new Error(`Failed to encrypt sensitive data: ${encryptionError instanceof Error ? encryptionError.message : 'Unknown error'}`);
  }
};

// Enhanced decryption function with comprehensive error handling
SessionCacheSchema.statics.decryptSensitiveData = function(encryptedData: string): string {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data provided');
    }

    // Check if data is in the correct format (IV:encrypted)
    if (!encryptedData.includes(':')) {
      throw new Error('Invalid encrypted data format - missing IV separator');
    }

    const parts = encryptedData.split(':');
    
    if (parts.length !== 2) {
      throw new Error(`Invalid encrypted data format - expected 2 parts, got ${parts.length}`);
    }

    const [ivHex, encrypted] = parts;

    // Validate IV length (should be 32 hex characters for 16 bytes)
    if (ivHex.length !== 32) {
      throw new Error(`Invalid IV length: expected 32 hex characters, got ${ivHex.length}`);
    }

    // Validate encrypted data is not empty
    if (!encrypted || encrypted.length === 0) {
      throw new Error('Empty encrypted data');
    }

    // Validate IV is valid hex
    if (!/^[0-9a-fA-F]+$/.test(ivHex)) {
      throw new Error('Invalid IV format - contains non-hex characters');
    }

    let iv: Buffer;
    try {
      iv = Buffer.from(ivHex, 'hex');
    } catch (error) {
      throw new Error(`Failed to create IV buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate IV buffer length
    if (iv.length !== 16) {
      throw new Error(`Invalid IV buffer length: expected 16 bytes, got ${iv.length}`);
    }

    // Validate encryption key
    if (KEY_BUFFER.length !== 32) {
      throw new Error(`Invalid encryption key length: expected 32 bytes, got ${KEY_BUFFER.length}`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (decryptionError) {
    console.error('Decryption error details:', {
      error: decryptionError instanceof Error ? decryptionError.message : 'Unknown error',
      dataLength: encryptedData?.length,
      dataPreview: encryptedData?.substring(0, 50) + (encryptedData?.length > 50 ? '...' : ''),
      hasColon: encryptedData?.includes(':'),
      parts: encryptedData?.split(':').length
    });
    
    throw new Error(`Failed to decrypt sensitive data: ${decryptionError instanceof Error ? decryptionError.message : 'Unknown error'}`);
  }
};

// Hash function for searching
SessionCacheSchema.statics.hashForSearch = function(data: string): string {
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
};

// Invalidate single session
SessionCacheSchema.statics.invalidateSession = async function(sessionToken: string): Promise<boolean> {
  try {
    const result = await this.findOneAndUpdate(
      { sessionToken: sessionToken },
      { 
        isActive: false,
        isSignedIn: false,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    return result !== null;
  } catch (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
};

// Invalidate all user sessions
SessionCacheSchema.statics.invalidateAllUserSessions = async function(userId: string): Promise<{ modifiedCount: number }> {
  try {
    const result = await this.updateMany(
      { userId: userId, isSignedIn: true },
      { 
        isActive: false,
        isSignedIn: false,
        updatedAt: new Date()
      }
    );
    
    return { modifiedCount: result.modifiedCount || 0 };
  } catch (error) {
    console.error('Error invalidating all user sessions:', error);
    return { modifiedCount: 0 };
  }
};

// Update session activity
SessionCacheSchema.statics.updateActivity = async function(sessionToken: string): Promise<ISessionCache | null> {
  try {
    const result = await this.findOneAndUpdate(
      { sessionToken: sessionToken, isActive: true },
      { 
        lastActivity: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );
    
    return result;
  } catch (error) {
    console.error('Error updating session activity:', error);
    return null;
  }
};

// NEW: Sign out session by UUID
SessionCacheSchema.statics.signOutByUUID = async function(uuid: string): Promise<boolean> {
  try {
    const result = await this.findOneAndUpdate(
      { uuid: uuid, isActive: true },
      { 
        isActive: false,
        isSignedIn: false,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    return result !== null;
  } catch (error) {
    console.error('Error signing out session by UUID:', error);
    return false;
  }
};

// NEW: Update activity by UUID
SessionCacheSchema.statics.updateActivityByUUID = async function(uuid: string): Promise<boolean> {
  try {
    const result = await this.findOneAndUpdate(
      { uuid: uuid, isActive: true, isSignedIn: true },
      { 
        lastActivity: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );
    
    return result !== null;
  } catch (error) {
    console.error('Error updating session activity by UUID:', error);
    return false;
  }
};

// Create full session method with better error handling
SessionCacheSchema.statics.createFullSession = async function(
  userId: string,
  userData: IUserData,
  sessionToken: string,
  expirationHours: number = 24 * 7,
  deviceInfo?: string,
  ipAddress?: string
): Promise<ISessionCache> {
  try {
    const uuid = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expirationHours * 60 * 60 * 1000));

    // Get reference to the model to access static methods
    const SessionCacheModel = this as ISessionCacheModel;

    console.log('Creating session with encrypted data...');

    const sessionData: Partial<ISessionCache> = {
      uuid,
      userId,
      sessionToken,
      email: SessionCacheModel.encryptSensitiveData(userData.email),
      emailHash: SessionCacheModel.hashForSearch(userData.email),
      fullName: userData.fullName,
      dob: userData.dob,
      gender: userData.gender,
      profilePhoto: userData.profilePhoto,
      role: userData.role,
      school: userData.school,
      faculty: userData.faculty,
      department: userData.department,
      upid: userData.upid,
      isVerified: userData.isVerified,
      isActive: true,
      isSignedIn: true,
      expiresAt,
      lastActivity: now,
      deviceInfo: deviceInfo || 'Unknown',
      ipAddress: ipAddress || 'unknown',
      createdAt: now,
      updatedAt: now
    };

    if (userData.phone) {
      sessionData.phone = SessionCacheModel.encryptSensitiveData(userData.phone);
      sessionData.phoneHash = SessionCacheModel.hashForSearch(userData.phone);
    }

    if (userData.regNumber) {
      sessionData.regNumber = SessionCacheModel.encryptSensitiveData(userData.regNumber);
      sessionData.regNumberHash = SessionCacheModel.hashForSearch(userData.regNumber);
    }

    console.log('Session data prepared, creating in database...');
    const createdSession = await this.create(sessionData);
    console.log('Session created successfully with UUID:', createdSession.uuid);
    
    return createdSession;
  } catch (error) {
    console.error('Error creating full session:', error);
    throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Find active session method with better logging
SessionCacheSchema.statics.findActiveSession = async function(
  identifier: string, 
  identifierType: 'userId' | 'sessionToken' | 'uuid' = 'userId'
): Promise<ISessionCache | null> {
  try {
    const now = new Date();
    const query: Record<string, unknown> = {
      isActive: true,
      isSignedIn: true,
      expiresAt: { $gt: now }
    };

    switch (identifierType) {
      case 'userId':
        query.userId = identifier;
        break;
      case 'sessionToken':
        query.sessionToken = identifier;
        break;
      case 'uuid':
        query.uuid = identifier;
        break;
      default:
        throw new Error('Invalid identifier type');
    }

    console.log(`Finding active session by ${identifierType}:`, identifier.substring(0, 8) + '...');
    const session = await this.findOne(query).sort({ lastActivity: -1 });
    console.log('Active session found:', session ? 'Yes' : 'No');
    
    return session;
  } catch (error) {
    console.error('Error finding active session:', error);
    return null;
  }
};

// Find by UUID method
SessionCacheSchema.statics.findByUUID = async function(uuid: string): Promise<ISessionCache | null> {
  try {
    const now = new Date();
    return await this.findOne({ 
      uuid, 
      isActive: true, 
      isSignedIn: true,
      expiresAt: { $gt: now }
    });
  } catch (error) {
    console.error('Error finding session by UUID:', error);
    return null;
  }
};

// Cleanup expired sessions
SessionCacheSchema.statics.cleanupExpiredSessions = async function(): Promise<{ deletedCount: number }> {
  try {
    const now = new Date();
    const result = await this.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { isActive: false, updatedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
      ]
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired sessions`);
    return { deletedCount: result.deletedCount || 0 };
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return { deletedCount: 0 };
  }
};

// Create indexes for better performance - single index definitions to avoid duplicates
SessionCacheSchema.index({ uuid: 1 }, { unique: true });
SessionCacheSchema.index({ sessionToken: 1 }, { unique: true });
SessionCacheSchema.index({ userId: 1, isActive: 1, isSignedIn: 1 });
SessionCacheSchema.index({ expiresAt: 1 });
SessionCacheSchema.index({ emailHash: 1 });
SessionCacheSchema.index({ phoneHash: 1 });
SessionCacheSchema.index({ regNumberHash: 1 });

// Compound index for common queries
SessionCacheSchema.index({ isActive: 1, isSignedIn: 1, expiresAt: 1 });

// Create the model
const SessionCache = (mongoose.models.SessionCache || 
  mongoose.model<ISessionCache, ISessionCacheModel>('SessionCache', SessionCacheSchema)) as ISessionCacheModel;

export default SessionCache;