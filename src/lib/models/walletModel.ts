// src/lib/models/walletModel.ts
// Running balance of one account in one currency, kept in step with the
// ledger in the same transaction (lib/economy/ledger.ts). It is a cache:
// `pnpm economy:recompute` rebuilds it from the ledger.
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface IWallet {
  _id: Types.ObjectId;
  account: string;
  currency: string;
  balance: number;
  updatedAt: Date;
}

export type IWalletModel = Model<IWallet>;

const WalletSchema = new Schema<IWallet, IWalletModel>(
  {
    account: { type: String, required: true },
    currency: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

WalletSchema.index({ account: 1, currency: 1 }, { unique: true });

export async function getWalletModel(): Promise<IWalletModel> {
  const conn = await connectDB();
  return (conn.models.Wallet as IWalletModel | undefined) ?? conn.model<IWallet, IWalletModel>("Wallet", WalletSchema);
}
