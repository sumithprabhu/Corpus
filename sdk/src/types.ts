/**
 * Corpus SDK types. Aligned with backend API responses.
 */

/** Config when creating a Corpus client. */
export type CorpusConfig = {
  /** API key from POST /user/create. Required for dataset, model, treasury. */
  apiKey?: string;
  /** Base URL of the Corpus backend (e.g. https://api.example.com). Default: http://localhost:3001 */
  baseUrl?: string;
};

// --- Health ---
export type HealthResponse = { success: true; ok: true };

// --- User ---
export type CreateUserResponse = {
  success: true;
  walletAddress: string;
  apiKey: string;
  message?: string;
};

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
  revokedAt: string | null;
};

export type ListKeysResponse = {
  success: true;
  keys: ApiKeyItem[];
};

export type CreateKeyResponse = {
  success: true;
  id: string;
  key: string;
  prefix: string;
  name: string;
  createdAt: string;
};

export type RevokeKeyResponse = {
  success: true;
  revoked: true;
};

// --- Dataset (list item and metadata) ---
export type DatasetItem = {
  cid: string;
  name?: string;
  isDefault?: boolean;
  ownerWalletAddress?: string;
  previousCID?: string | null;
  encrypted?: boolean;
  encryptionType?: string;
  compressed?: boolean;
  compressionFormat?: string;
  storageCost?: string;
  uploadTimestamp?: string;
  createdAt: string;
  treasuryRecorded?: boolean;
};

export type DatasetPrepareResponse = {
  success: true;
  /** Amount in wei debited from treasury per upload (USDFC 18 decimals). */
  debitPerUploadWei: string;
  /** Amount in wei debited per month for storage. Storage is billed per month; access is not permanent. */
  debitPerMonthWei: string;
  /** Human-readable note: deposit to treasury; storage is per-month, not permanent. */
  description: string;
};

export type DatasetUploadResponse = {
  success: true;
  pieceCID: string;
  cid: string;
  name?: string;
  storageCost: string;
};

export type DatasetListResponse = { success: true; datasets: DatasetItem[] };

export type DatasetMetadataResponse = {
  success: true;
  cid: string;
  name?: string;
  isDefault?: boolean;
  ownerWalletAddress?: string;
  previousCID?: string | null;
  encrypted?: boolean;
  encryptionType?: string;
  compressed?: boolean;
  compressionFormat?: string;
  storageCost?: string;
  uploadTimestamp?: string;
  createdAt: string;
};

export type DatasetVersionsResponse = { success: true; name: string; versions: DatasetItem[] };

export type SetDefaultResponse = { success: true; name: string; defaultCid: string };

export type DeleteByCidResponse = { success: true; cid: string; deleted: true };

export type DeleteByNameResponse = { success: true; name: string; deletedCount: number };

// --- Model ---
export type ModelRun = {
  id: string;
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash?: string | null;
  trainingCodeHash?: string | null;
  provenanceHash: string;
  ownerWalletAddress?: string;
  /** Status of the on-chain provenance anchor. */
  anchorStatus: "none" | "pending" | "anchored" | "failed";
  /** Transaction hash of the on-chain anchor (self-send with provenanceHash as calldata). */
  anchorTxHash?: string;
  /** Block number at which the anchor was confirmed. */
  anchorBlock?: string;
  createdAt: string;
};

export type RegisterModelRunInput = {
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash: string;
  trainingCodeHash: string;
};

export type ModelListResponse = { success: true; modelRuns: ModelRun[] };

export type ModelGetResponse = { success: true } & ModelRun;

// --- Dataset sharing ---
export type DatasetShareItem = {
  sharedWithWalletAddress: string;
  grantedAt: string;
};

export type ListSharesResponse = {
  success: true;
  cid: string;
  shares: DatasetShareItem[];
};

export type ShareDatasetResponse = {
  success: true;
  cid: string;
  sharedWith: string;
};

export type RevokeShareResponse = {
  success: true;
  cid: string;
  walletAddress: string;
  revoked: boolean;
};

// --- Treasury ---
export type TreasuryBalanceResponse = { success: true; balance: string };

export type TreasuryDatasetsResponse = { success: true; datasets: DatasetItem[] };
