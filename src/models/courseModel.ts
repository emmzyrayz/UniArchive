// /models/Course.ts
import { Schema, Document, Model } from 'mongoose';
import { connectUniPlatformDB } from "../lib/database";

// New course outline types
export interface CourseOutlineWeek {
  weekId: string;
  index: number;
  topics: CourseOutlineTopic[];
}

export interface CourseOutlineTopic {
  id: string;
  name: string;
  subtopics?: CourseOutlineSubtopic[];
}

export interface CourseOutlineSubtopic {
  id?: string;
  name?: string;
}

export interface ICourse extends Document {
  courseId: string;
  courseName: string;
  courseCode: string;
  courseOutline: CourseOutlineWeek[];
  creditUnit?: number;
  semester?: "First" | "Second" | "Annual";
  level: string;
  schoolId: string;
  schoolName: string;
  facultyId: string;
  facultyName: string;
  departmentId: string;
  departmentName: string;
  status?: "approved" | "pending" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
}

const CourseSchema = new Schema<ICourse>({
  courseId: { type: String, unique: true, required: true, index: true },
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true, unique: false },
  courseOutline: [
    {
      weekId: { type: String, required: true },
      index: { type: Number, required: true },
      topics: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          subtopics: [
            {
              id: { type: String },
              name: { type: String },
            },
          ],
        },
      ],
    },
  ],
  creditUnit: { type: Number },
  semester: {
    type: String,
    enum: ["First", "Second", "Annual"],
    default: "First",
  },
  level: { type: String, required: true },

  schoolId: { type: String, required: true },
  schoolName: { type: String, required: true },
  facultyId: { type: String, required: true },
  facultyName: { type: String, required: true },
  departmentId: { type: String, required: true },
  departmentName: { type: String, required: true },

  status: {
    type: String,
    enum: ["approved", "pending", "rejected"],
    default: "approved",
  }, // Add status field

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

// Add index for better query performance
CourseSchema.index({ schoolId: 1, departmentId: 1, level: 1 });
CourseSchema.index({ courseCode: 1, schoolId: 1 });
CourseSchema.index({ status: 1 }); 

// Update the updatedAt field on save
CourseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export async function getCourseModel(): Promise<Model<ICourse>> {
  const conn = await connectUniPlatformDB();
  if (conn.models.Course) {
    return conn.models.Course as Model<ICourse>;
  }
  return conn.model<ICourse>('Course', CourseSchema);
}

export const generateCourseId = (deptCode: string, level: string, courseCode: string) => {
  return `${deptCode}-${level}-${courseCode}`.toLowerCase();
};

// Optional: Export a default Course model for simpler usage
let courseModelCache: Model<ICourse> | null = null;

export const Course = {
  async getModel(): Promise<Model<ICourse>> {
    if (!courseModelCache) {
      courseModelCache = await getCourseModel();
    }
    return courseModelCache;
  }
};