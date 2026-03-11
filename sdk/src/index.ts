/**
 * Corpus SDK — production-grade client for the Corpus API.
 *
 * Initialize with an API key (from POST /user/create), then use the namespaced APIs:
 * - health: liveness check (no auth)
 * - user: create user / get API key
 * - datasets: upload, download, list, named datasets, versions, delete
 * - models: register model runs, list, get by provenance hash
 * - treasury: balance, datasets with treasury recorded flag
 *
 * @example
 * ```ts
 * import Corpus from "corpus-sdk";
 *
 * const corpus = new Corpus({ apiKey: process.env.CORPUS_API_KEY, baseUrl: "https://api.example.com" });
 *
 * // Check API is up
 * await corpus.health.check();
 *
 * // Datasets
 * const { cid } = await corpus.datasets.upload(file, { name: "my-dataset", encrypt: true });
 * const bytes = await corpus.datasets.get(cid);
 * const list = await corpus.datasets.list();
 *
 * // Named dataset: add version, list versions, set default, download by name
 * await corpus.datasets.addVersionByName("my-dataset", file);
 * const versions = await corpus.datasets.listVersionsByName("my-dataset");
 * await corpus.datasets.setDefault("my-dataset", versions.versions[0].cid);
 * const defaultFile = await corpus.datasets.getByName("my-dataset");
 *
 * // Models
 * const run = await corpus.models.register({
 *   datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash,
 * });
 * const runs = await corpus.models.list({ datasetCID });
 *
 * // Treasury
 * const { balance } = await corpus.treasury.getBalance();
 * ```
 */

import type { CorpusConfig } from "./types.js";
import { healthApi } from "./health.js";
import { userApi } from "./user.js";
import { datasetApi } from "./dataset.js";
import { modelApi } from "./model.js";
import { treasuryApi } from "./treasury.js";

// Re-export client error and all public types
export { CorpusApiError } from "./client.js";
export type {
  CorpusConfig,
  HealthResponse,
  CreateUserResponse,
  DatasetItem,
  DatasetUploadResponse,
  DatasetListResponse,
  DatasetMetadataResponse,
  DatasetVersionsResponse,
  SetDefaultResponse,
  DeleteByCidResponse,
  DeleteByNameResponse,
  ModelRun,
  RegisterModelRunInput,
  ModelListResponse,
  ModelGetResponse,
  TreasuryBalanceResponse,
  TreasuryDatasetsResponse,
} from "./types.js";
export type { UploadOptions, AddVersionByNameOptions } from "./dataset.js";

export default class Corpus {
  /** Health check (no API key required). */
  readonly health = healthApi(this.config);
  /** User creation — get API key by wallet address. */
  readonly user = userApi(this.config);
  /** Dataset upload, download, list, named datasets, versions, delete. */
  readonly datasets = datasetApi(this.config);
  /** Model run registration and listing. */
  readonly models = modelApi(this.config);
  /** Treasury balance and datasets. */
  readonly treasury = treasuryApi(this.config);

  constructor(public readonly config: CorpusConfig = {}) {}
}
