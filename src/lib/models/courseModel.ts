// src/lib/models/courseModel.ts
// Course with a week -> topic -> subtopic outline. A course belongs to one
// department and references the normalized University/Faculty/Department
// collections by ObjectId, with denormalised names for display. Topic ids
// will later reference Topic documents; the outline shape is kept as-is
// until that model exists.
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
export type Semester = "First" | "Second" | "Year-long";
export type CourseLevel =
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "PG"
  | "Staff";

export const COURSE_LEVELS: CourseLevel[] = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "PG",
  "Staff",
];
export const SEMESTERS: Semester[] = ["First", "Second", "Year-long"];

export interface ICourse {
  courseId: string;
  courseOutline: CourseOutlineWeek[];
  status: CourseStatus;

  // Parent references
  universityId: Types.ObjectId;
  facultyId: Types.ObjectId;
  departmentId: Types.ObjectId;

  // Denormalised names, so reads don't need joins
  universityName: string;
  universityAbbr: string;
  facultyName: string;
  departmentName: string;

  // Academic details
  courseCode: string;
  courseName: string;
  level: CourseLevel;
  semester: Semester;
  creditUnits?: number;
  description?: string;
  isElective: boolean;
  isActive: boolean;
  addedBy?: Types.ObjectId;
  verifiedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

interface CourseModel extends Model<ICourse> {
  generateCourseId(deptCode: string, level: string, courseCode: string): string;
  getCoursesForDepartment(
    departmentId: Types.ObjectId | string,
    filter?: { level?: CourseLevel; semester?: Semester },
  ): Promise<ICourse[]>;
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
    courseOutline: { type: [WeekSchema], default: [] },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
      index: true,
    },

    universityId: {
      type: Schema.Types.ObjectId,
      ref: "University",
      required: true,
      index: true,
    },
    facultyId: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },

    universityName: { type: String, required: true },
    universityAbbr: { type: String, required: true },
    facultyName: { type: String, required: true },
    departmentName: { type: String, required: true },

    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseName: { type: String, required: true, trim: true },
    level: { type: String, enum: COURSE_LEVELS, required: true },
    semester: { type: String, enum: SEMESTERS, required: true },
    creditUnits: { type: Number, min: 0 },
    description: { type: String },
    isElective: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "courses" },
);

CourseSchema.index({ departmentId: 1, courseCode: 1 }, { unique: true });
CourseSchema.index({ departmentId: 1, level: 1, semester: 1 });
CourseSchema.index({ universityId: 1, courseCode: 1 });

CourseSchema.static(
  "generateCourseId",
  function (deptCode: string, level: string, courseCode: string): string {
    return `${deptCode}-${level}-${courseCode}`
      .toLowerCase()
      .replace(/\s+/g, "");
  },
);

CourseSchema.static(
  "getCoursesForDepartment",
  function (
    this: CourseModel,
    departmentId: Types.ObjectId | string,
    filter: { level?: CourseLevel; semester?: Semester } = {},
  ) {
    const query: Record<string, unknown> = { departmentId, isActive: true };
    if (filter.level) query.level = filter.level;
    if (filter.semester) query.semester = filter.semester;
    return this.find(query)
      .sort({ level: 1, courseCode: 1 })
      .lean<ICourse[]>();
  },
);

export async function getCourseModel(): Promise<CourseModel> {
  const conn = await connectDB();
  return (conn.models.Course as CourseModel | undefined) ??
    conn.model<ICourse, CourseModel>("Course", CourseSchema);
}
