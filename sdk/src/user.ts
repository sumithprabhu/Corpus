import type { CorpusConfig, CreateUserResponse, ListKeysResponse, CreateKeyResponse, RevokeKeyResponse } from "./types.js";
import { createClient } from "./client.js";

export function userApi(config: CorpusConfig) {
  const client = createClient(config);

  return {
    /**
     * POST /user/create — Create or get user by wallet address.
     * Returns API key to use for subsequent authenticated calls. No auth required.
     */
    async create(params: { walletAddress: string }): Promise<CreateUserResponse> {
      const { walletAddress } = params;
      if (!walletAddress?.trim()) {
        throw new Error("walletAddress is required");
      }
      return client.post<CreateUserResponse>("/user/create", { walletAddress: walletAddress.trim() });
    },

    /**
     * GET /user/keys — List all API keys for the authenticated wallet.
     * Returns key prefix (not full key), creation date, last used, and revocation status.
     * Requires API key auth.
     */
    async listKeys(): Promise<ListKeysResponse> {
      return client.get<ListKeysResponse>("/user/keys");
    },

    /**
     * POST /user/keys — Create an additional API key for the authenticated wallet.
     * Returns the full key (shown only once — store it securely).
     * Requires API key auth.
     */
    async createKey(params?: { name?: string }): Promise<CreateKeyResponse> {
      return client.post<CreateKeyResponse>("/user/keys", { name: params?.name ?? "" });
    },

    /**
     * DELETE /user/keys/:id — Revoke an API key by its ID (from listKeys).
     * Revoked keys are rejected immediately on all subsequent requests.
     * Requires API key auth.
     */
    async revokeKey(id: string): Promise<RevokeKeyResponse> {
      if (!id?.trim()) throw new Error("id is required");
      return client.delete<RevokeKeyResponse>(`/user/keys/${id.trim()}`);
    },
  };
}
