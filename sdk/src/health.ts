import type { HealthResponse } from "./types.js";
import type { CorpusConfig } from "./types.js";
import { createClient } from "./client.js";

export function healthApi(config: CorpusConfig) {
  const client = createClient(config);

  return {
    /** GET /health — Liveness check. No auth required. */
    async check(): Promise<HealthResponse> {
      return client.get<HealthResponse>("/health");
    },
  };
}
