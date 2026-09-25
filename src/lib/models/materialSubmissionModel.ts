// src/lib/models/materialSubmissionModel.ts
// The bridge between a user's personal Book and the public UniLibrary. A Book
// is never promoted directly: a MaterialSubmission carries the platform
// metadata and moves through the review pipeline
//   draft -> submitted -> in_review -> verified | rejected
// A rejected submission can be edited and submitted again.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const SUBMISSION_STATUSES = [
  "draft", // saved but not yet submitted
  "submitted", // submitted for review
  "in_review", // an auditor/lecturer has picked it up
  "verified", // approved, visible in the UniLibrary
  "rejected", // rejected with a reason
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Statuses the submitter can still edit or delete. */
export const EDITABLE_SUBMISSION_STATUSES: SubmissionStatus[] = ["draft", "rejected"];
/** Statuses that mean the material is with reviewers. */
export const IN_PIPELINE_SUBMISSION_STATUSES: SubmissionStatus[] = ["submitted", "in_review"];

export const SUBMISSION_LEVELS = ["100", "200", "300", "400", "500", "PG", "Staff"] as const;
export const SUBMISSION_SEMESTERS = ["First", "Second", "Year-long"] as const;

export interface IReviewNote {
  authorId: Types.ObjectId;
  authorUpid: string;
  authorRole: string;
  note: string;
  createdAt: Date;
}

export interface IMaterialSubmission {
  _id: Types.ObjectId;

  // Source
  bookId: Types.ObjectId;
  submittedBy: Types.ObjectId;
  submittedByUpid: string;

  // Platform metadata (from the submission form)
  title: string;
  description: string;
  category: string; // MaterialCategory
  subcategory?: string;

  // Academic context
  universityId?: Types.ObjectId;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: Types.ObjectId;
  facultyName?: string;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  courseCode?: string; // "CSC301"
  courseName?: string; // "Data Structures"
  level?: (typeof SUBMISSION_LEVELS)[number];
  semester?: (typeof SUBMISSION_SEMESTERS)[number];
  academicYear?: string; // "2023/2024"

  // Discovery
  tags: string[];
  language: string;

  // Pipeline
  status: SubmissionStatus;
  submittedAt?: Date;
  reviewStartedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;

  // Review thread (append-only)
  reviewNotes: IReviewNote[];

  // Quality signals (after verification)
  viewCount: number;
  downloadCount: number;
  reportCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IMaterialSubmissionModel extends Model<IMaterialSubmission> {
  getPendingForReview(limit?: number): Promise<IMaterialSubmission[]>;
}

const ReviewNoteSchema = new Schema<IReviewNote>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorUpid: { type: String, required: true },
    authorRole: { type: String, required: true },
    note: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const MaterialSubmissionSchema = new Schema<IMaterialSubmission, IMaterialSubmissionModel>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByUpid: { type: String, required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true },
    subcategory: { type: String },

    universityId: { type: Schema.Types.ObjectId, ref: "University" },
    universityName: { type: String },
    universityAbbr: { type: String },
    facultyId: { type: Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String },
    courseCode: { type: String, trim: true, uppercase: true },
    courseName: { type: String, trim: true },
    level: { type: String, enum: SUBMISSION_LEVELS },
    semester: { type: String, enum: SUBMISSION_SEMESTERS },
    academicYear: { type: String },

    tags: [{ type: String, trim: true, lowercase: true }],
    language: { type: String, default: "English" },

    status: { type: String, enum: SUBMISSION_STATUSES, default: "draft" },
    submittedAt: { type: Date },
    reviewStartedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },

    reviewNotes: [ReviewNoteSchema],

    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "materialsubmissions" },
);

MaterialSubmissionSchema.index({ submittedBy: 1, status: 1 });
// One book can only have one submission at a time
MaterialSubmissionSchema.index({ bookId: 1 }, { unique: true });
MaterialSubmissionSchema.index({ status: 1, submittedAt: 1 });
MaterialSubmissionSchema.index({ universityId: 1, status: 1 });
MaterialSubmissionSchema.index({ departmentId: 1, status: 1 });
MaterialSubmissionSchema.index({ category: 1, status: 1 });
MaterialSubmissionSchema.index(
  { title: "text", description: "text", tags: "text", courseCode: "text" },
  { name: "submission_text" },
);

// Set submittedAt when status first moves to "submitted" via save(). The
// API routes use atomic updates and set it themselves.
MaterialSubmissionSchema.pre("save", async function () {
  if (this.isModified("status") && this.status === "submitted" && !this.submittedAt) {
    this.submittedAt = new Date();
  }
});

MaterialSubmissionSchema.statics.getPendingForReview = async function (limit = 20) {
  return this.find({ status: "submitted" })
    .sort({ submittedAt: 1 }) // oldest first
    .limit(limit)
    .lean();
};

export async function getMaterialSubmissionModel(): Promise<IMaterialSubmissionModel> {
  const conn = await connectDB();
  return (
    (conn.models.MaterialSubmission as IMaterialSubmissionModel | undefined) ??
    conn.model<IMaterialSubmission, IMaterialSubmissionModel>(
      "MaterialSubmission",
      MaterialSubmissionSchema,
    )
  );
}
