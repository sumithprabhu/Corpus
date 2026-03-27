import { Request, Response } from "express";
import * as datasetService from "../services/dataset.service.js";
import { INSUFFICIENT_STORAGE_BALANCE } from "../services/dataset.service.js";

/**
 * POST /dataset/upload
 * Body: multipart file; optional name (unique per user for new dataset), encrypt, previousCID (for versioning by CID).
 */
export async function upload(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ success: false, error: "No file provided" });
      return;
    }
    const ownerApiKey = req.user!.apiKey;
    const ownerWalletAddress = req.user!.walletAddress;
    const name = typeof req.body?.name === "string" ? req.body.name.trim() || undefined : undefined;
    const encrypt = req.body?.encrypt === true || req.body?.encrypt === "true";
    const previousCID = req.body?.previousCID ?? null;
    const result = await datasetService.uploadDataset(file.buffer, {
      ownerApiKey,
      ownerWalletAddress,
      name: name ?? null,
      encrypt,
      previousCID: previousCID || undefined,
    });
    res.status(201).json({
      success: true,
      pieceCID: result.pieceCID,
      cid: result.pieceCID,
      name: name ?? undefined,
      storageCost: result.storageCost,
      ...(result.treasuryFailed && { warning: "treasury_recording_pending" }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    if (msg === INSUFFICIENT_STORAGE_BALANCE || (e as Error & { code?: string })?.code === INSUFFICIENT_STORAGE_BALANCE) {
      res.status(402).json({ success: false, error: INSUFFICIENT_STORAGE_BALANCE });
      return;
    }
    if (msg.includes("already exists")) res.status(409).json({ success: false, error: msg });
    else res.status(500).json({ success: false, error: msg });
  }
}

/**
 * GET /dataset/prepare — return the cost that will be debited from the user's treasury per upload.
 * Call this before upload so the client can show required balance or cost per upload.
 */
export async function getPrepare(req: Request, res: Response): Promise<void> {
  try {
    const info = await datasetService.getPrepareCost();
    res.json({
      success: true,
      debitPerUploadWei: info.debitPerUploadWei,
      debitPerMonthWei: info.debitPerMonthWei,
      description: info.description,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Prepare failed",
    });
  }
}

/**
 * GET /dataset/:cid/raw — retrieve raw bytes from Filecoin (no decompress, no decrypt). Owner-only.
 */
export async function getRawByCid(req: Request, res: Response): Promise<void> {
  try {
    const { cid } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const requesterWalletAddress = req.user!.walletAddress;
    const buffer = await datasetService.getDatasetRawByCid(cid, ownerApiKey, requesterWalletAddress);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Not found";
    if (msg === "Dataset not found" || msg === "Unauthorized") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if ((e as Error & { code?: string })?.code === 'BILLING_EXPIRED') {
      res.status(402).json({ success: false, error: msg, code: 'BILLING_EXPIRED' });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * GET /dataset/:cid — retrieve dataset file (or metadata via query ?metadata=1).
 */
export async function getByCid(req: Request, res: Response): Promise<void> {
  try {
    const { cid } = req.params;
    const metadataOnly = req.query.metadata === "1" || req.query.metadata === "true";
    const ownerApiKey = req.user!.apiKey;
    const requesterWalletAddress = req.user!.walletAddress;
    if (metadataOnly) {
      const meta = await datasetService.getDatasetMetadata(cid, ownerApiKey, requesterWalletAddress);
      res.json({ success: true, ...meta });
      return;
    }
    const buffer = await datasetService.getDatasetByCid(cid, ownerApiKey, requesterWalletAddress);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Not found";
    if (msg === "Dataset not found" || msg === "Unauthorized") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if ((e as Error & { code?: string })?.code === 'BILLING_EXPIRED') {
      res.status(402).json({ success: false, error: msg, code: 'BILLING_EXPIRED' });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * POST /dataset/version — create new version linked to previousCID.
 * Body: multipart file, previousCID (required).
 */
export async function createVersion(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ success: false, error: "No file provided" });
      return;
    }
    const previousCID = req.body?.previousCID;
    if (!previousCID || typeof previousCID !== "string") {
      res.status(400).json({ success: false, error: "previousCID required" });
      return;
    }
    const ownerApiKey = req.user!.apiKey;
    const ownerWalletAddress = req.user!.walletAddress;
    const encrypt = req.body?.encrypt === true || req.body?.encrypt === "true";
    const result = await datasetService.createDatasetVersion(
      file.buffer,
      ownerApiKey,
      ownerWalletAddress,
      previousCID,
      encrypt
    );
    res.status(201).json({
      success: true,
      pieceCID: result.pieceCID,
      cid: result.pieceCID,
      storageCost: result.storageCost,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create version failed";
    if (msg === INSUFFICIENT_STORAGE_BALANCE || (e as Error & { code?: string })?.code === INSUFFICIENT_STORAGE_BALANCE) {
      res.status(402).json({ success: false, error: INSUFFICIENT_STORAGE_BALANCE });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * GET /dataset — list datasets for the authenticated API key.
 */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const ownerApiKey = req.user!.apiKey;
    const list = await datasetService.listDatasets(ownerApiKey);
    res.json({ success: true, datasets: list });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "List failed",
    });
  }
}

// --- By-name (named datasets) ---

/**
 * GET /dataset/by-name/:name — download default version, or ?version=cid for a specific version.
 */
export async function getByName(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.params;
    const versionCid = typeof req.query.version === "string" ? req.query.version.trim() : undefined;
    const ownerApiKey = req.user!.apiKey;
    let cid: string;
    if (versionCid) {
      await datasetService.ensureVersionBelongsToName(ownerApiKey, name, versionCid);
      cid = versionCid;
    } else {
      cid = await datasetService.getDefaultCidByName(ownerApiKey, name);
    }
    const buffer = await datasetService.getDatasetByCid(cid, ownerApiKey, req.user!.walletAddress);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Not found";
    if (msg === "Dataset not found" || msg === "Dataset version not found" || msg === "Unauthorized") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if ((e as Error & { code?: string })?.code === 'BILLING_EXPIRED') {
      res.status(402).json({ success: false, error: msg, code: 'BILLING_EXPIRED' });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * GET /dataset/by-name/:name/versions — list all versions of a named dataset.
 */
export async function listVersionsByName(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const versions = await datasetService.listVersionsByName(ownerApiKey, name);
    res.json({ success: true, name, versions });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "List versions failed",
    });
  }
}

/**
 * POST /dataset/by-name/:name/version — add a new version to a named dataset. New version becomes default.
 */
export async function addVersionByName(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ success: false, error: "No file provided" });
      return;
    }
    const { name } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const ownerWalletAddress = req.user!.walletAddress;
    const encrypt = req.body?.encrypt === true || req.body?.encrypt === "true";
    const result = await datasetService.createDatasetVersionByName(
      file.buffer,
      ownerApiKey,
      ownerWalletAddress,
      name,
      encrypt
    );
    res.status(201).json({
      success: true,
      pieceCID: result.pieceCID,
      cid: result.pieceCID,
      name,
      storageCost: result.storageCost,
      ...(result.treasuryFailed && { warning: "treasury_recording_pending" }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Add version failed";
    if (msg === "Dataset not found") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    if (msg === INSUFFICIENT_STORAGE_BALANCE || (e as Error & { code?: string })?.code === INSUFFICIENT_STORAGE_BALANCE) {
      res.status(402).json({ success: false, error: INSUFFICIENT_STORAGE_BALANCE });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * PUT /dataset/by-name/:name/default — set which version is default. Body: { cid }.
 */
export async function setDefaultByName(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.params;
    const cid = typeof req.body?.cid === "string" ? req.body.cid.trim() : "";
    if (!cid) {
      res.status(400).json({ success: false, error: "cid required in body" });
      return;
    }
    const ownerApiKey = req.user!.apiKey;
    await datasetService.setDefaultVersion(ownerApiKey, name, cid);
    res.json({ success: true, name, defaultCid: cid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Set default failed";
    if (msg === "Dataset version not found") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * DELETE /dataset/:cid — delete one dataset version by CID. Owner-only. Removes MongoDB record only; data on Filecoin remains.
 */
export async function deleteByCid(req: Request, res: Response): Promise<void> {
  try {
    const { cid } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const deleted = await datasetService.deleteDatasetByCid(ownerApiKey, cid);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Dataset not found" });
      return;
    }
    res.status(200).json({ success: true, cid, deleted: true });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Delete failed",
    });
  }
}

/**
 * DELETE /dataset/by-name/:name — delete all versions of a named dataset. Owner-only. Removes MongoDB records only.
 */
export async function deleteByName(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const deletedCount = await datasetService.deleteDatasetByName(ownerApiKey, name);
    res.status(200).json({ success: true, name, deletedCount });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Delete failed",
    });
  }
}

// ---- Dataset sharing (ACL) ----

/**
 * POST /dataset/:cid/share — Grant read access to a wallet address. Owner-only.
 * Body: { walletAddress: string }
 */
export async function shareDataset(req: Request, res: Response): Promise<void> {
  try {
    const { cid } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const walletAddress = typeof req.body?.walletAddress === "string" ? req.body.walletAddress.trim() : "";
    if (!walletAddress) {
      res.status(400).json({ success: false, error: "walletAddress required" });
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
      res.status(400).json({ success: false, error: "Invalid walletAddress: must be a valid EVM address" });
      return;
    }
    await datasetService.shareDataset(ownerApiKey, cid, walletAddress);
    res.json({ success: true, cid, sharedWith: walletAddress.toLowerCase() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Share failed";
    if (msg === "Dataset not found") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    res.status(400).json({ success: false, error: msg });
  }
}

/**
 * DELETE /dataset/:cid/share/:walletAddress — Revoke read access for a wallet. Owner-only.
 */
export async function revokeShare(req: Request, res: Response): Promise<void> {
  try {
    const { cid, walletAddress } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const revoked = await datasetService.revokeDatasetShare(ownerApiKey, cid, walletAddress);
    res.json({ success: true, cid, walletAddress: walletAddress.toLowerCase(), revoked });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Revoke share failed";
    if (msg === "Dataset not found") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * GET /dataset/:cid/shares — List all wallets with read access. Owner-only.
 */
export async function listShares(req: Request, res: Response): Promise<void> {
  try {
    const { cid } = req.params;
    const ownerApiKey = req.user!.apiKey;
    const shares = await datasetService.listDatasetShares(ownerApiKey, cid);
    res.json({ success: true, cid, shares });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "List shares failed";
    if (msg === "Dataset not found") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}
