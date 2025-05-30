import mongoose, { Schema, Document, Model } from 'mongoose';
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-32-chars';



// Session Cache Interface
export interface ISessionCache extends Document {
  userId: string;
  email: string; // Encrypted
  emailHash: string; // For searching
  sessionToken: string; // Encrypted
  sessionTokenHash: string; // For searching
  isSignedIn: boolean;
  signInTime: Date;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  lastActivity: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
interface ISessionCacheStatics {
  // Encryption/Decryption methods
  encryptSensitiveData(data: string): string;
  decryptSensitiveData(encryptedData: string): string;
  hashForSearch(data: string): string;
  generateSessionToken(userId: string, email: string, signInTime: Date): string;
  
  // Session management methods
  createSession(
    userId: string,
    email: string,
    sessionToken: string,
    expirationHours?: number,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<ISessionCache>;
  
  findActiveSession(
    identifier: string,
    type?: 'userId' | 'email' | 'sessionToken'
  ): Promise<ISessionCache | null>;
  
  updateActivity(sessionToken: string): Promise<ISessionCache | null>;
  
  invalidateSession(sessionToken: string): Promise<ISessionCache | null>;
  
  invalidateAllUserSessions(userId: string): Promise<{ modifiedCount: number }>;
  
  cleanupExpiredSessions(): Promise<{ deletedCount: number }>;
}


// Combined model interface
interface ISessionCacheModel extends Model<ISessionCache>, ISessionCacheStatics {}

// Deterministic encryption function (same as User model)
const encryptSensitiveData = (data: string): string => {
  const hash = CryptoJS.SHA256(data + ENCRYPTION_KEY);
  const iv = CryptoJS.lib.WordArray.create(hash.words.slice(0, 4));
  
  const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return encrypted.toString();
};

// Decryption function (same as User model)
const decryptSensitiveData = (encryptedData: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!result) {
      throw new Error("Failed to decrypt data - invalid encrypted data or key");
    }
    
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid encrypted data');
  }
};

// Hash function for searchable fields (same as User model)
const hashForSearch = (data: string): string => {
  return CryptoJS.SHA256(data + ENCRYPTION_KEY + 'search-salt').toString();
};

// Generate deterministic session token based on user data
const generateSessionToken = (userId: string, email: string, signInTime: Date): string => {
  // Create a deterministic token based on user data and signin time
  const tokenData = `${userId}_${email}_${signInTime.getTime()}`;
  const hash = CryptoJS.SHA256(tokenData + ENCRYPTION_KEY + 'session-salt');
  return hash.toString();
};

// Query interface for type safety
interface SessionQuery {
  isSignedIn: boolean;
  expiresAt: { $gt: Date };
  userId?: string;
  email?: string;
  emailHash?: string;
  sessionToken?: string;
  sessionTokenHash?: string;
  isActive?: boolean;
}

// Session Cache Schema
const SessionCacheSchema = new Schema<ISessionCache>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String, // Encrypted
    required: true
  },
  emailHash: {
    type: String, // For searching
    required: true,
    index: true
  },
  sessionToken: {
    type: String, // Encrypted
    required: true
  },
  sessionTokenHash: {
    type: String, // For searching
    required: true,
    unique: true,
    index: true
  },
  isSignedIn: {
    type: Boolean,
    required: true,
    default: true
  },
  signInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  deviceInfo: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  lastActivity: {
    type: Date,
    required: true,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
SessionCacheSchema.index({ userId: 1, isSignedIn: 1 });
SessionCacheSchema.index({ emailHash: 1, isSignedIn: 1 });
SessionCacheSchema.index({ sessionTokenHash: 1, isActive: 1 });
SessionCacheSchema.index({ expiresAt: 1, isActive: 1 });

// TTL index for automatic document expiration
SessionCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods for encryption
SessionCacheSchema.statics.encryptSensitiveData = encryptSensitiveData;
SessionCacheSchema.statics.decryptSensitiveData = decryptSensitiveData;
SessionCacheSchema.statics.hashForSearch = hashForSearch;
SessionCacheSchema.statics.generateSessionToken = generateSessionToken;


// Static methods for session management
SessionCacheSchema.statics.createSession = async function(
  userId: string, 
  email: string, 
  sessionToken: string,
  expirationHours: number = 24 * 7, // Default 7 days
  deviceInfo?: string,
  ipAddress?: string
) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expirationHours);

  // Encrypt sensitive data
  const encryptedEmail = encryptSensitiveData(email);
  const encryptedSessionToken = encryptSensitiveData(sessionToken);
  
  // Create hashes for searching
  const emailHash = hashForSearch(email);
  const sessionTokenHash = hashForSearch(sessionToken);

  // Optional: Remove any existing sessions for this user (for single session per user)
  // await this.updateMany({ userId }, { isSignedIn: false, isActive: false });

  const session = new this({
    userId,
    email: encryptedEmail,
    emailHash,
    sessionToken: encryptedSessionToken,
    sessionTokenHash,
    expiresAt,
    deviceInfo,
    ipAddress,
    isSignedIn: true,
    signInTime: new Date(),
    lastActivity: new Date(),
    isActive: true
  });

  return await session.save();
};

SessionCacheSchema.statics.findActiveSession = async function(
  identifier: string, // Can be userId, email, or sessionToken
  type: 'userId' | 'email' | 'sessionToken' = 'sessionToken'
) {
  const query: SessionQuery = {
    isSignedIn: true,
    expiresAt: { $gt: new Date() },
    isActive: true
  };

  switch (type) {
    case 'userId':
      query.userId = identifier;
      break;
    case 'email':
      query.emailHash = hashForSearch(identifier);
      break;
    case 'sessionToken':
      query.sessionTokenHash = hashForSearch(identifier);
      break;
  }

  return await this.findOne(query);
};

SessionCacheSchema.statics.updateActivity = async function(sessionToken: string) {
  const sessionTokenHash = hashForSearch(sessionToken);
  
  return await this.findOneAndUpdate(
    { 
      sessionTokenHash, 
      isSignedIn: true,
      isActive: true
    },
    { lastActivity: new Date() },
    { new: true }
  );
};

SessionCacheSchema.statics.invalidateSession = async function(sessionToken: string) {
  const sessionTokenHash = hashForSearch(sessionToken);
  
  return await this.findOneAndUpdate(
    { sessionTokenHash },
    { 
      isSignedIn: false,
      isActive: false
    },
    { new: true }
  );
};

SessionCacheSchema.statics.invalidateAllUserSessions = async function(userId: string) {
  return await this.updateMany(
    { userId },
    { 
      isSignedIn: false,
      isActive: false
    }
  );
};

SessionCacheSchema.statics.cleanupExpiredSessions = async function() {
  return await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { 
        isSignedIn: false, 
        isActive: false,
        updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Clean up invalidated sessions older than 1 day
      }
    ]
  });
};

const SessionCache = (mongoose.models.SessionCache || 
  mongoose.model<ISessionCache, ISessionCacheModel>('SessionCache', SessionCacheSchema)) as ISessionCacheModel;

export default SessionCache;
export type { ISessionCacheModel };