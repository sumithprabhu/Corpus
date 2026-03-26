import { Dataset } from "../models/Dataset.model.js";
import {
  uploadDataset as synapseUpload,
  retrieveDataset as synapseRetrieve,
} from "./synapse.service.js";
import { encryptDataset, decryptDataset } from "../utils/encryption.js";
import { compressForStorage, decompressFromStorage } from "../utils/compression.js";
import { config } from "../config/index.js";
import * as treasury from "../helpers/treasury.js";
import { getStorageCost, getStorageCostPerMonth } from "../helpers/storageCost.js";
import { enqueuePendingRecord } from "./treasuryRetry.service.js";
import { keccak256 } from "viem";

const COMPRESSION_FORMAT_GZIP = "gzip";

/**
 * Prepare: return the cost debited per upload and per month. Storage is billed per month; access is not permanent.
 */
export function getPrepareCost(): {
  debitPerUploadWei: string;
  debitPerMonthWei: string;
  description: string;
} {
  const perUpload = getStorageCost();
  const perMonth = getStorageCostPerMonth();
  return {
    debitPerUploadWei: perUpload.toString(),
    debitPerMonthWei: perMonth.toString(),
    description:
      "Storage is billed per month; access is not permanent. debitPerUploadWei is debited for each upload. debitPerMonthWei is the amount debited per month for storage. Deposit to the StorageTreasury contract so your balance covers at least the per-month cost to retain access.",
  };
}

const ENCRYPTION_TYPE = "aes-256-gcm";

export const INSUFFICIENT_STORAGE_BALANCE = "INSUFFICIENT_STORAGE_BALANCE";

export type UploadOptions = {
  ownerApiKey: string;
  ownerWalletAddress: string;
  /** Optional. If provided, creates a new named dataset (unique per user). Must not already exist. */
  name?: string | null;
  encrypt?: boolean;
  previousCID?: string | null;
  /** When true, this version is the default for its name (used when adding a new version by name). */
  isDefault?: boolean;
};

/**
 * Upload: optional encrypt → compress (when beneficial) → check treasury balance → upload via Synapse → deduct & record onchain → save metadata in MongoDB.
 * If treasury is configured: balance must be >= estimated cost; after upload we deduct and record onchain. Storage is not recorded if upload fails.
 */
export async function uploadDataset(
  fileBuffer: Buffer,
  options: UploadOptions
): Promise<{ pieceCID: string; storageCost: string }> {
  const {
    ownerApiKey,
    ownerWalletAddress,
    name = null,
    encrypt = false,
    previousCID = null,
    isDefault = false,
  } = options;

  if (name != null && name !== "") {
    const existing = await Dataset.findOne({ ownerApiKey, name: name.trim() });
    if (existing) {
      throw new Error(`Dataset name "${name}" already exists. Use POST /dataset/by-name/:name/version to add a new version.`);
    }
  }
  let buffer = fileBuffer;
  if (encrypt) {
    buffer = encryptDataset(fileBuffer, ownerApiKey);
  }

  const { data: bufferToUpload, compressed } = compressForStorage(buffer);
  const compressionFormat = compressed ? COMPRESSION_FORMAT_GZIP : "";

  console.log(
    "[dataset.service] Storage: encrypted=%s, compressed=%s, originalSize=%d, storedSize=%d",
    encrypt,
    compressed,
    buffer.length,
    bufferToUpload.length
  );

  const sizeInBytes = bufferToUpload.length;
  const costWei = getStorageCost();
  const userAddress = ownerWalletAddress as `0x${string}`;
  const datasetHash = keccak256(new Uint8Array(bufferToUpload)) as `0x${string}`;

  if (treasury.isTreasuryConfigured()) {
    const balance = await treasury.getUserBalance(userAddress);
    if (balance < costWei) {
      const err = new Error(INSUFFICIENT_STORAGE_BALANCE) as Error & {
        code?: string;
      };
      err.code = INSUFFICIENT_STORAGE_BALANCE;
      throw err;
    }
  }

  let pieceCID: string;
  try {
    pieceCID = await synapseUpload(bufferToUpload, ownerWalletAddress);
  } catch (err) {
    console.error("[dataset.service] Synapse upload failed:", err);
    throw err;
  }

  if (treasury.isTreasuryConfigured()) {
    try {
      await treasury.recordAndDeduct(
        userAddress,
        pieceCID,
        costWei,
        sizeInBytes,
        datasetHash
      );
    } catch (err) {
      console.error("[dataset.service] Treasury recordAndDeduct failed (upload already done):", err);
      await enqueuePendingRecord(
        ownerWalletAddress,
        pieceCID,
        costWei,
        sizeInBytes,
        datasetHash,
        err instanceof Error ? err.message : String(err)
      );
      throw new Error(
        "Storage record/deduction failed. Upload succeeded; recording will be retried. Please contact support if the issue persists."
      );
    }
  }

  const uploadTimestamp = new Date();
  const trimmedName = name != null && name !== "" ? name.trim() : null;
  await Dataset.create({
    cid: pieceCID,
    ownerApiKey,
    ownerWalletAddress: ownerWalletAddress.toLowerCase(),
    name: trimmedName,
    isDefault: trimmedName != null ? (isDefault ?? true) : false,
    previousCID: previousCID ?? null,
    encrypted: encrypt,
    encryptionType: encrypt ? ENCRYPTION_TYPE : "",
    compressed,
    compressionFormat,
    storageCost: costWei.toString(),
    sizeInBytes,
    datasetHash,
    uploadTimestamp,
    createdAt: uploadTimestamp,
  });

  return { pieceCID, storageCost: costWei.toString() };
}

