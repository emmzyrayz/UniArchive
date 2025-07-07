// src/models/baseMaterial.ts
import mongoose, { Schema, Document } from "mongoose";


// Base interface for all material types
export interface IBaseMaterial {
  // Unique Material Identifiers
  muid: string;
  pmuid: string;
  
  // Uploader info
  uploaderName: string;
  uploaderUpid: string;
  uploaderRole: "admin" | "mod" | "contributor";
  
  // Course info
  courseName: string;
  courseId: string;
  
  // Material metadata
  materialTitle: string;
  materialDescription: string;
  materialType: "PDF" | "IMAGE" | "VIDEO" | "TEXT";
  
  // File metadata
  fileSize: number;
  format: string;
  originalFileName: string;
  
  // Status and visibility
  isApproved: boolean;
  isPublic: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";

  approvalHistory: IApprovalRecord[];
  rejectionReason?: string;
  moderatorNotes?: string;
  approvedBy?: string; // Admin/mod who approved
  approvedAt?: Date;
  rejectedBy?: string; // Admin/mod who rejected
  rejectedAt?: Date;
  
  // Content organization
  tableOfContent: string[];
  tags: string[];
  keywords: string[];
  schoolName: string;
  facultyName: string;
  departmentName: string;
  
  // Ratings and Comments
  comments: IComment[];
  ratings: IRating[];
  averageRating: number;
  totalRatings: number;
  
  // Analytics
  analytics: IAnalytics;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  
  // Moderation
  reportCount: number;
  isReported: boolean;

  version: number;
  editHistory: IEditRecord[];
  lastEditedBy?: string;
  lastEditedAt?: Date;
}

// New interfaces for approval workflow
export interface IApprovalRecord {
  actionType: "SUBMITTED" | "APPROVED" | "REJECTED" | "RESUBMITTED";
  performedBy: string; // upid of user
  performedByName: string;
  performedByRole: "admin" | "mod" | "contributor";
  timestamp: Date;
  notes?: string;
  reason?: string; // For rejections
}

export interface IEditRecord {
  editedBy: string; // upid
  editedByName: string;
  editedByRole: "admin" | "mod" | "contributor";
  timestamp: Date;
  changedFields: string[];
  previousVersion: number;
  reason?: string;
}

// Comment interface
export interface IComment {
  commentId: string;
  userId: string;
  userName: string;
  userUpid: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
  likes: number;
  replies: IReply[];
}

// Reply interface
export interface IReply {
  replyId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  likes: number;
}

// Rating interface
export interface IRating {
  userId: string;
  userUpid: string;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Analytics interface
export interface IAnalytics {
  totalViews: number;
  totalDownloads: number;
  uniqueViewers: string[];
  uniqueDownloaders: string[];
  viewHistory: IViewRecord[];
  downloadHistory: IDownloadRecord[];
  lastViewedAt?: Date;
  lastDownloadedAt?: Date;
}

export interface IViewRecord {
  userId: string;
  timestamp: Date;
  duration?: number;
  device?: string;
  location?: string;
}

export interface IDownloadRecord {
  userId: string;
  timestamp: Date;
  device?: string;
  location?: string;
}

// Updated material interfaces that extend both base interface and Document
export interface IPdfMaterial extends IBaseMaterial, Document {
  materialType: "PDF";
  topic: string;
  pdfUrl: string;
  fileName: string; // Backblaze storage file name (required for signed URL)
  signedUrl?: string; // Signed URL for secure access
  pageCount?: number;
  isSearchable?: boolean;
  textContent?: string;
  thumbnailUrl?: string;
}

export interface IImageMaterial extends IBaseMaterial, Document {
  materialType: "IMAGE";
  topic: string;
  imageUrls: string[];
  fileNames: string[]; // Array of Backblaze storage file names
  signedUrls?: string[]; // Array of signed URLs for secure access
  thumbnailUrls?: string[];
  dimensions?: { width: number; height: number }[];
  totalImages: number;
  isProcessed?: boolean;
  ocrText?: string[];
}

export interface IVideoMaterial extends IBaseMaterial, Document {
  materialType: "VIDEO";
  topic: string;
  videoUrl: string;
  fileName: string; // Backblaze storage file name (required for signed URL)
  signedUrl?: string; // Signed URL for secure access
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  bitrate?: number;
  subtitleUrls?: string[];
  previewUrl?: string;
  isProcessed?: boolean;
  fps?: number;
  streamingUrls?: {
    hd?: string;
    sd?: string;
    mobile?: string;
  };
}

// Union type for all material types
export type Material = IPdfMaterial | IImageMaterial | IVideoMaterial;

// Helper type for creating/updating materials (without Document-specific fields)
export type MaterialInput = Omit<IBaseMaterial, '_id' | '__v' | 'createdAt' | 'updatedAt' | 'muid' | 'pmuid' > & {
  materialType: "PDF" | "IMAGE" | "VIDEO" | "TEXT";
  // Type-specific fields
  topic?: string;
  pdfUrl?: string;
  pageCount?: number;
  isSearchable?: boolean;
  textContent?: string;
  thumbnailUrl?: string;

  imageUrls?: string[];
  thumbnailUrls?: string[];
  dimensions?: { width: number; height: number }[];
  totalImages?: number;
  isProcessed?: boolean;
  ocrText?: string[];

  videoUrl?: string;
  duration?: number;
  resolution?: string;
  bitrate?: number;
  subtitleUrls?: string[];
  previewUrl?: string;
  fps?: number;
  streamingUrls?: {
    hd?: string;
    sd?: string;
    mobile?: string;
  };

  // Add these fields for cloud storage
  materialUrl?: string;  // Generic URL field for any material type
  fileName?: string;     // Cloud storage file name
  cloudFileName?: string; // Cloud-specific file name
  cloudPublicId?: string; // For Cloudinary
  mimeType?: string;     // File MIME type
  fileSize?: number;     // File size (this already exists in IBaseMaterial, but include here for clarity)

  // Make sure all new optional fields are properly typed
  uploaderRole?: "admin" | "mod" | "contributor";
  approvalHistory?: IApprovalRecord[];
  rejectionReason?: string;
  moderatorNotes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  version?: number;
  editHistory?: IEditRecord[];
  lastEditedBy?: string;
  lastEditedAt?: Date;
};

// Comment subdocument schema
const CommentSchema = new Schema({
  commentId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userUpid: { type: String, required: true },
  content: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isEdited: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  replies: [{
    replyId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 }
  }]
}, { _id: false });

