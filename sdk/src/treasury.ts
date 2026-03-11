import type {
  CorpusConfig,
  TreasuryBalanceResponse,
  TreasuryDatasetsResponse,
} from "./types.js";
import { createClient } from "./client.js";

export function treasuryApi(config: CorpusConfig) {
  const client = createClient(config);

  return {
    /** GET /treasury/balance — Balance for the authenticated user's wallet (wei as string). */
    async getBalance(): Promise<TreasuryBalanceResponse> {
      return client.get<TreasuryBalanceResponse>("/treasury/balance");
    },

    /** GET /treasury/datasets — List datasets with treasuryRecorded flag. */
    async getDatasets(): Promise<TreasuryDatasetsResponse> {
      return client.get<TreasuryDatasetsResponse>("/treasury/datasets");
    },
  };
}
