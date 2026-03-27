import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDataset extends Document {
  cid: string;
  ownerApiKey: string;
  ownerWalletAddress: string;
  /** Optional human-readable name; unique per user. Multiple versions share the same name. */
  name?: string | null;
  /** For named datasets: exactly one version per (owner, name) has isDefault true. */
  isDefault?: boolean;
  previousCID: string | null;
  encrypted: boolean;
  encryptionType: string;
  /** True if stored content is gzip-compressed; retrieve will decompress. */
  compressed?: boolean;
  /** Compression format used (e.g. "gzip"). Only set when compressed is true. */
  compressionFormat?: string;
  storageCost?: string; // wei as string for precision (optional for legacy docs)
  /** Stored (post-encrypt, post-compress) size used for onchain record. */
  sizeInBytes?: number;
  /** keccak256 of stored bytes (post-encrypt, post-compress) used for onchain record. */
  datasetHash?: string;
  uploadTimestamp?: Date;
  createdAt: Date;
  /** Monthly storage cost in wei (from Synapse at upload time). Stored as string for bigint precision. */
  monthlyStorageCostWei?: string;
  /** Billing status: active = accessible, expired = access revoked due to insufficient balance. */
  billingStatus?: 'active' | 'expired';
  /** Last time billing was checked for this dataset. Null = never checked. */
  lastBilledAt?: Date | null;
}

const DatasetSchema = new Schema<IDataset>(
  {
    cid: {
      type: String,
      required: true,
      unique: true,
    },
    ownerApiKey: {
      type: String,
      required: true,
      index: true,
    },
    ownerWalletAddress: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    previousCID: {
      type: String,
      default: null,
    },
    encrypted: {
      type: Boolean,
      default: false,
    },
    encryptionType: {
      type: String,
      default: "aes-256-gcm",
    },
    compressed: {
      type: Boolean,
      default: false,
    },
    compressionFormat: {
      type: String,
      default: "",
    },
    storageCost: {
      type: String,
      default: "0",
    },
    sizeInBytes: {
      type: Number,
      default: 0,
    },
    datasetHash: {
      type: String,
      default: "",
    },
    uploadTimestamp: {
      type: Date,
      default: () => new Date(),
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
    monthlyStorageCostWei: { type: String, default: "0" },
    billingStatus: { type: String, enum: ['active', 'expired'], default: 'active' },
    lastBilledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DatasetSchema.index({ ownerApiKey: 1, createdAt: -1 });
DatasetSchema.index({ ownerApiKey: 1, name: 1, createdAt: -1 });
DatasetSchema.index({ billingStatus: 1, ownerWalletAddress: 1 });

export const Dataset: Model<IDataset> =
  mongoose.models.Dataset ?? mongoose.model<IDataset>("Dataset", DatasetSchema);
