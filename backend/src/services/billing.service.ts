import { Dataset } from "../models/Dataset.model.js";
import * as treasury from "../helpers/treasury.js";
import type { Address } from "viem";

export type BillingRunResult = {
  processedDatasets: number;
  processedWallets: number;
  renewed: number;
  expired: number;
  skippedNotDue: boolean; // false — we always process when called
  errors: number;
  details: Array<{
    ownerWalletAddress: string;
    balanceWei: string;
    totalMonthlyObligationWei: string;
    datasetCount: number;
    action: "renewed" | "expired" | "error";
    error?: string;
  }>;
};

/**
 * Run monthly billing sweep.
 * Groups all active datasets by owner wallet, checks on-chain balance vs total monthly obligation.
 * If balance >= total monthly cost → renews (updates lastBilledAt).
 * If balance < total monthly cost → expires all datasets for that wallet.
 *
 * Note: does not actually deduct balance (requires a contract `debitUser` function not yet deployed).
 * Access is gated on whether the user maintains sufficient treasury balance.
 */
export async function runMonthlyDebit(): Promise<BillingRunResult> {
  if (!treasury.isTreasuryConfigured()) {
    return {
      processedDatasets: 0,
      processedWallets: 0,
      renewed: 0,
      expired: 0,
      skippedNotDue: false,
      errors: 0,
      details: [],
    };
  }

  // Fetch all datasets (both active and expired — expired ones may be renewed if balance restored)
  const datasets = await Dataset.find({}).lean();

  // Group by ownerWalletAddress
  const byWallet = new Map<string, typeof datasets>();
  for (const ds of datasets) {
    const addr = ds.ownerWalletAddress.toLowerCase();
    if (!byWallet.has(addr)) byWallet.set(addr, []);
    byWallet.get(addr)!.push(ds);
  }

  const details: BillingRunResult["details"] = [];
  let renewed = 0;
  let expired = 0;
  let errors = 0;

  for (const [walletAddress, walletDatasets] of byWallet) {
    try {
      const balance = await treasury.getUserBalance(walletAddress as Address);

      // Total monthly obligation = sum of monthlyStorageCostWei for all datasets
      const totalMonthly = walletDatasets.reduce((sum, ds) => {
        return sum + BigInt(ds.monthlyStorageCostWei ?? ds.storageCost ?? "0");
      }, 0n);

      const cids = walletDatasets.map((ds) => ds.cid);

      if (balance >= totalMonthly) {
        // Sufficient balance — renew all datasets for this wallet
        await Dataset.updateMany(
          { cid: { $in: cids } },
          { $set: { billingStatus: "active", lastBilledAt: new Date() } }
        );
        renewed += cids.length;
        details.push({
          ownerWalletAddress: walletAddress,
          balanceWei: balance.toString(),
          totalMonthlyObligationWei: totalMonthly.toString(),
          datasetCount: cids.length,
          action: "renewed",
        });
      } else {
        // Insufficient balance — expire all datasets for this wallet
        await Dataset.updateMany(
          { cid: { $in: cids } },
          { $set: { billingStatus: "expired", lastBilledAt: new Date() } }
        );
        expired += cids.length;
        details.push({
          ownerWalletAddress: walletAddress,
          balanceWei: balance.toString(),
          totalMonthlyObligationWei: totalMonthly.toString(),
          datasetCount: cids.length,
          action: "expired",
        });
      }
    } catch (err) {
      errors++;
      details.push({
        ownerWalletAddress: walletAddress,
        balanceWei: "0",
        totalMonthlyObligationWei: "0",
        datasetCount: walletDatasets.length,
        action: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    processedDatasets: datasets.length,
    processedWallets: byWallet.size,
    renewed,
    expired,
    skippedNotDue: false,
    errors,
    details,
  };
}

export type BillingStatusResult = {
  totalDatasets: number;
  activeDatasets: number;
  expiredDatasets: number;
  neverBilled: number;
  walletsAtRisk: number; // balance > 0 but < 2x monthly obligation
  details: Array<{
    ownerWalletAddress: string;
    activeCount: number;
    expiredCount: number;
    totalMonthlyObligationWei: string;
    balanceWei: string;
    status: "healthy" | "at_risk" | "expired" | "unknown";
  }>;
};

/**
 * Return billing health summary across all datasets and wallets.
 */
export async function getBillingStatus(): Promise<BillingStatusResult> {
  const datasets = await Dataset.find({}).lean();

  const activeDatasets = datasets.filter((d) => (d.billingStatus ?? "active") === "active").length;
  const expiredDatasets = datasets.filter((d) => d.billingStatus === "expired").length;
  const neverBilled = datasets.filter((d) => !d.lastBilledAt).length;

  const byWallet = new Map<string, typeof datasets>();
  for (const ds of datasets) {
    const addr = ds.ownerWalletAddress.toLowerCase();
    if (!byWallet.has(addr)) byWallet.set(addr, []);
    byWallet.get(addr)!.push(ds);
  }

  const details: BillingStatusResult["details"] = [];
  let walletsAtRisk = 0;

  for (const [walletAddress, walletDatasets] of byWallet) {
    const totalMonthly = walletDatasets.reduce((sum, ds) => {
      return sum + BigInt(ds.monthlyStorageCostWei ?? ds.storageCost ?? "0");
    }, 0n);
    const activeCount = walletDatasets.filter((d) => (d.billingStatus ?? "active") === "active").length;
    const expiredCount = walletDatasets.filter((d) => d.billingStatus === "expired").length;

    let balanceWei = "0";
    let status: "healthy" | "at_risk" | "expired" | "unknown" = "unknown";

    if (treasury.isTreasuryConfigured()) {
      try {
        const balance = await treasury.getUserBalance(walletAddress as Address);
        balanceWei = balance.toString();
        if (balance === 0n && totalMonthly > 0n) {
          status = "expired";
        } else if (balance < totalMonthly * 2n) {
          status = "at_risk";
          walletsAtRisk++;
        } else {
          status = "healthy";
        }
      } catch {
        status = "unknown";
      }
    }

    details.push({
      ownerWalletAddress: walletAddress,
      activeCount,
      expiredCount,
      totalMonthlyObligationWei: totalMonthly.toString(),
      balanceWei,
      status,
    });
  }

  return {
    totalDatasets: datasets.length,
    activeDatasets,
    expiredDatasets,
    neverBilled,
    walletsAtRisk,
    details,
  };
}
