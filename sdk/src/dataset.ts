import type {
  CorpusConfig,
  DatasetItem,
  DatasetListResponse,
  DatasetMetadataResponse,
  DatasetUploadResponse,
  DatasetVersionsResponse,
  SetDefaultResponse,
  DeleteByCidResponse,
  DeleteByNameResponse,
} from "./types.js";
import { createClient } from "./client.js";

export type UploadOptions = {
  /** Unique name for a new named dataset (required for named). */
  name?: string;
  /** Encrypt before upload. */
  encrypt?: boolean;
  /** For version-by-CID: previous version's piece CID. */
  previousCID?: string;
};

export type AddVersionByNameOptions = {
  encrypt?: boolean;
};

export function datasetApi(config: CorpusConfig) {
  const client = createClient(config);

  return {
    /**
     * POST /dataset/upload — Upload a new dataset.
     * For a new named dataset, pass options.name. Optional: encrypt, previousCID.
     */
    async upload(
      file: File | Blob,
      options: UploadOptions = {}
    ): Promise<DatasetUploadResponse> {
      const fields: Record<string, string> = {};
      if (options.name !== undefined) fields.name = options.name;
      if (options.encrypt !== undefined) fields.encrypt = String(options.encrypt);
      if (options.previousCID !== undefined) fields.previousCID = options.previousCID;
      return client.upload<DatasetUploadResponse>("/dataset/upload", file, fields);
    },

    /**
     * POST /dataset/version — Create a new version linked by previousCID.
     * For named datasets use addVersionByName instead.
     */
    async createVersion(
      file: File | Blob,
      previousCID: string,
      options?: { encrypt?: boolean }
    ): Promise<DatasetUploadResponse> {
      const fields: Record<string, string> = { previousCID };
      if (options?.encrypt !== undefined) fields.encrypt = String(options.encrypt);
      return client.upload<DatasetUploadResponse>("/dataset/version", file, fields);
    },

    /** GET /dataset — List all dataset versions for the authenticated user. */
    async list(): Promise<DatasetItem[]> {
      const res = await client.get<DatasetListResponse>("/dataset");
      return res.datasets;
    },

    /**
     * GET /dataset/:cid — Retrieve by piece CID.
     * Returns file bytes by default; pass metadata: true for metadata only.
     */
    async get(cid: string, options?: { metadata?: boolean }): Promise<ArrayBuffer | DatasetMetadataResponse> {
      const path = options?.metadata
        ? `/dataset/${encodeURIComponent(cid)}?metadata=1`
        : `/dataset/${encodeURIComponent(cid)}`;
      if (options?.metadata) {
        return client.get<DatasetMetadataResponse>(path);
      }
      return client.getBlob(path);
    },

    /** GET /dataset/:cid — Metadata only (convenience). */
    async getMetadata(cid: string): Promise<DatasetMetadataResponse> {
      return client.get<DatasetMetadataResponse>(`/dataset/${encodeURIComponent(cid)}?metadata=1`);
    },

    /**
     * GET /dataset/by-name/:name — Download default or specific version.
     * Returns file bytes.
     */
    async getByName(name: string, versionCid?: string): Promise<ArrayBuffer> {
      const path = versionCid
        ? `/dataset/by-name/${encodeURIComponent(name)}?version=${encodeURIComponent(versionCid)}`
        : `/dataset/by-name/${encodeURIComponent(name)}`;
      return client.getBlob(path);
    },

    /** GET /dataset/by-name/:name/versions — List all versions of a named dataset. */
    async listVersionsByName(name: string): Promise<DatasetVersionsResponse> {
      return client.get<DatasetVersionsResponse>(
        `/dataset/by-name/${encodeURIComponent(name)}/versions`
      );
    },

    /**
     * POST /dataset/by-name/:name/version — Add a new version to a named dataset.
     * The new version becomes the default.
     */
    async addVersionByName(
      name: string,
      file: File | Blob,
      options?: AddVersionByNameOptions
    ): Promise<DatasetUploadResponse> {
      const fields: Record<string, string> = {};
      if (options?.encrypt !== undefined) fields.encrypt = String(options.encrypt);
      return client.upload<DatasetUploadResponse>(
        `/dataset/by-name/${encodeURIComponent(name)}/version`,
        file,
        fields
      );
    },

    /**
     * PUT /dataset/by-name/:name/default — Set which version is default for this name.
     */
    async setDefault(name: string, cid: string): Promise<SetDefaultResponse> {
      return client.put<SetDefaultResponse>(
        `/dataset/by-name/${encodeURIComponent(name)}/default`,
        { cid }
      );
    },

    /** GET /dataset/:cid/raw — Raw bytes from Filecoin (no decompress/decrypt). */
    async getRaw(cid: string): Promise<ArrayBuffer> {
      return client.getBlob(`/dataset/${encodeURIComponent(cid)}/raw`);
    },

    /** DELETE /dataset/:cid — Delete one dataset version by CID (MongoDB only). */
    async deleteByCid(cid: string): Promise<DeleteByCidResponse> {
      return client.delete<DeleteByCidResponse>(`/dataset/${encodeURIComponent(cid)}`);
    },

    /** DELETE /dataset/by-name/:name — Delete all versions of a named dataset. */
    async deleteByName(name: string): Promise<DeleteByNameResponse> {
      return client.delete<DeleteByNameResponse>(`/dataset/by-name/${encodeURIComponent(name)}`);
    },
  };
}
