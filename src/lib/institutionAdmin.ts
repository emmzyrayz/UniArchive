// src/lib/institutionAdmin.ts
// Writes to universities, faculties and departments, shared by the admin
// institution routes and school suggestion approval.
//
// - find-or-create: a name that already exists (fuzzy, same rules as the
//   suggestion duplicate check) is reused instead of erroring, so repeating
//   an approval never creates doubles
// - counts are recomputed from the collections, not incremented, so they
//   heal themselves after soft deletes and reactivations
// - renames cascade to the denormalised copies on users and materials
import { isValidObjectId, type Types } from "mongoose";
import { CERTAIN_MATCH, findSimilar } from "@/lib/fuzzyMatch";
import {
  UNIVERSITY_OWNERSHIPS,
  UNIVERSITY_TYPES,
  getUniversityModel,
  type IUniversity,
  type UniversityOwnership,
  type UniversityType,
} from "@/lib/models/university/universityModel";
import { getFacultyModel, type IFaculty } from "@/lib/models/university/facultyModel";
import { getDepartmentModel, type IDepartment } from "@/lib/models/university/departmentModel";
import { getUserModel } from "@/lib/models/userModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import { NIGERIAN_STATES } from "@/lib/constants/nigerianStates";
import type {
  AdminDepartmentDto,
  AdminFacultyDto,
  AdminUniversityDto,
} from "@/types/admin";

