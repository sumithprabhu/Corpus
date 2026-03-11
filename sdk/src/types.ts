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

// --- Treasury ---
export type TreasuryBalanceResponse = { success: true; balance: string };

export type TreasuryDatasetsResponse = { success: true; datasets: DatasetItem[] };
