// src/lib/models/ledgerEntryModel.ts
// The credits ledger (lib/economy/ledger.ts): append-only, double entry.
// Each entry's postings add up to zero per currency, so every credit has a
// source and a destination. Never updated except to mark it reversed (a
// reversal is a new entry) and, in the account purge, to swap a deleted
// person's account for "user:former".
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const LEDGER_KINDS = ["earn", "spend", "transfer", "reverse", "adjust"] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export interface IPosting {
  account: string;
  currency: string;
  amount: number;
}

export interface ILedgerEntry {
  _id: Types.ObjectId;
  kind: LedgerKind;
  // The module that wrote it ("core", "scouts", "bounties" ...)
  module: string;
  // The earn source, product or action ("scouts.readable", "streaks.freeze", "adjust")
  source: string;
  // Unique: the same thing can never be paid or charged twice
  sourceKey: string;
  // Every account touched, for history lookups
  accounts: string[];
  // Africa/Lagos calendar day, "YYYY-MM-DD" (daily caps, boards)
  day: string;
  postings: IPosting[];
  // Whether XP in this entry counts toward leaderboards
  countsForBoards: boolean;
  // On a reversal: the entry it undoes. On the original: the reversal.
  reverses?: Types.ObjectId;
  reversedBy?: Types.ObjectId;
  // Who did it, for staff actions
  actorId?: Types.ObjectId;
  note?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export type ILedgerEntryModel = Model<ILedgerEntry>;

const PostingSchema = new Schema<IPosting>(
  {
    account: { type: String, required: true },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const LedgerEntrySchema = new Schema<ILedgerEntry, ILedgerEntryModel>(
  {
    kind: { type: String, enum: LEDGER_KINDS, required: true },
    module: { type: String, required: true },
    source: { type: String, required: true },
    sourceKey: { type: String, required: true },
    accounts: { type: [String], required: true },
    day: { type: String, required: true },
    postings: { type: [PostingSchema], required: true },
    countsForBoards: { type: Boolean, default: false },
    reverses: { type: Schema.Types.ObjectId },
    reversedBy: { type: Schema.Types.ObjectId },
    actorId: { type: Schema.Types.ObjectId },
    note: { type: String, maxlength: 500 },
    meta: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

LedgerEntrySchema.index({ sourceKey: 1 }, { unique: true });
// A person's history, newest first
LedgerEntrySchema.index({ accounts: 1, _id: -1 });
// Daily caps and weekly boards
LedgerEntrySchema.index({ accounts: 1, day: 1, kind: 1 });

export async function getLedgerEntryModel(): Promise<ILedgerEntryModel> {
  const conn = await connectDB();
  return (
    (conn.models.LedgerEntry as ILedgerEntryModel | undefined) ??
    conn.model<ILedgerEntry, ILedgerEntryModel>("LedgerEntry", LedgerEntrySchema)
  );
}
