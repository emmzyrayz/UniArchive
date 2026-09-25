// src/lib/models/university/departmentModel.ts
// A department is scoped to one faculty within one university. Both parent
// ids are stored so queries can always pin the university and a department
// can never leak across institutions.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface IDepartment {
  _id: Types.ObjectId;

  // Parent references — both required
  universityId: Types.ObjectId;
  facultyId: Types.ObjectId;

  // Denormalised for display without joins
  universityName: string;
  universityAbbr: string;
  facultyName: string;

  // Identity
  name: string; // "Computer Science"
  abbreviation?: string; // "CSC"

  // Status
  isActive: boolean;
  addedBy?: Types.ObjectId;

  // Denormalised count
  totalCourses: number;

  createdAt: Date;
  updatedAt: Date;
}

export type IDepartmentModel = Model<IDepartment>;

const DepartmentSchema = new Schema<IDepartment, IDepartmentModel>(
  {
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
    universityName: { type: String, required: true },
    universityAbbr: { type: String, required: true },
    facultyName: { type: String, required: true },

    name: { type: String, required: true, trim: true },
    abbreviation: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
    totalCourses: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "departments" },
);

// The same department name can't appear twice in one faculty of one university.
DepartmentSchema.index(
  { universityId: 1, facultyId: 1, name: 1 },
  { unique: true },
);
DepartmentSchema.index({ universityId: 1, facultyId: 1, isActive: 1 });
DepartmentSchema.index({ facultyId: 1, isActive: 1 });

export async function getDepartmentModel(): Promise<IDepartmentModel> {
  const conn = await connectDB();
  return (
    (conn.models.Department as IDepartmentModel | undefined) ??
    conn.model<IDepartment, IDepartmentModel>("Department", DepartmentSchema)
  );
}