// Rating subdocument schema
const RatingSchema = new Schema({
  userId: { type: String, required: true },
  userUpid: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
}, { _id: false });

// Analytics subdocument schema
const AnalyticsSchema = new Schema({
  totalViews: { type: Number, default: 0 },
  totalDownloads: { type: Number, default: 0 },
  uniqueViewers: [{ type: String }], // Array of user IDs
  uniqueDownloaders: [{ type: String }], // Array of user IDs
  viewHistory: [{
    userId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number }, // Time spent viewing (in seconds)
    device: { type: String }, // mobile, desktop, tablet
    location: { type: String } // IP-based location (optional)
  }],
  downloadHistory: [{
    userId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    device: { type: String },
    location: { type: String }
  }],
  lastViewedAt: { type: Date },
  lastDownloadedAt: { type: Date }
}, { _id: false });

export const BaseMaterialFields = {
  // Unique Material Identifiers
  muid: { 
    type: String, 
    required: true, 
    unique: true,
    index: true // For faster queries
  }, // Material Unique ID
  pmuid: { 
    type: String, 
    required: true, 
    unique: true,
    index: true // For faster queries
  }, // Platform Material Unique ID
  
  // Uploader info
  uploaderName: { type: String, required: true },
  uploaderUpid: { type: String, required: true, index: true },
  uploaderRole: {
    type: String,
    enum: ["admin", "mod", "contributor"],
    required: true
  },
  
  // Course info
  courseName: { type: String, required: true },
  courseId: { type: String, required: true, index: true },
  
  // Material metadata
  materialTitle: { type: String, required: true },
  materialDescription: { type: String, required: true, maxlength: 2000 },
  materialType: {
    type: String,
    enum: ["PDF", "IMAGE", "VIDEO", "TEXT"],
    required: true,
    index: true
  },
  
  // File metadata
  fileSize: { type: Number, required: true }, // Size in bytes
  format: { type: String, required: true }, // File format (e.g., 'pdf', 'jpg', 'mp4')
  originalFileName: { type: String, required: true },
  
  // Status and visibility
  isApproved: { type: Boolean, default: false, index: true },
  isPublic: { type: Boolean, default: true, index: true },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "ARCHIVED"],
    default: "PENDING",
    index: true
  },

  // NEW: Approval workflow fields
  approvalHistory: [{
    actionType: {
      type: String,
      enum: ["SUBMITTED", "APPROVED", "REJECTED", "RESUBMITTED"],
      required: true
    },
    performedBy: { type: String, required: true },
    performedByName: { type: String, required: true },
    performedByRole: {
      type: String,
      enum: ["admin", "mod", "contributor"],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
    reason: { type: String }
  }],
  rejectionReason: { type: String },
  moderatorNotes: { type: String },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  rejectedBy: { type: String },
  rejectedAt: { type: Date },

  // NEW: Version control fields
  version: { type: Number, default: 1 },
  editHistory: [{
    editedBy: { type: String, required: true },
    editedByName: { type: String, required: true },
    editedByRole: {
      type: String,
      enum: ["admin", "mod", "contributor"],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    changedFields: [{ type: String }],
    previousVersion: { type: Number, required: true },
    reason: { type: String }
  }],
  lastEditedBy: { type: String },
  lastEditedAt: { type: Date },
  
  // Content organization
  tableOfContent: [String],
  tags: [{ type: String, index: true }], // For better searchability
  keywords: [String], // SEO and search keywords
  schoolName: { type: String, required: true },
  facultyName: { type: String, required: true },
  departmentName: { type: String, required: true },
  
  // Ratings and Comments
  comments: [CommentSchema],
  ratings: [RatingSchema],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  
  // Analytics
  analytics: { type: AnalyticsSchema, default: () => ({}) },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date },
  
  // Moderation
  reportCount: { type: Number, default: 0 },
  isReported: { type: Boolean, default: false },
  moderationNotes: { type: String }
};

