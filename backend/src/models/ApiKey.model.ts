import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiKey extends Document {
  key: string;
  walletAddress: string;
  name: string;
  createdAt: Date;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    key: { type: String, required: true, unique: true, index: true },
    walletAddress: { type: String, required: true, index: true },
    name: { type: String, required: true, default: "API Key" },
    createdAt: { type: Date, default: () => new Date() },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ApiKeySchema.index({ walletAddress: 1, createdAt: -1 });
ApiKeySchema.index({ walletAddress: 1, revokedAt: 1, createdAt: -1 });

export const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey ?? mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

