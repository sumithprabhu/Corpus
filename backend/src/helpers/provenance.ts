import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config/index.js";

const ANCHOR_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function getChain(): Chain {
  const rpc = config.treasury.rpcUrl ?? "http://localhost:8545";
  return {
    id: config.treasury.chainId,
    name: "Filecoin Provenance",
    nativeCurrency: { name: "FIL", symbol: "FIL", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  };
}

export function isProvenanceAnchorConfigured(): boolean {
  return !!(
    config.treasury?.executorPrivateKey &&
    config.treasury?.rpcUrl
  );
}

/**
 * Submit a 0-value self-send transaction with provenanceHash encoded as calldata.
 * This creates an immutable, verifiable on-chain timestamp for the provenance record.
 * Returns the transaction hash immediately (does NOT wait for receipt).
 */
export async function submitProvenanceAnchor(provenanceHash: string): Promise<string> {
  const key = config.treasury.executorPrivateKey;
  if (!key) throw new Error("TREASURY_EXECUTOR_PRIVATE_KEY not set");
  const rpcUrl = config.treasury.rpcUrl;
  if (!rpcUrl) throw new Error("RPC_URL not set");

  const hexKey = key.startsWith("0x") ? key : `0x${key}`;
  const account = privateKeyToAccount(hexKey as `0x${string}`);
  const chain = getChain();

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // Encode provenanceHash as calldata with a 4-byte selector for readability:
  // selector = keccak256("anchorProvenance(bytes32)")[:4] = 0x prefixed hex
  // For simplicity, use raw data: 0x + provenanceHash (64 hex chars = 32 bytes)
  const data = (provenanceHash.startsWith("0x") ? provenanceHash : `0x${provenanceHash}`) as `0x${string}`;

  const txHash = await walletClient.sendTransaction({
    to: account.address, // self-send
    value: 0n,
    data,
  });

  return txHash;
}

/**
 * Wait for a provenance anchor tx receipt and return the block number.
 * Used by the background retry service.
 */
export async function waitForAnchorReceipt(txHash: string): Promise<{ blockNumber: bigint }> {
  const rpcUrl = config.treasury.rpcUrl;
  if (!rpcUrl) throw new Error("RPC_URL not set");
  const chain = getChain();
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    timeout: ANCHOR_TIMEOUT_MS,
  });
  return { blockNumber: receipt.blockNumber };
}
