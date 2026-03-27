/**
 * E2E Setup: Ensure the executor wallet has enough USDFC deposited in StorageTreasury.
 * Run: cd backend && npx tsx scripts/e2e-setup.ts
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.TREASURY_EXECUTOR_PRIVATE_KEY!;
const TREASURY_ADDRESS = process.env.TREASURY_CONTRACT_ADDRESS as Address;
const USDFC_ADDRESS = process.env.USDFC_TOKEN_ADDRESS as Address;
const COST_WEI = BigInt(process.env.STORAGE_COST_FIXED_WEI || "1000000000000000");
const CHAIN_ID = Number(process.env.TREASURY_CHAIN_ID || "314159");

if (!RPC_URL || !PRIVATE_KEY || !TREASURY_ADDRESS || !USDFC_ADDRESS) {
  console.error("Missing required env vars: RPC_URL, TREASURY_EXECUTOR_PRIVATE_KEY, TREASURY_CONTRACT_ADDRESS, USDFC_TOKEN_ADDRESS");
  process.exit(1);
}

const chain: Chain = {
  id: CHAIN_ID,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "FIL", symbol: "FIL", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const key = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key as `0x${string}`);

const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const TREASURY_ABI = parseAbi([
  "function balances(address user) view returns (uint256)",
  "function deposit(uint256 amount) external",
]);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nE2E Setup — Funding StorageTreasury`);
  console.log(`  Wallet:   ${account.address}`);
  console.log(`  Treasury: ${TREASURY_ADDRESS}`);
  console.log(`  USDFC:    ${USDFC_ADDRESS}`);
  console.log(`  Cost/upload: ${COST_WEI} wei\n`);

  // Check USDFC decimals
  const decimals = await publicClient.readContract({
    address: USDFC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  console.log(`USDFC decimals: ${decimals}`);

  // Check USDFC wallet balance
  const usdcBalance = await publicClient.readContract({
    address: USDFC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log(`USDFC wallet balance: ${usdcBalance} (${Number(usdcBalance) / 10 ** decimals} USDFC)`);

  // Check StorageTreasury balance for this wallet
  const treasuryBalance = await publicClient.readContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: "balances",
    args: [account.address],
  });
  console.log(`StorageTreasury balance: ${treasuryBalance} wei`);

  // We want at least 20x the per-upload cost in treasury
  const targetBalance = COST_WEI * 20n;

  if (treasuryBalance >= targetBalance) {
    console.log(`\n✓ Treasury balance is sufficient (${treasuryBalance} >= ${targetBalance})`);
    console.log(`WALLET_ADDRESS=${account.address}`);
    process.exit(0);
  }

  const needed = targetBalance - treasuryBalance;
  console.log(`\nNeed to deposit ${needed} wei to treasury`);

  if (usdcBalance < needed) {
    console.error(`✗ Insufficient USDFC balance: have ${usdcBalance}, need ${needed}`);
    process.exit(1);
  }

  // Approve USDFC to StorageTreasury
  const allowance = await publicClient.readContract({
    address: USDFC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, TREASURY_ADDRESS],
  });
  console.log(`Current allowance: ${allowance} wei`);

  if (allowance < needed) {
    console.log(`Approving ${needed} wei...`);
    const approveTx = await walletClient.writeContract({
      address: USDFC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [TREASURY_ADDRESS, needed],
      account,
    });
    console.log(`Approve tx: ${approveTx}`);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log(`✓ Approved`);
  }

  // Deposit to StorageTreasury
  console.log(`Depositing ${needed} wei to StorageTreasury...`);
  const depositTx = await walletClient.writeContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: "deposit",
    args: [needed],
    account,
  });
  console.log(`Deposit tx: ${depositTx}`);
  await publicClient.waitForTransactionReceipt({ hash: depositTx });

  const newBalance = await publicClient.readContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: "balances",
    args: [account.address],
  });
  console.log(`\n✓ New treasury balance: ${newBalance} wei`);
  console.log(`WALLET_ADDRESS=${account.address}`);
}

main().catch((e) => {
  console.error("Setup failed:", e.message);
  process.exit(1);
});
