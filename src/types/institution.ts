// types/institution.ts
export type InstitutionType =
  | "University"
  | "Polytechnic"
  | "College of Education";
export type Ownership = "Federal" | "State" | "Private";
export type VerificationStatus = "unverified" | "verified" | "flagged";

export interface Faculty {
  name: string;
  departments: string[];
}

export interface Institution {
  id: string; // slug or uuid, generated on upload
  name: string;
  abbreviation: string;
  type: InstitutionType;
  ownership: Ownership;
  state: string;
  city: string;
  website?: string;
  logoUrl?: string;
  faculties: Faculty[];
  verificationStatus: VerificationStatus;
  verifiedAgainst?: string; // e.g. "NUC 2024 list", "NBTE 2024 list"
  addedBy: string; // admin user id
  createdAt: string;
  updatedAt: string;
}
