// src/models/baseMaterial.ts
import mongoose, { Schema, Document } from "mongoose";

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

interface IRating {
  userId: string;
  userUpid: string;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt?: Date;
}

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
  
  // Course info
  courseName: { type: String, required: true },
  courseId: { type: String, required: true, index: true },
  
  // Material metadata
  materialTitle: { type: String, required: true },
  materialDescription: { type: String, required: true, maxlength: 2000 },
  materialType: {
    type: String,
    enum: ["PDF", "IMAGE", "VIDEO"],
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
  
  // Content organization
  tableOfContent: [String],
  tags: [{ type: String, index: true }], // For better searchability
  keywords: [String], // SEO and search keywords
  
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

// PDF Material Model
export interface IPdfMaterial extends Document {
  muid: string;
  pmuid: string;
  topic: string;
  pdfUrl: string;
  pageCount?: number;
  isSearchable?: boolean; // OCR processed
  textContent?: string; // Extracted text for search
  fileSize: number;
  format: string;
  // All other BaseMaterial fields are inherited
}

const PdfMaterialSchema = new Schema({
  ...BaseMaterialFields,
  topic: { type: String, required: true },
  pdfUrl: { type: String, required: true },
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

// Image Material Model
export interface IImageMaterial extends Document {
  muid: string;
  pmuid: string;
  topic: string;
  imageUrls: string[];
  thumbnailUrls?: string[];
  dimensions?: { width: number; height: number }[];
  totalImages: number;
  fileSize: number;
  format: string;
}

const ImageMaterialSchema = new Schema({
  ...BaseMaterialFields,
  topic: { type: String, required: true },
  imageUrls: [{ type: String, required: true }],
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

// Video Material Model
export interface IVideoMaterial extends Document {
  muid: string;
  pmuid: string;
  topic: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  bitrate?: number;
  subtitleUrls?: string[];
  fileSize: number;
  format: string;
}

const VideoMaterialSchema = new Schema({
  ...BaseMaterialFields,
  topic: { type: String, required: true },
  videoUrl: { type: String, required: true },
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