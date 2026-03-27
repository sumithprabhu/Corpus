import dotenv from "dotenv";

dotenv.config();

const requiredForSynapse = ["SYNAPSE_OPERATOR_PRIVATE_KEY"] as const;
const optionalForApp = ["FILECOIN_NETWORK", "MONGODB_URI", "ENCRYPTION_SECRET"] as const;

function validateEnv(): void {
  const missing = requiredForSynapse.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.warn(
      `[config] Missing env for Synapse storage: ${missing.join(", ")}. Dataset upload/retrieve will fail.`
    );
  }
}

validateEnv();

/**
 * Central config from environment.
 * Treasury: contract-based custody; backend executor deducts/records only.
 */
export const config = {
  port: parseInt(process.env.PORT ?? process.env.API_PORT ?? "3001", 10),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/corpus",
  /** Legacy/fallback: used only to decrypt datasets encrypted with the global secret. New encryption uses the owner's API key. */
  encryptionSecret:
    process.env.ENCRYPTION_SECRET ?? "corpus-encryption-secret-change-in-production",
  filecoinNetwork: (process.env.FILECOIN_NETWORK ?? "calibration").toLowerCase() as
    | "calibration"
    | "mainnet",
  synapseOperatorPrivateKey: process.env.SYNAPSE_OPERATOR_PRIVATE_KEY?.trim() ?? "",
  /** Fixed storage cost per upload in wei (USDFC 18 decimals). */
  storageCostFixedWei: BigInt(process.env.STORAGE_COST_FIXED_WEI ?? "1000000000000000"),
  /** Storage cost per month in wei (USDFC 18 decimals). Billed per month; access is not permanent. Defaults to same as fixed if unset. */
  storageCostPerMonthWei: BigInt(process.env.STORAGE_COST_PER_MONTH_WEI ?? process.env.STORAGE_COST_FIXED_WEI ?? "1000000000000000"),
  treasury: {
    contractAddress: process.env.TREASURY_CONTRACT_ADDRESS?.trim() ?? null,
    rpcUrl: process.env.RPC_URL?.trim() ?? null,
    executorPrivateKey: process.env.TREASURY_EXECUTOR_PRIVATE_KEY?.trim() ?? null,
    /** Optional: expected executor address; verified at startup if set. */
    executorAddress: process.env.TREASURY_EXECUTOR_ADDRESS?.trim() ?? null,
    chainId: parseInt(process.env.TREASURY_CHAIN_ID ?? "314159", 10),
  },
  /** Secret for billing cron endpoint. Set BILLING_SECRET in .env. */
  billingSecret: process.env.BILLING_SECRET?.trim() ?? null,
} as const;
