// /types/materialUpload.ts
// Types for frontend upload payloads matching backend models

// Comment Reply Interface
export interface ICommentReply {
  replyId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  likes: number;
}

// Comment Interface
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
  replies: ICommentReply[];
}

// Rating Interface
export interface IRating {
  userId: string;
  userUpid: string;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Analytics View History Interface
export interface IViewHistory {
  userId: string;
  timestamp: Date;
  duration?: number;
  device?: string;
  location?: string;
}

// Analytics Download History Interface
export interface IDownloadHistory {
  userId: string;
  timestamp: Date;
  device?: string;
  location?: string;
}

// Analytics Interface
export interface IAnalytics {
  totalViews: number;
  totalDownloads: number;
  uniqueViewers: string[];
  uniqueDownloaders: string[];
  viewHistory: IViewHistory[];
  downloadHistory: IDownloadHistory[];
  lastViewedAt?: Date;
  lastDownloadedAt?: Date;
}

// Base Material Type with all fields
export type MaterialUploadBase = {
  // Unique Material Identifiers
  muid: string;
  pmuid: string;
  
  // Uploader info
  uploaderName: string;
  uploaderUpid: string;
  
  // School info
  schoolName: string;
  schoolId: string;
  facultyName: string;
  facultyId: string;
  departmentName: string;
  departmentId: string;
  courseName: string;
  courseId: string;
  
  // Material metadata
  materialTitle: string;
  materialDescription: string;
  materialType: 'PDF' | 'IMAGE' | 'VIDEO';
  
  // File metadata
  fileSize: number;
  format: string;
  originalFileName: string;
  
  // Status and visibility
  isApproved?: boolean;
  isPublic?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  
  // Content organization
  tableOfContent?: string[];
  tags?: string[];
  keywords?: string[];
  
  // Ratings and Comments
  comments?: IComment[];
  ratings?: IRating[];
  averageRating?: number;
  totalRatings?: number;
  
  // Analytics
  analytics?: IAnalytics;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  
  // Moderation
  reportCount?: number;
  isReported?: boolean;
  moderationNotes?: string;
};

// PDF Material Upload Type
export type PdfMaterialUpload = MaterialUploadBase & {
  topic: string;
  pdfUrl: string;
  pageCount?: number;
  isSearchable?: boolean;
  textContent?: string;
  thumbnailUrl?: string;
};

// Image Material Upload Type
export type ImageMaterialUpload = MaterialUploadBase & {
  topic: string;
  imageUrls: string[];
  thumbnailUrls?: string[];
  dimensions?: { width: number; height: number }[];
  totalImages: number;
  isProcessed?: boolean;
  ocrText?: string[];
};

// Video Material Upload Type
export type VideoMaterialUpload = MaterialUploadBase & {
  topic: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  bitrate?: number;
  fps?: number;
  subtitleUrls?: string[];
  previewUrl?: string;
  isProcessed?: boolean;
  streamingUrls?: {
    hd?: string;
    sd?: string;
    mobile?: string;
  };
};

// Union type for all material uploads
export type MaterialUpload = PdfMaterialUpload | ImageMaterialUpload | VideoMaterialUpload;

// Response types for API responses (with MongoDB _id)
export type MaterialUploadResponse<T = MaterialUpload> = T & {
  _id: string;
};

// Utility types for creating materials (without auto-generated fields)
export type CreateMaterialBase = Omit<MaterialUploadBase, 
  'muid' | 'pmuid' | 'createdAt' | 'updatedAt' | 'analytics' | 'comments' | 'ratings' | 'averageRating' | 'totalRatings' | 'reportCount' | 'isReported'
>;

export type CreatePdfMaterial = Omit<PdfMaterialUpload, 
  'muid' | 'pmuid' | 'createdAt' | 'updatedAt' | 'analytics' | 'comments' | 'ratings' | 'averageRating' | 'totalRatings' | 'reportCount' | 'isReported'
>;

export type CreateImageMaterial = Omit<ImageMaterialUpload, 
  'muid' | 'pmuid' | 'createdAt' | 'updatedAt' | 'analytics' | 'comments' | 'ratings' | 'averageRating' | 'totalRatings' | 'reportCount' | 'isReported'
>;

export type CreateVideoMaterial = Omit<VideoMaterialUpload, 
  'muid' | 'pmuid' | 'createdAt' | 'updatedAt' | 'analytics' | 'comments' | 'ratings' | 'averageRating' | 'totalRatings' | 'reportCount' | 'isReported'
>;

// Types for updating materials (all fields optional except id)
export type UpdateMaterialBase = Partial<MaterialUploadBase> & {
  _id: string;
};

export type UpdatePdfMaterial = Partial<PdfMaterialUpload> & {
  _id: string;
};

export type UpdateImageMaterial = Partial<ImageMaterialUpload> & {
  _id: string;
};

export type UpdateVideoMaterial = Partial<VideoMaterialUpload> & {
  _id: string;
};

// Helper types for analytics operations
export type AnalyticsUpdate = {
  materialId: string;
  userId: string;
  materialType: 'PDF' | 'IMAGE' | 'VIDEO';
  duration?: number;
  device?: string;
  location?: string;
};

// Helper types for comments and ratings
export type AddCommentPayload = {
  materialId: string;
  userId: string;
  userName: string;
  userUpid: string;
  content: string;
};

export type AddReplyPayload = {
  materialId: string;
  commentId: string;
  userId: string;
  userName: string;
  content: string;
};

export type AddRatingPayload = {
  materialId: string;
  userId: string;
  userUpid: string;
  rating: number;
  review?: string;
};

// Search and filter types
export type MaterialSearchFilters = {
  materialType?: 'PDF' | 'IMAGE' | 'VIDEO';
  courseId?: string;
  facultyId?: string;
  departmentId?: string;
  tags?: string[];
  isApproved?: boolean;
  isPublic?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  uploaderUpid?: string;
  minRating?: number;
  createdAfter?: Date;
  createdBefore?: Date;
};

export type MaterialSortOptions = {
  field: 'createdAt' | 'updatedAt' | 'averageRating' | 'totalViews' | 'totalDownloads';
  order: 'asc' | 'desc';
};

// Pagination types
export type PaginationOptions = {
  page: number;
  limit: number;
  sort?: MaterialSortOptions;
  filters?: MaterialSearchFilters;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};