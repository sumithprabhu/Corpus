import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config/index.js";

function getChain(): Chain {
  const rpc = config.treasury.rpcUrl ?? "http://localhost:8545";
  return {
    id: config.treasury.chainId,
    name: "Filecoin Treasury",
    nativeCurrency: { name: "FIL", symbol: "FIL", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  };
}

const TREASURY_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "balances",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "cid", type: "string" }],
    name: "datasetExists",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "cid", type: "string" },
      { name: "cost", type: "uint256" },
      { name: "size", type: "uint256" },
      { name: "datasetHash", type: "bytes32" },
    ],
    name: "recordAndDeduct",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { type: "error", name: "InsufficientBalance", inputs: [] },
  { type: "error", name: "OnlyExecutor", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "DatasetExists", inputs: [] },
] as const;

function getTreasuryConfig() {
  const address = config.treasury?.contractAddress;
  const rpcUrl = config.treasury?.rpcUrl;
  const executorKey = config.treasury?.executorPrivateKey;
  if (!address || !rpcUrl || !executorKey) {
    throw new Error(
      "Treasury not configured: set TREASURY_CONTRACT_ADDRESS, RPC_URL, TREASURY_EXECUTOR_PRIVATE_KEY"
    );
  }
  return { address, rpcUrl, executorKey };
}

function getWalletClient() {
  const { rpcUrl, executorKey } = getTreasuryConfig();
  const key = executorKey.startsWith("0x") ? executorKey : `0x${executorKey}`;
  const account = privateKeyToAccount(key as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: getChain(),
    transport: http(rpcUrl),
  });
  return { client, account };
}

function getPublicClient() {
  const { rpcUrl } = getTreasuryConfig();
  return createPublicClient({
    chain: getChain(),
    transport: http(rpcUrl),
  });
}

/**
 * Get user's balance in the treasury (ERC20 units, same decimals as USDFC).
 */
export async function getUserBalance(userAddress: Address): Promise<bigint> {
  const { address } = getTreasuryConfig();
  const client = getPublicClient();
  const balance = await client.readContract({
    address: address as Address,
    abi: TREASURY_ABI,
    functionName: "balances",
    args: [userAddress],
  });
  return balance;
}

/**
 * Record dataset and deduct storage cost in one atomic transaction. Contract computes datasetId from cid.
 */
export async function recordAndDeduct(
  userAddress: Address,
  cid: string,
  cost: bigint,
  size: number,
  datasetHash: `0x${string}`
): Promise<void> {
  const { address } = getTreasuryConfig();
  const { client, account } = getWalletClient();
  const hash = await client.writeContract({
    address: address as Address,
    abi: TREASURY_ABI,
    functionName: "recordAndDeduct",
    args: [userAddress, cid, cost, BigInt(size), datasetHash],
    account,
  });
  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash, retryCount: 10, retryDelay: 3000 });
}

/**
 * Check if a dataset with the given cid is already recorded onchain.
 */
export async function datasetExists(cid: string): Promise<boolean> {
  const { address } = getTreasuryConfig();
  const client = getPublicClient();
  return client.readContract({
    address: address as Address,
    abi: TREASURY_ABI,
    functionName: "datasetExists",
    args: [cid],
  });
}

/**
 * Check if the treasury contract is paused.
 */
export async function isTreasuryPaused(): Promise<boolean> {
  const { address } = getTreasuryConfig();
  const client = getPublicClient();
  return client.readContract({
    address: address as Address,
    abi: TREASURY_ABI,
    functionName: "paused",
    args: [],
  });
}

/**
 * Check if treasury is configured (so upload flow can use balance checks).
 */
export function isTreasuryConfigured(): boolean {
  return !!(
    config.treasury?.contractAddress &&
    config.treasury?.rpcUrl &&
    config.treasury?.executorPrivateKey
  );
}

/**
 * Get the executor address derived from TREASURY_EXECUTOR_PRIVATE_KEY (for startup verification).
 */
export function getExecutorAddress(): Address | null {
  const key = config.treasury?.executorPrivateKey;
  if (!key) return null;
  const hex = key.startsWith("0x") ? key : `0x${key}`;
  const account = privateKeyToAccount(hex as `0x${string}`);
  return account.address;
}
