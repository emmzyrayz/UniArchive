// src/lib/models/courseModel.ts
// Course with a week -> topic -> subtopic outline. Topic ids will later
// reference Topic documents; the shape is kept as-is until that model exists.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface CourseOutlineSubtopic {
  id: string;
  name: string;
}

export interface CourseOutlineTopic {
  id: string;
  name: string;
  subtopics: CourseOutlineSubtopic[];
}

export interface CourseOutlineWeek {
  weekId: string;
  index: number;
  topics: CourseOutlineTopic[];
}

export type CourseStatus = "approved" | "pending" | "rejected";
export type Semester = "First" | "Second" | "Annual";

export interface ICourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  courseOutline: CourseOutlineWeek[];
  creditUnit?: number;
  semester: Semester;
  level: string;
  status: CourseStatus;
  schoolId: Types.ObjectId;
  schoolName: string;
  // Faculty and department ids are the string ids of the entries embedded
  // in the Institution document, so they are not ObjectIds.
  facultyId: string;
  facultyName: string;
  departmentId: string;
  departmentName: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseModel extends Model<ICourse> {
  generateCourseId(deptCode: string, level: string, courseCode: string): string;
}

const SubtopicSchema = new Schema<CourseOutlineSubtopic>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const TopicSchema = new Schema<CourseOutlineTopic>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    subtopics: { type: [SubtopicSchema], default: [] },
  },
  { _id: false },
);

const WeekSchema = new Schema<CourseOutlineWeek>(
  {
    weekId: { type: String, required: true },
    index: { type: Number, required: true },
    topics: { type: [TopicSchema], default: [] },
  },
  { _id: false },
);

const CourseSchema = new Schema<ICourse, CourseModel>(
  {
    courseId: { type: String, required: true, unique: true },
    courseName: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseOutline: { type: [WeekSchema], default: [] },
    creditUnit: { type: Number, min: 0 },
    semester: {
      type: String,
      enum: ["First", "Second", "Annual"],
      default: "First",
    },
    level: { type: String, required: true },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    schoolName: { type: String, required: true },
    facultyId: { type: String, required: true },
    facultyName: { type: String, required: true },
    departmentId: { type: String, required: true },
    departmentName: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "courses" },
);

CourseSchema.index({ schoolId: 1, departmentId: 1, level: 1 });
CourseSchema.index({ courseCode: 1, schoolId: 1 });

CourseSchema.static(
  "generateCourseId",
  function (deptCode: string, level: string, courseCode: string): string {
    return `${deptCode}-${level}-${courseCode}`
      .toLowerCase()
      .replace(/\s+/g, "");
  },
);

export async function getCourseModel(): Promise<CourseModel> {
  const conn = await connectDB();
  return (conn.models.Course as CourseModel | undefined) ??
    conn.model<ICourse, CourseModel>("Course", CourseSchema);
}