/**
 * Create a new dataset version linked to previousCID.
 */
export async function createDatasetVersion(
  fileBuffer: Buffer,
  ownerApiKey: string,
  ownerWalletAddress: string,
  previousCID: string,
  encrypt?: boolean
): Promise<{ pieceCID: string; storageCost: string }> {
  const existing = await Dataset.findOne({ cid: previousCID });
  if (!existing) throw new Error("Previous CID not found");
  return uploadDataset(fileBuffer, {
    ownerApiKey,
    ownerWalletAddress,
    previousCID,
    encrypt,
  });
}

/**
 * Add a new version to an existing named dataset. New version becomes the default.
 */
export async function createDatasetVersionByName(
  fileBuffer: Buffer,
  ownerApiKey: string,
  ownerWalletAddress: string,
  name: string,
  encrypt?: boolean
): Promise<{ pieceCID: string; storageCost: string }> {
  const trimmedName = name.trim();
  const defaultVersion = await Dataset.findOne({ ownerApiKey, name: trimmedName, isDefault: true });
  const latestVersion = defaultVersion ?? (await Dataset.findOne({ ownerApiKey, name: trimmedName }).sort({ createdAt: -1 }));
  if (!latestVersion) throw new Error("Dataset not found");
  await Dataset.updateMany(
    { ownerApiKey, name: trimmedName },
    { $set: { isDefault: false } }
  );
  return uploadDataset(fileBuffer, {
    ownerApiKey,
    ownerWalletAddress,
    name: trimmedName,
    previousCID: latestVersion.cid,
    encrypt,
    isDefault: true,
  });
}

/**
 * List all versions of a named dataset (owner-only), newest first.
 */
export async function listVersionsByName(ownerApiKey: string, name: string) {
  const trimmedName = name.trim();
  const list = await Dataset.find({ ownerApiKey, name: trimmedName })
    .sort({ createdAt: -1 })
    .lean();
  if (list.length === 0) return [];
  return list.map((d) => ({
    cid: d.cid,
    name: d.name,
    isDefault: d.isDefault ?? false,
    previousCID: d.previousCID,
    encrypted: d.encrypted,
    encryptionType: d.encryptionType,
    compressed: d.compressed ?? false,
    compressionFormat: d.compressionFormat ?? "",
    storageCost: d.storageCost ?? "0",
    uploadTimestamp: d.uploadTimestamp ?? d.createdAt,
    createdAt: d.createdAt,
  }));
}

/**
 * Get the default (or latest) CID for a named dataset. Throws if not found.
 */
export async function getDefaultCidByName(ownerApiKey: string, name: string): Promise<string> {
  const trimmedName = name.trim();
  const defaultVersion = await Dataset.findOne({ ownerApiKey, name: trimmedName, isDefault: true });
  if (defaultVersion) return defaultVersion.cid;
  const latest = await Dataset.findOne({ ownerApiKey, name: trimmedName }).sort({ createdAt: -1 });
  if (!latest) throw new Error("Dataset not found");
  return latest.cid;
}

/**
 * Set which version is the default for a named dataset.
 */
