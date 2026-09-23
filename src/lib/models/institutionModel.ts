// src/lib/models/institutionModel.ts
// Institution -> Faculty -> Department hierarchy. Merges the old schoolModel
// with the new types/institution.ts.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { escapeRegex } from "@/lib/escapeRegex";
import { generatePSID, generateUSID } from "@/utils/generateId";
import type {
  InstitutionType,
  Ownership,
  VerificationStatus,
} from "@/types/institution";

export type Membership = "public" | "private";
export type InstitutionStatus = "active" | "inactive" | "pending";
export type CampusType = "main" | "branch" | "satellite";

export interface IDepartment {
  id: string;
  name: string;
}

export interface IFaculty {
  id: string;
  name: string;
  departments: IDepartment[];
}

export interface ICampus {
  id: string;
  name: string;
  location: string;
  type: CampusType;
}

export interface IInstitution {
  name: string;
  abbreviation?: string;
  description?: string;
  location: { state: string; city: string; address?: string };
  website?: string;
  logoUrl?: string;
  foundingYear?: number;
  status: InstitutionStatus;
  usid: string;
  psid: string;
  motto?: string;
  chancellor?: string;
  viceChancellor?: string;
  membership: Membership;
  ownership: Ownership;
  type: InstitutionType;
  faculties: IFaculty[];
  campuses: ICampus[];
  verificationStatus: VerificationStatus;
  verifiedAgainst?: string;
  createdBy?: Types.ObjectId;
  addedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface InstitutionModel extends Model<IInstitution> {
  searchSchools(query: string, limit?: number): Promise<IInstitution[]>;
  findByOwnershipAndLevel(
    ownership: Ownership,
    type?: InstitutionType,
  ): Promise<IInstitution[]>;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const FacultySchema = new Schema<IFaculty>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    departments: { type: [DepartmentSchema], default: [] },
  },
  { _id: false },
);

const CampusSchema = new Schema<ICampus>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["main", "branch", "satellite"],
      default: "main",
    },
  },
  { _id: false },
);

const InstitutionSchema = new Schema<IInstitution, InstitutionModel>(
  {
    name: { type: String, required: true, trim: true },
    abbreviation: { type: String, trim: true },
    description: { type: String, trim: true },
    location: {
      state: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
    },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    foundingYear: { type: Number, min: 1800 },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
      index: true,
    },
    usid: { type: String, required: true, unique: true },
    psid: { type: String, required: true, unique: true },
    motto: { type: String, trim: true },
    chancellor: { type: String, trim: true },
    viceChancellor: { type: String, trim: true },
    membership: {
      type: String,
      enum: ["public", "private"],
      required: true,
      index: true,
    },
    ownership: {
      type: String,
      enum: ["Federal", "State", "Private"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["University", "Polytechnic", "College of Education"],
      required: true,
      index: true,
    },
    faculties: { type: [FacultySchema], default: [] },
    campuses: { type: [CampusSchema], default: [] },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "flagged"],
      default: "unverified",
    },
    verifiedAgainst: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "institutions" },
);

InstitutionSchema.index({ name: "text" });
InstitutionSchema.index({ "faculties.name": 1 });
InstitutionSchema.index({ "faculties.departments.name": 1 });
InstitutionSchema.index({ ownership: 1, type: 1, status: 1 });

// Fill in platform ids when an admin creates an institution without them.
InstitutionSchema.pre("validate", function () {
  if (!this.usid) this.usid = generateUSID();
  if (!this.psid) {
    this.psid = generatePSID(
      this.name,
      `${this.location?.city ?? ""}, ${this.location?.state ?? ""}`,
    );
  }
});

InstitutionSchema.static(
  "searchSchools",
  function (this: InstitutionModel, query: string, limit = 50) {
    const pattern = escapeRegex(query.trim());
    return this.find({
      status: "active",
      $or: [
        { name: { $regex: pattern, $options: "i" } },
        { abbreviation: { $regex: pattern, $options: "i" } },
        { "location.city": { $regex: pattern, $options: "i" } },
        { "location.state": { $regex: pattern, $options: "i" } },
        { "faculties.name": { $regex: pattern, $options: "i" } },
        { "faculties.departments.name": { $regex: pattern, $options: "i" } },
      ],
    })
      .limit(limit)
      .lean();
  },
);

// Kept under the old name; "level" is now expressed as ownership + type.
InstitutionSchema.static(
  "findByOwnershipAndLevel",
  function (
    this: InstitutionModel,
    ownership: Ownership,
    type?: InstitutionType,
  ) {
    const filter: Record<string, unknown> = { ownership, status: "active" };
    if (type) filter.type = type;
    return this.find(filter).lean();
  },
);

export async function getInstitutionModel(): Promise<InstitutionModel> {
  const conn = await connectDB();
  return (conn.models.Institution as InstitutionModel | undefined) ??
    conn.model<IInstitution, InstitutionModel>("Institution", InstitutionSchema);
}
