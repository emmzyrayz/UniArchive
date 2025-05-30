import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-32-chars';

export interface IUser extends Document {
  fullName: string;
  email: string;
  emailHash: string; // For searching
  password: string;
  role: "admin" | "contributor" | "student" | "mod";
  dob: Date;
  phone: string;
  phoneHash: string; // For searching
  gender: "Male" | "Female" | "Other";
  profilePhoto?: string;
  school: string;
  faculty: string;
  department: string;
  regNumber: string;
  regNumberHash: string; // For searching
  uuid: string;
  upid: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Interface for static methods
interface IUserModel extends Model<IUser> {
  generateUUID(dob: Date, phone: string): string;
  generateUPID(fullName: string, school: string): string;
  encryptSensitiveData(data: string): string;
  decryptSensitiveData(encryptedData: string): string;
  hashForSearch(data: string): string;
}

// Deterministic encryption function
const encryptSensitiveData = (data: string): string => {
  // Create a consistent IV from the data and encryption key
  const hash = CryptoJS.SHA256(data + ENCRYPTION_KEY);
  const iv = CryptoJS.lib.WordArray.create(hash.words.slice(0, 4)); // Use first 128 bits as IV
  
  const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return encrypted.toString();
};

// Decryption function
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

// Hash function for searchable fields (one-way hash)
const hashForSearch = (data: string): string => {
  return CryptoJS.SHA256(data + ENCRYPTION_KEY + 'search-salt').toString();
};

const UserSchema: Schema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true }, // Encrypted version
    emailHash: { type: String, required: true, unique: true }, // For searching
    password: { type: String, required: true },
    dob: { type: Date, required: true },
    phone: { type: String, required: true }, // Encrypted version
    phoneHash: { type: String, required: true }, // For searching
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    profilePhoto: { type: String },
    role: {
      type: String,
      enum: ["admin", "contributor", "student", "mod"],
      default: "student",
    },
    school: { type: String, required: true },
    faculty: { type: String, required: true },
    department: { type: String, required: true },
    regNumber: { type: String, required: true }, // Encrypted version
    regNumberHash: { type: String, required: true, unique: true }, // For searching
    uuid: { type: String, required: true, unique: true },
    upid: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate UUID (16-18 digits for system tracking)
UserSchema.statics.generateUUID = function(dob: Date, phone: string): string {
  const dobYear = dob.getFullYear().toString().slice(-2);
  const dobMonth = String(dob.getMonth() + 1).padStart(2, '0');
  const dobDay = String(dob.getDate()).padStart(2, '0');
  const phoneLastFour = phone.slice(-4);
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const timestamp = Date.now().toString().slice(-3);
  
  return `${dobYear}${dobMonth}${dobDay}${phoneLastFour}${randomNum}${timestamp}`;
};

// Generate UPID (Human readable platform ID)
UserSchema.statics.generateUPID = function(fullName: string, school: string): string {
  const nameInitials = fullName.split(' ').map(n => n.charAt(0)).join('').toLowerCase();
  const schoolInitials = school.split(' ').map(s => s.charAt(0)).join('').toLowerCase();
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return `${nameInitials}${schoolInitials}${randomNum}`;
};

// Static encryption/decryption methods
UserSchema.statics.encryptSensitiveData = encryptSensitiveData;
UserSchema.statics.decryptSensitiveData = decryptSensitiveData;
UserSchema.statics.hashForSearch = hashForSearch;

const User = mongoose.models.User || mongoose.model<IUser, IUserModel>("User", UserSchema);

export default User as IUserModel;