export async function setDefaultVersion(ownerApiKey: string, name: string, cid: string): Promise<void> {
  const trimmedName = name.trim();
  const version = await Dataset.findOne({ ownerApiKey, name: trimmedName, cid });
  if (!version) throw new Error("Dataset version not found");
  await Dataset.updateMany(
    { ownerApiKey, name: trimmedName },
    { $set: { isDefault: false } }
  );
  await Dataset.updateOne({ ownerApiKey, name: trimmedName, cid }, { $set: { isDefault: true } });
}

/**
 * Ensure the given CID is a version of the named dataset for this owner. Throws if not.
 */
export async function ensureVersionBelongsToName(
  ownerApiKey: string,
  name: string,
  cid: string
): Promise<void> {
  const doc = await Dataset.findOne({ ownerApiKey, name: name.trim(), cid });
  if (!doc) throw new Error("Dataset version not found");
}

/**
 * Retrieve: fetch metadata by CID, get file from Synapse (Filecoin), decompress if needed, decrypt if needed.
 */
export async function getDatasetByCid(cid: string, ownerApiKey: string): Promise<Buffer> {
  const meta = await Dataset.findOne({ cid });
  if (!meta) throw new Error("Dataset not found");
  if (meta.ownerApiKey !== ownerApiKey) throw new Error("Unauthorized");
  let raw = await synapseRetrieve(cid);
  if (meta.compressed) {
    raw = decompressFromStorage(raw);
  }
  if (meta.encrypted) {
    try {
      return decryptDataset(raw, meta.ownerApiKey);
    } catch {
      return decryptDataset(raw, config.encryptionSecret);
    }
  }
  return raw;
}

/**
 * Retrieve raw bytes from Filecoin (no decompress, no decrypt). Owner-only. Use to verify what is stored on-chain.
 */
export async function getDatasetRawByCid(cid: string, ownerApiKey: string): Promise<Buffer> {
  const meta = await Dataset.findOne({ cid });
  if (!meta) throw new Error("Dataset not found");
  if (meta.ownerApiKey !== ownerApiKey) throw new Error("Unauthorized");
  return synapseRetrieve(cid);
}

/**
 * Get dataset metadata only (no file content).
 */
export async function getDatasetMetadata(cid: string, ownerApiKey: string) {
  const meta = await Dataset.findOne({ cid });
  if (!meta) throw new Error("Dataset not found");
  if (meta.ownerApiKey !== ownerApiKey) throw new Error("Unauthorized");
  return {
    cid: meta.cid,
    name: meta.name ?? undefined,
    isDefault: meta.isDefault ?? false,
    ownerWalletAddress: meta.ownerWalletAddress,
    previousCID: meta.previousCID,
    encrypted: meta.encrypted,
    encryptionType: meta.encryptionType,
    compressed: meta.compressed ?? false,
    compressionFormat: meta.compressionFormat ?? "",
    storageCost: meta.storageCost ?? "0",
    sizeInBytes: meta.sizeInBytes ?? 0,
    datasetHash: meta.datasetHash ?? "",
    uploadTimestamp: meta.uploadTimestamp ?? meta.createdAt,
    createdAt: meta.createdAt,
  };
}

/**
 * Delete one dataset version by CID. Owner-only. Removes only the MongoDB record; data on Filecoin remains.
 */
export async function deleteDatasetByCid(ownerApiKey: string, cid: string): Promise<boolean> {
  const result = await Dataset.deleteOne({ cid, ownerApiKey });
  return result.deletedCount === 1;
}

/**
 * Delete all versions of a named dataset. Owner-only. Removes only MongoDB records; data on Filecoin remains.
 */
export async function deleteDatasetByName(ownerApiKey: string, name: string): Promise<number> {
  const result = await Dataset.deleteMany({ ownerApiKey, name: name.trim() });
  return result.deletedCount;
}

/**
 * List datasets for an API key (owner).
 */
export async function listDatasets(ownerApiKey: string) {
  const list = await Dataset.find({ ownerApiKey }).sort({ createdAt: -1 }).lean();
  return list.map((d) => ({
    cid: d.cid,
    name: d.name ?? undefined,
    isDefault: d.isDefault ?? false,
    ownerWalletAddress: d.ownerWalletAddress,
    previousCID: d.previousCID,
    encrypted: d.encrypted,
    encryptionType: d.encryptionType,
    compressed: d.compressed ?? false,
    compressionFormat: d.compressionFormat ?? "",
    storageCost: d.storageCost ?? "0",
    sizeInBytes: d.sizeInBytes ?? 0,
    datasetHash: d.datasetHash ?? "",
    uploadTimestamp: d.uploadTimestamp ?? d.createdAt,
    createdAt: d.createdAt,
  }));
}
