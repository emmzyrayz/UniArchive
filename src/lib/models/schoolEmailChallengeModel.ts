// src/lib/models/schoolEmailChallengeModel.ts
// A code sent to a school email during signup, before the account exists.
// /api/auth/school-email/send creates one and hands the browser a random
// challenge token (only its hash is stored here); /verify checks the code
// against it; /api/auth/register consumes a verified one to store the school
// email on the new account. Without the token the code is useless, and a
// verified challenge only counts for the school it was checked against.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const SCHOOL_EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const SCHOOL_EMAIL_MAX_ATTEMPTS = 5;
// Once verified, how long the user has to finish signing up
export const SCHOOL_EMAIL_PROOF_TTL_MS = 60 * 60 * 1000;

export interface ISchoolEmailChallenge {
  _id: Types.ObjectId;
  tokenHash: string;
  // The school email, encrypted, and its hash (unique across users)
  email: string;
  emailHash: string;
  school: string;
  // Set when a signed-in user started it from Settings: only they can
  // verify it, and signup never accepts it
  userId?: Types.ObjectId;
  otpHash: string;
  otpExpiresAt: Date;
  attempts: number;
  verifiedAt?: Date;
  used: boolean;
  // The document is deleted at this time (TTL index)
  expiresAt: Date;
  createdAt: Date;
}

export type ISchoolEmailChallengeModel = Model<ISchoolEmailChallenge>;

const SchoolEmailChallengeSchema = new Schema<ISchoolEmailChallenge, ISchoolEmailChallengeModel>({
  tokenHash: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  emailHash: { type: String, required: true, index: true },
  school: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  otpHash: { type: String, required: true },
  otpExpiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  verifiedAt: { type: Date },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

SchoolEmailChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export async function getSchoolEmailChallengeModel(): Promise<ISchoolEmailChallengeModel> {
  const conn = await connectDB();
  return (
    (conn.models.SchoolEmailChallenge as ISchoolEmailChallengeModel | undefined) ??
    conn.model<ISchoolEmailChallenge, ISchoolEmailChallengeModel>(
      "SchoolEmailChallenge",
      SchoolEmailChallengeSchema,
    )
  );
}