// PDF Material Schema
const PdfMaterialSchema = new Schema({
  ...BaseMaterialFields,
  topic: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  fileName: { type: String, required: true }, // Backblaze storage file name
  signedUrl: { type: String }, // Signed URL for secure access
  pageCount: { type: Number },
  isSearchable: { type: Boolean, default: false },
  textContent: { type: String }, // For full-text search
  thumbnailUrl: { type: String } // Preview thumbnail
});

// Add compound indexes for better query performance
PdfMaterialSchema.index({ courseId: 1, materialType: 1, isApproved: 1 });
PdfMaterialSchema.index({ uploaderUpid: 1, createdAt: -1 });
PdfMaterialSchema.index({ tags: 1, isPublic: 1 });

export const PdfMaterial = mongoose.models.PdfMaterial || 
  mongoose.model<IPdfMaterial>("PdfMaterial", PdfMaterialSchema);

// Image Material Schema
const ImageMaterialSchema = new Schema({
...BaseMaterialFields,
topic: { type: String, required: true },
imageUrls: [{ type: String, required: true }],
fileNames: [{ type: String, required: true }], // Array of Backblaze storage file names
signedUrls: [String], // Array of signed URLs for secure access
thumbnailUrls: [String], // Compressed versions for quick loading
dimensions: [{
width: { type: Number },
height: { type: Number }
}],
totalImages: { type: Number, required: true, min: 1 },
isProcessed: { type: Boolean, default: false }, // Image processing status
ocrText: [String] // OCR extracted text from images
});

ImageMaterialSchema.index({ courseId: 1, materialType: 1, isApproved: 1 });
ImageMaterialSchema.index({ uploaderUpid: 1, createdAt: -1 });

export const ImageMaterial = mongoose.models.ImageMaterial || 
  mongoose.model<IImageMaterial>("ImageMaterial", ImageMaterialSchema);

// Video Material Schema
const VideoMaterialSchema = new Schema({
  ...BaseMaterialFields,
  topic: { type: String, required: true },
  videoUrl: { type: String, required: true },
  fileName: { type: String, required: true }, // Backblaze storage file name
  signedUrl: { type: String }, // Signed URL for secure access
  thumbnailUrl: { type: String },
  duration: { type: Number }, // Duration in seconds
  resolution: { type: String }, // e.g., "1920x1080", "720p"
  bitrate: { type: Number }, // Video bitrate
  fps: { type: Number }, // Frames per second
  subtitleUrls: [String], // Multiple subtitle files
  previewUrl: { type: String }, // Short preview clip
  isProcessed: { type: Boolean, default: false }, // Video processing status
  streamingUrls: {
    hd: { type: String },
    sd: { type: String },
    mobile: { type: String }
  }
});

VideoMaterialSchema.index({ courseId: 1, materialType: 1, isApproved: 1 });
VideoMaterialSchema.index({ uploaderUpid: 1, duration: 1 });

export const VideoMaterial = mongoose.models.VideoMaterial || 
  mongoose.model<IVideoMaterial>("VideoMaterial", VideoMaterialSchema);

