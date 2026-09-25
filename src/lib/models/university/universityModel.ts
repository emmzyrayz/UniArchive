// src/lib/models/university/universityModel.ts
// Canonical institution record. Faculties and departments live in their own
// collections and point back here by universityId — nothing is embedded.
// Supersedes institutionModel.ts for new code.
import crypto from "crypto";
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export type UniversityType =
  | "University"
  | "University of Technology"
  | "University of Agriculture"
  | "University of Education"
  | "Polytechnic"
  | "College of Education"
  | "Monotechnic"
  | "Institute";

export type UniversityOwnership = "Federal" | "State" | "Private";
export type VerificationStatus = "unverified" | "verified" | "flagged";

export const UNIVERSITY_TYPES: UniversityType[] = [
  "University",
  "University of Technology",
  "University of Agriculture",
  "University of Education",
  "Polytechnic",
  "College of Education",
  "Monotechnic",
  "Institute",
];

export const UNIVERSITY_OWNERSHIPS: UniversityOwnership[] = [
  "Federal",
  "State",
  "Private",
];

export interface IUniversity {
  _id: Types.ObjectId;

  // Identity
  name: string; // "Nnamdi Azikiwe University, Awka"
  abbreviation: string; // "UNIZIK" — uppercase, unique
  usid: string; // "USID-UNIZIK-1234" — system id
  slug: string; // "nnamdi-azikiwe-university-awka"

  // Classification
  type: UniversityType;
  ownership: UniversityOwnership;

  // Location
  state: string;
  city?: string;
  country: string;

  // Details, filled in by admins over time
  website?: string;
  logoUrl?: string;
  foundingYear?: number;
  motto?: string;
  affiliationType?: string; // "NUC", "NBTE", "NCCE"

  // Status
  isActive: boolean;
  verificationStatus: VerificationStatus;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  addedBy?: Types.ObjectId;

  // Denormalised counts, maintained by the faculty/department write routes
  totalFaculties: number;
  totalDepartments: number;

  // Seed metadata
  seededAt?: Date;
  seedSource?: string; // "diuscadi-schoolData-cleaned", "admin", "suggestion"

  createdAt: Date;
  updatedAt: Date;
}

export interface IUniversityModel extends Model<IUniversity> {
  generateUsid(abbreviation: string): string;
  generateSlug(name: string): string;
  search(query: string, limit?: number): Promise<IUniversity[]>;
}

export function generateUsid(abbreviation: string): string {
  const abbr = abbreviation.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `USID-${abbr}-${crypto.randomInt(1000, 10000)}`;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const UniversitySchema = new Schema<IUniversity, IUniversityModel>(
  {
    name: { type: String, required: true, trim: true },
    abbreviation: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    usid: { type: String, required: true },
    slug: { type: String, required: true },

    type: {
      type: String,
      required: true,
      enum: UNIVERSITY_TYPES,
      default: "University",
    },
    ownership: {
      type: String,
      required: true,
      enum: UNIVERSITY_OWNERSHIPS,
    },

    state: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    country: { type: String, default: "Nigeria" },

    website: { type: String, trim: true },
    logoUrl: { type: String },
    foundingYear: { type: Number },
    motto: { type: String },
    affiliationType: { type: String },

    isActive: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "flagged"],
      default: "unverified",
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },

    totalFaculties: { type: Number, default: 0 },
    totalDepartments: { type: Number, default: 0 },

    seededAt: { type: Date },
    seedSource: { type: String },
  },
  { timestamps: true, collection: "universities" },
);

UniversitySchema.index({ name: 1 });
UniversitySchema.index({ abbreviation: 1 }, { unique: true });
UniversitySchema.index({ usid: 1 }, { unique: true });
UniversitySchema.index({ slug: 1 }, { unique: true });
UniversitySchema.index({ state: 1, isActive: 1 });
UniversitySchema.index({ ownership: 1, type: 1 });
UniversitySchema.index(
  { name: "text", abbreviation: "text" },
  { name: "university_text" },
);

// "validate" rather than "save": validation runs before pre-save hooks, so
// the required usid/slug must be filled in here or validation fails first.
UniversitySchema.pre("validate", function () {
  if (!this.usid && this.abbreviation) {
    this.usid = generateUsid(this.abbreviation);
  }
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }
});

UniversitySchema.static("generateUsid", generateUsid);
UniversitySchema.static("generateSlug", generateSlug);

// $text does its own tokenising, so the query is passed through as-is —
// regex-escaping it would add literal backslashes to the search terms.
UniversitySchema.static(
  "search",
  function (this: IUniversityModel, query: string, limit = 10) {
    return this.find(
      { $text: { $search: query.trim() }, isActive: true },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean<IUniversity[]>();
  },
);

export async function getUniversityModel(): Promise<IUniversityModel> {
  const conn = await connectDB();
  return (
    (conn.models.University as IUniversityModel | undefined) ??
    conn.model<IUniversity, IUniversityModel>("University", UniversitySchema)
  );
}
