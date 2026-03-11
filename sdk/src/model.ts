import type {
  CorpusConfig,
  ModelRun,
  RegisterModelRunInput,
  ModelListResponse,
  ModelGetResponse,
} from "./types.js";
import { createClient } from "./client.js";

export function modelApi(config: CorpusConfig) {
  const client = createClient(config);

  return {
    /** POST /model/register — Register a model run with dataset and artifact CIDs and hashes. */
    async register(input: RegisterModelRunInput): Promise<ModelGetResponse> {
      const { datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash } = input;
      if (!datasetCID?.trim() || !modelArtifactCID?.trim() || !trainingConfigHash?.trim() || !trainingCodeHash?.trim()) {
        throw new Error("datasetCID, modelArtifactCID, trainingConfigHash, and trainingCodeHash are required");
      }
      return client.post<ModelGetResponse>("/model/register", {
        datasetCID: datasetCID.trim(),
        modelArtifactCID: modelArtifactCID.trim(),
        trainingConfigHash: trainingConfigHash.trim(),
        trainingCodeHash: trainingCodeHash.trim(),
      });
    },

    /** GET /model — List model runs. Optional filter by datasetCID. */
    async list(options?: { datasetCID?: string }): Promise<ModelRun[]> {
      const path = options?.datasetCID
        ? `/model?datasetCID=${encodeURIComponent(options.datasetCID)}`
        : "/model";
      const res = await client.get<ModelListResponse>(path);
      return res.modelRuns;
    },

    /** GET /model/:provenanceHash — Get a single model run by provenance hash. */
    async get(provenanceHash: string): Promise<ModelGetResponse> {
      return client.get<ModelGetResponse>(`/model/${encodeURIComponent(provenanceHash)}`);
    },
  };
}