export const MAX_NAME_LENGTH = 150;
// Letters (any script), digits, spaces and the punctuation real names use
const NAME_PATTERN = /^[\p{L}\p{N}\s.,'’&()\-/]+$/u;
const ABBR_PATTERN = /^[A-Z0-9&-]{2,15}$/;

type Id = Types.ObjectId | string;

// --- Validation ---------------------------------------------------------------

/** Error message, or null when the name is acceptable. */
export function checkName(label: string, value: string): string | null {
  if (!value) return `${label} is required.`;
  if (value.length > MAX_NAME_LENGTH) return `${label} must be at most ${MAX_NAME_LENGTH} characters.`;
  if (!NAME_PATTERN.test(value)) return `${label} contains characters that aren't allowed.`;
  return null;
}

export const normaliseAbbr = (value: string) => value.trim().toUpperCase().replace(/\s+/g, "");

export function checkUniversityAbbr(value: string): string | null {
  return ABBR_PATTERN.test(value)
    ? null
    : "Abbreviation must be 2-15 letters, digits, & or -.";
}

/** Short unit abbreviations are optional and looser ("FPS", "CSC"). */
export function checkUnitAbbr(value: string): string | null {
  return /^[A-Za-z0-9&.\-]{1,15}$/.test(value) ? null : "Abbreviation must be 1-15 characters.";
}

export const isNigerianState = (v: unknown): v is string =>
  typeof v === "string" && (NIGERIAN_STATES as readonly string[]).includes(v);
export const isOwnership = (v: unknown): v is UniversityOwnership =>
  typeof v === "string" && (UNIVERSITY_OWNERSHIPS as string[]).includes(v);
export const isUniversityType = (v: unknown): v is UniversityType =>
  typeof v === "string" && (UNIVERSITY_TYPES as string[]).includes(v);

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// --- DTOs ---------------------------------------------------------------------

export function toAdminUniversityDto(u: IUniversity): AdminUniversityDto {
  return {
    id: String(u._id),
    name: u.name,
    abbreviation: u.abbreviation,
    type: u.type,
    ownership: u.ownership,
    state: u.state,
    city: u.city,
    website: u.website,
    logoUrl: u.logoUrl,
    foundingYear: u.foundingYear,
    affiliationType: u.affiliationType,
    isActive: u.isActive,
    verificationStatus: u.verificationStatus,
    totalFaculties: u.totalFaculties ?? 0,
    totalDepartments: u.totalDepartments ?? 0,
  };
}

export function toAdminFacultyDto(f: IFaculty): AdminFacultyDto {
  return {
    id: String(f._id),
    universityId: String(f.universityId),
    name: f.name,
    abbreviation: f.abbreviation,
    isActive: f.isActive,
    totalDepartments: f.totalDepartments ?? 0,
  };
}

export function toAdminDepartmentDto(d: IDepartment): AdminDepartmentDto {
  return {
    id: String(d._id),
    universityId: String(d.universityId),
    facultyId: String(d.facultyId),
    name: d.name,
    abbreviation: d.abbreviation,
    isActive: d.isActive,
  };
}

// --- Counts -------------------------------------------------------------------

/** Recounts active faculties/departments for a university (and a faculty). */
export async function refreshInstitutionCounts(universityId: Id, facultyId?: Id): Promise<void> {
  const [University, Faculty, Department] = await Promise.all([
    getUniversityModel(),
    getFacultyModel(),
    getDepartmentModel(),
  ]);

  // Departments under an inactive faculty don't count toward the university
  const activeFacultyIds = await Faculty.find({ universityId, isActive: true }).distinct("_id");
  const [totalFaculties, totalDepartments] = await Promise.all([
    Promise.resolve(activeFacultyIds.length),
    Department.countDocuments({ universityId, facultyId: { $in: activeFacultyIds }, isActive: true }),
  ]);
  await University.updateOne({ _id: universityId }, { $set: { totalFaculties, totalDepartments } });

  if (facultyId) {
    const facultyDepartments = await Department.countDocuments({ facultyId, isActive: true });
    await Faculty.updateOne({ _id: facultyId }, { $set: { totalDepartments: facultyDepartments } });
  }
}

// --- Find or create -----------------------------------------------------------

/** An existing faculty of the university whose name matches closely enough. */
export async function findFaculty(universityId: Id, name: string): Promise<IFaculty | null> {
  const Faculty = await getFacultyModel();
  const faculties = await Faculty.find({ universityId }).lean<IFaculty[]>();
  const match = findSimilar(
    name,
    faculties.map((f) => ({ id: String(f._id), name: f.name, abbreviation: f.abbreviation })),
    CERTAIN_MATCH,
    "unit",
  )[0];
  return match ? (faculties.find((f) => String(f._id) === match.id) ?? null) : null;
}

/** An existing department of the faculty whose name matches closely enough. */
export async function findDepartment(facultyId: Id, name: string): Promise<IDepartment | null> {
  const Department = await getDepartmentModel();
  const departments = await Department.find({ facultyId }).lean<IDepartment[]>();
  const match = findSimilar(
    name,
    departments.map((d) => ({ id: String(d._id), name: d.name, abbreviation: d.abbreviation })),
    CERTAIN_MATCH,
    "unit",
  )[0];
  return match ? (departments.find((d) => String(d._id) === match.id) ?? null) : null;
}

/**
 * The matching faculty (reactivated if it had been removed), or a new one.
 * Doesn't refresh counts; the caller does once it's done writing.
 */
export async function findOrCreateFaculty(
  university: Pick<IUniversity, "_id" | "name" | "abbreviation">,
  input: { name: string; abbreviation?: string },
  addedBy: Id,
): Promise<{ faculty: IFaculty; created: boolean }> {
  const Faculty = await getFacultyModel();
  const existing = await findFaculty(university._id, input.name);
  if (existing) {
    if (!existing.isActive) {
      await Faculty.updateOne({ _id: existing._id }, { $set: { isActive: true } });
      existing.isActive = true;
    }
    return { faculty: existing, created: false };
  }
  const created = await Faculty.create({
    universityId: university._id,
    universityName: university.name,
    universityAbbr: university.abbreviation,
    name: input.name,
    abbreviation: input.abbreviation || undefined,
    addedBy,
  });
  return { faculty: created.toObject(), created: true };
}

/** Same as findOrCreateFaculty, for a department of `faculty`. */
export async function findOrCreateDepartment(
  university: Pick<IUniversity, "_id" | "name" | "abbreviation">,
  faculty: Pick<IFaculty, "_id" | "name">,
  input: { name: string; abbreviation?: string },
  addedBy: Id,
): Promise<{ department: IDepartment; created: boolean }> {
  const Department = await getDepartmentModel();
  const existing = await findDepartment(faculty._id, input.name);
  if (existing) {
    if (!existing.isActive) {
      await Department.updateOne({ _id: existing._id }, { $set: { isActive: true } });
      existing.isActive = true;
    }
    return { department: existing, created: false };
  }
  const created = await Department.create({
    universityId: university._id,
    facultyId: faculty._id,
    universityName: university.name,
    universityAbbr: university.abbreviation,
    facultyName: faculty.name,
    name: input.name,
    abbreviation: input.abbreviation || undefined,
    addedBy,
  });
  return { department: created.toObject(), created: true };
}

// --- Rename cascades ----------------------------------------------------------

/** Updates the denormalised university name/abbreviation everywhere. */
export async function cascadeUniversityRename(
  universityId: Id,
  name: string,
  abbreviation: string,
): Promise<void> {
  const [Faculty, Department, User, Material] = await Promise.all([
    getFacultyModel(),
    getDepartmentModel(),
    getUserModel(),
    getMaterialModel(),
  ]);
  const names = { universityName: name, universityAbbr: abbreviation };
  await Promise.all([
    Faculty.updateMany({ universityId }, { $set: names }),
    Department.updateMany({ universityId }, { $set: names }),
    User.updateMany({ universityId }, { $set: { ...names, school: name } }),
    Material.updateMany({ universityId }, { $set: names }),
  ]);
}

export async function cascadeFacultyRename(facultyId: Id, name: string): Promise<void> {
  const [Department, User, Material] = await Promise.all([
    getDepartmentModel(),
    getUserModel(),
    getMaterialModel(),
  ]);
  await Promise.all([
    Department.updateMany({ facultyId }, { $set: { facultyName: name } }),
    User.updateMany({ facultyId }, { $set: { facultyName: name, faculty: name } }),
    Material.updateMany({ facultyId }, { $set: { facultyName: name } }),
  ]);
}

export async function cascadeDepartmentRename(departmentId: Id, name: string): Promise<void> {
  const [User, Material] = await Promise.all([getUserModel(), getMaterialModel()]);
  await Promise.all([
    User.updateMany({ departmentId }, { $set: { departmentName: name, department: name } }),
    Material.updateMany({ departmentId }, { $set: { departmentName: name } }),
  ]);
}

// --- Universities -------------------------------------------------------------

export interface NewUniversityInput {
  name: string;
  abbreviation: string;
  state: string;
  ownership: UniversityOwnership;
  type?: UniversityType;
  city?: string;
  website?: string;
}

/** Error message for a new university, or null when it's valid. */
export function checkNewUniversity(input: NewUniversityInput): string | null {
  return (
    checkName("University name", input.name) ??
    checkUniversityAbbr(input.abbreviation) ??
    (isNigerianState(input.state) ? null : "Choose a valid state.") ??
    (isOwnership(input.ownership) ? null : "Ownership must be Federal, State or Private.") ??
    (input.type === undefined || isUniversityType(input.type) ? null : "Unknown institution type.") ??
    (input.website && !isHttpUrl(input.website) ? "Website must be an http(s) URL." : null)
  );
}

/**
 * Creates a university (added by an admin, verified since an admin checked
 * it). A clashing abbreviation or slug throws MongoDB's duplicate key error.
 */
export async function createUniversity(
  input: NewUniversityInput,
  addedBy: Id,
  seedSource: "admin" | "suggestion",
): Promise<IUniversity> {
  const University = await getUniversityModel();
  const now = new Date();
  const created = await University.create({
    name: input.name,
    abbreviation: input.abbreviation,
    state: input.state,
    ownership: input.ownership,
    type: input.type ?? "University",
    city: input.city || undefined,
    website: input.website || undefined,
    country: "Nigeria",
    isActive: true,
    verificationStatus: "verified",
    verifiedBy: addedBy,
    verifiedAt: now,
    addedBy,
    seedSource,
  });
  return created.toObject();
}

// --- Loaders for the nested admin routes --------------------------------------

/** The university, or null if the id is invalid or unknown. */
export async function loadUniversity(id: string): Promise<IUniversity | null> {
  if (!isValidObjectId(id)) return null;
  const University = await getUniversityModel();
  return University.findById(id).lean<IUniversity>();
}

/** The faculty, only if it belongs to `universityId`. */
export async function loadFacultyOf(universityId: string, facultyId: string): Promise<IFaculty | null> {
  if (!isValidObjectId(facultyId)) return null;
  const Faculty = await getFacultyModel();
  return Faculty.findOne({ _id: facultyId, universityId }).lean<IFaculty>();
}

/** The department, only if it belongs to `facultyId`. */
export async function loadDepartmentOf(facultyId: string, departmentId: string): Promise<IDepartment | null> {
  if (!isValidObjectId(departmentId)) return null;
  const Department = await getDepartmentModel();
  return Department.findOne({ _id: departmentId, facultyId }).lean<IDepartment>();
}
