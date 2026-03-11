import type { CorpusConfig, CreateUserResponse } from "./types.js";
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
  };
}
