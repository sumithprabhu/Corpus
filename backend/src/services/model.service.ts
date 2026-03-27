import { ModelRun } from "../models/ModelRun.model.js";
import { generateProvenanceHash } from "../utils/hash.js";
import { isProvenanceAnchorConfigured } from "../helpers/provenance.js";
import { enqueueProvenanceAnchor } from "./provenanceAnchor.service.js";

export type RegisterModelRunInput = {
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash: string;
  trainingCodeHash: string;
  ownerApiKey?: string;
  ownerWalletAddress?: string;
};

/**
 * Compute provenance hash and store model run metadata.
 */
export async function registerModelRun(input: RegisterModelRunInput) {
  const { datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash, ownerApiKey, ownerWalletAddress } = input;
  const provenanceHash = generateProvenanceHash(datasetCID, trainingConfigHash, trainingCodeHash);
  const anchorStatus = isProvenanceAnchorConfigured() ? "pending" : "none";
  const run = await ModelRun.create({
    datasetCID,
    modelArtifactCID,
    trainingConfigHash,
    trainingCodeHash,
    provenanceHash,
    ownerApiKey,
    ownerWalletAddress,
    anchorStatus,
    createdAt: new Date(),
  });

  // Fire-and-forget: submit anchor tx in background. Does not block the API response.
  if (isProvenanceAnchorConfigured()) {
    setImmediate(() => {
      enqueueProvenanceAnchor(run._id.toString(), provenanceHash).catch((err) => {
        console.error("[model.service] Background anchor enqueue failed:", err);
      });
    });
  }

  return {
    id: run._id.toString(),
    datasetCID: run.datasetCID,
    modelArtifactCID: run.modelArtifactCID,
    trainingConfigHash: run.trainingConfigHash,
    trainingCodeHash: run.trainingCodeHash,
    provenanceHash: run.provenanceHash,
    ownerWalletAddress: run.ownerWalletAddress,
    anchorStatus: run.anchorStatus,
    anchorTxHash: run.anchorTxHash,
    createdAt: run.createdAt,
  };
}

/**
 * Get model run by provenance hash.
 */
export async function getModelRunByProvenanceHash(provenanceHash: string) {
  const run = await ModelRun.findOne({ provenanceHash }).lean();
  if (!run) throw new Error("Model run not found");
  return {
    id: run._id.toString(),
    datasetCID: run.datasetCID,
    modelArtifactCID: run.modelArtifactCID,
    trainingConfigHash: run.trainingConfigHash,
    trainingCodeHash: run.trainingCodeHash,
    provenanceHash: run.provenanceHash,
    ownerWalletAddress: run.ownerWalletAddress,
    anchorStatus: run.anchorStatus,
    anchorTxHash: run.anchorTxHash,
    anchorBlock: run.anchorBlock,
    createdAt: run.createdAt,
  };
}

/**
 * List model runs (e.g. by dataset CID or all).
 */
export async function listModelRuns(options?: { datasetCID?: string; ownerApiKey?: string }) {
  const filter: Record<string, string> = {};
  if (options?.datasetCID) filter.datasetCID = options.datasetCID;
  if (options?.ownerApiKey) filter.ownerApiKey = options.ownerApiKey;
  const list = await ModelRun.find(filter).sort({ createdAt: -1 }).lean();
  return list.map((r) => ({
    id: r._id.toString(),
    datasetCID: r.datasetCID,
    modelArtifactCID: r.modelArtifactCID,
    provenanceHash: r.provenanceHash,
    ownerWalletAddress: r.ownerWalletAddress,
    anchorStatus: r.anchorStatus,
    anchorTxHash: r.anchorTxHash,
    anchorBlock: r.anchorBlock,
    createdAt: r.createdAt,
  }));
}