// Utility functions for generating unique IDs
export const generateMUID = (): string => {
  return `MUID_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generatePMUID = (materialType: string): string => {
  const prefix = materialType.substring(0, 3).toUpperCase();
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Helper function to update analytics
export const updateViewAnalytics = async (
  materialId: string, 
  userId: string, 
  materialType: string,
  duration?: number,
  device?: string,
  location?: string
) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  await Model.findByIdAndUpdate(materialId, {
    $inc: { 'analytics.totalViews': 1 },
    $addToSet: { 'analytics.uniqueViewers': userId },
    $push: {
      'analytics.viewHistory': {
        userId,
        timestamp: new Date(),
        duration,
        device,
        location
      }
    },
    $set: { 'analytics.lastViewedAt': new Date() }
  });
};

export const updateDownloadAnalytics = async (
  materialId: string, 
  userId: string, 
  materialType: string,
  device?: string,
  location?: string
) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  await Model.findByIdAndUpdate(materialId, {
    $inc: { 'analytics.totalDownloads': 1 },
    $addToSet: { 'analytics.uniqueDownloaders': userId },
    $push: {
      'analytics.downloadHistory': {
        userId,
        timestamp: new Date(),
        device,
        location
      }
    },
    $set: { 'analytics.lastDownloadedAt': new Date() }
  });
};

// Helper function to calculate and update average rating
export const updateAverageRating = async (materialId: string, materialType: string) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  const material = await Model.findById(materialId);
  if (material && material.ratings.length > 0) {
    const sum = material.ratings.reduce((acc: number, rating: IRating) => acc + rating.rating, 0);
    const average = sum / material.ratings.length;
    
    await Model.findByIdAndUpdate(materialId, {
      averageRating: Math.round(average * 10) / 10, // Round to 1 decimal place
      totalRatings: material.ratings.length
    });
  }
};


// Helper functions for approval workflow and version control

// Add approval record to material
export const addApprovalRecord = async (
  materialId: string,
  materialType: string,
  approvalData: {
    actionType: "SUBMITTED" | "APPROVED" | "REJECTED" | "RESUBMITTED";
    performedBy: string;
    performedByName: string;
    performedByRole: "admin" | "mod" | "contributor";
    notes?: string;
    reason?: string;
  }
) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  const approvalRecord: IApprovalRecord = {
    ...approvalData,
    timestamp: new Date()
  };

  await Model.findByIdAndUpdate(materialId, {
    $push: { approvalHistory: approvalRecord }
  });
};

// Approve material
export const approveMaterial = async (
  materialId: string,
  materialType: string,
  approvedBy: string,
  approvedByName: string,
  approvedByRole: "admin" | "mod",
  notes?: string
) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  const now = new Date();
  
  await Model.findByIdAndUpdate(materialId, {
    $set: {
      status: "APPROVED",
      isApproved: true,
      approvedBy,
      approvedAt: now
    },
    $push: {
      approvalHistory: {
        actionType: "APPROVED",
        performedBy: approvedBy,
        performedByName: approvedByName,
        performedByRole: approvedByRole,
        timestamp: now,
        notes
      }
    }
  });
};

// Reject material
export const rejectMaterial = async (
  materialId: string,
  materialType: string,
  rejectedBy: string,
  rejectedByName: string,
  rejectedByRole: "admin" | "mod",
  reason: string,
  notes?: string
) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  const now = new Date();
  
  await Model.findByIdAndUpdate(materialId, {
    $set: {
      status: "REJECTED",
      isApproved: false,
      rejectedBy,
      rejectedAt: now,
      rejectionReason: reason
    },
    $push: {
      approvalHistory: {
        actionType: "REJECTED",
        performedBy: rejectedBy,
        performedByName: rejectedByName,
        performedByRole: rejectedByRole,
        timestamp: now,
        reason,
        notes
      }
    }
  });
};

// Add edit record when material is updated
export const addEditRecord = async (
  materialId: string,
  materialType: string,
  editData: {
    editedBy: string;
    editedByName: string;
    editedByRole: "admin" | "mod" | "contributor";
    changedFields: string[];
    reason?: string;
  }
) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  // Get current version
  const material = await Model.findById(materialId);
  if (!material) throw new Error('Material not found');
  
  const currentVersion = material.version || 1;
  const newVersion = currentVersion + 1;
  const now = new Date();
  
  const editRecord: IEditRecord = {
    ...editData,
    timestamp: now,
    previousVersion: currentVersion
  };

  await Model.findByIdAndUpdate(materialId, {
    $set: {
      version: newVersion,
      lastEditedBy: editData.editedBy,
      lastEditedAt: now,
      updatedAt: now
    },
    $push: { editHistory: editRecord }
  });
};

// Get material approval status
export const getMaterialApprovalStatus = async (materialId: string, materialType: string) => {
  const Model = materialType === 'PDF' ? PdfMaterial : 
               materialType === 'IMAGE' ? ImageMaterial : VideoMaterial;
  
  const material = await Model.findById(materialId).select('status isApproved approvalHistory rejectionReason');
  return material;
};

// Get materials pending approval
export const getMaterialsPendingApproval = async (limit: number = 50) => {
  const pdfMaterials = await PdfMaterial.find({ status: "PENDING" }).limit(limit);
  const imageMaterials = await ImageMaterial.find({ status: "PENDING" }).limit(limit);
  const videoMaterials = await VideoMaterial.find({ status: "PENDING" }).limit(limit);
  
  return {
    pdf: pdfMaterials,
    image: imageMaterials,
    video: videoMaterials,
    total: pdfMaterials.length + imageMaterials.length + videoMaterials.length
  };
};