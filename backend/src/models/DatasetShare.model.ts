import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDatasetShare extends Document {
  datasetCid: string;
  /** Wallet address of the dataset owner (who granted access). */
  ownerWalletAddress: string;
  /** Wallet address of the user granted read access. */
  sharedWithWalletAddress: string;
  grantedAt: Date;
}

const DatasetShareSchema = new Schema<IDatasetShare>(
  {
    datasetCid: {
      type: String,
      required: true,
      index: true,
    },
    ownerWalletAddress: {
      type: String,
      required: true,
      index: true,
    },
    sharedWithWalletAddress: {
      type: String,
      required: true,
      index: true,
    },
    grantedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: false }
);

// Prevent duplicate shares for the same (cid, grantee) pair.
DatasetShareSchema.index({ datasetCid: 1, sharedWithWalletAddress: 1 }, { unique: true });

export const DatasetShare: Model<IDatasetShare> =
  mongoose.models.DatasetShare ??
  mongoose.model<IDatasetShare>("DatasetShare", DatasetShareSchema);
