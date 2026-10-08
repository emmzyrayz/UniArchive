// src/lib/models/scoutStreakModel.ts
// What someone has bought to protect their Scout streak (lib/scouts/
// streaks.ts): freezes held (used automatically on a missed day) and the
// days covered by a freeze or a repair, which count as done.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const MAX_FREEZES = 2;
// Covered days kept (the streak lookback is 400 days)
export const COVERED_KEEP = 400;

export interface ICoveredDay {
  day: string; // "YYYY-MM-DD", Africa/Lagos
  kind: "freeze" | "repair";
  at: Date;
}

export interface IScoutStreak {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  freezes: number;
  covered: ICoveredDay[];
  updatedAt: Date;
}

export type IScoutStreakModel = Model<IScoutStreak>;

const ScoutStreakSchema = new Schema<IScoutStreak, IScoutStreakModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    freezes: { type: Number, default: 0, min: 0, max: MAX_FREEZES },
    covered: {
      type: [
        new Schema<ICoveredDay>(
          {
            day: { type: String, required: true },
            kind: { type: String, enum: ["freeze", "repair"], required: true },
            at: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

ScoutStreakSchema.index({ userId: 1 }, { unique: true });

export async function getScoutStreakModel(): Promise<IScoutStreakModel> {
  const conn = await connectDB();
  return (
    (conn.models.ScoutStreak as IScoutStreakModel | undefined) ??
    conn.model<IScoutStreak, IScoutStreakModel>("ScoutStreak", ScoutStreakSchema)
  );
}
