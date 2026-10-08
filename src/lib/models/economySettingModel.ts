// src/lib/models/economySettingModel.ts
// Admin overrides for the credits economy (/admin/economy), one document per
// module, earn source or product id. Anything unset keeps the default from
// the module's code (lib/economy/registry.ts).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export interface IEconomySetting {
  _id: string; // "scouts" | "scouts.readable" | "streaks.freeze" ...
  enabled?: boolean;
  // Earn sources
  rewards?: { AC?: number; XP?: number };
  dailyCap?: number;
  // Products
  price?: number;
  updatedBy?: Types.ObjectId;
  updatedByUpid?: string;
  updatedAt: Date;
}

export type IEconomySettingModel = Model<IEconomySetting>;

const EconomySettingSchema = new Schema<IEconomySetting, IEconomySettingModel>(
  {
    _id: { type: String, required: true },
    enabled: { type: Boolean },
    rewards: { AC: { type: Number }, XP: { type: Number } },
    dailyCap: { type: Number },
    price: { type: Number },
    updatedBy: { type: Schema.Types.ObjectId },
    updatedByUpid: { type: String },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export async function getEconomySettingModel(): Promise<IEconomySettingModel> {
  const conn = await connectDB();
  return (
    (conn.models.EconomySetting as IEconomySettingModel | undefined) ??
    conn.model<IEconomySetting, IEconomySettingModel>("EconomySetting", EconomySettingSchema)
  );
}
