import mongoose, { Schema, Document, Model } from "mongoose";

export interface IModelRun extends Document {
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash: string;
  trainingCodeHash: string;
  provenanceHash: string;
  ownerApiKey?: string;
  ownerWalletAddress?: string;
  /** Transaction hash of the on-chain provenance anchor (self-send with provenanceHash as calldata). */
  anchorTxHash?: string;
  /** 'none' = anchoring not configured; 'pending' = tx submitted, awaiting confirmation; 'anchored' = confirmed on-chain; 'failed' = unrecoverable error. */
  anchorStatus: "none" | "pending" | "anchored" | "failed";
  /** Block number at which the anchor tx was confirmed. */
  anchorBlock?: string;
  createdAt: Date;
}

const ModelRunSchema = new Schema<IModelRun>(
  {
    datasetCID: {
      type: String,
      required: true,
    },
    modelArtifactCID: {
      type: String,
      required: true,
    },
    trainingConfigHash: {
      type: String,
      required: true,
    },
    trainingCodeHash: {
      type: String,
      required: true,
    },
    provenanceHash: {
      type: String,
      required: true,
      unique: true,
    },
    ownerApiKey: {
      type: String,
      index: true,
    },
    ownerWalletAddress: {
      type: String,
      index: true,
    },
    anchorTxHash: {
      type: String,
    },
    anchorStatus: {
      type: String,
      enum: ["none", "pending", "anchored", "failed"],
      default: "none",
      index: true,
    },
    anchorBlock: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

ModelRunSchema.index({ datasetCID: 1 });

export const ModelRun: Model<IModelRun> =
  mongoose.models.ModelRun ?? mongoose.model<IModelRun>("ModelRun", ModelRunSchema);
