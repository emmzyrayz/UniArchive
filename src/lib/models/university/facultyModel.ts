// src/lib/models/university/facultyModel.ts
// A faculty belongs to exactly one university. "Faculty of Engineering" at
// UNIZIK and at UNN are separate documents, never a shared pool.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface IFaculty {
  _id: Types.ObjectId;

  // Parent reference
  universityId: Types.ObjectId;

  // Denormalised for display without joins
  universityName: string;
  universityAbbr: string;

  // Identity
  name: string; // "Faculty of Physical Sciences"
  abbreviation?: string; // "FPS"

  // Status
  isActive: boolean;
  addedBy?: Types.ObjectId;

  // Denormalised count
  totalDepartments: number;

  createdAt: Date;
  updatedAt: Date;
}

export type IFacultyModel = Model<IFaculty>;

const FacultySchema = new Schema<IFaculty, IFacultyModel>(
  {
    universityId: {
      type: Schema.Types.ObjectId,
      ref: "University",
      required: true,
      index: true,
    },
    universityName: { type: String, required: true },
    universityAbbr: { type: String, required: true },

    name: { type: String, required: true, trim: true },
    abbreviation: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
    totalDepartments: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "faculties" },
);

// The same faculty name can't appear twice within one university.
FacultySchema.index({ universityId: 1, name: 1 }, { unique: true });
FacultySchema.index({ universityId: 1, isActive: 1 });

export async function getFacultyModel(): Promise<IFacultyModel> {
  const conn = await connectDB();
  return (
    (conn.models.Faculty as IFacultyModel | undefined) ??
    conn.model<IFaculty, IFacultyModel>("Faculty", FacultySchema)
  );
}
