import { Request, Response } from "express";
import { User, generateApiKey } from "../models/User.model.js";
import { ApiKey } from "../models/ApiKey.model.js";

/**
 * POST /user/create
 * Body: walletAddress.
 * Returns: apiKey (store securely; used as x-api-key for all other endpoints).
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({ success: false, error: "walletAddress required" });
      return;
    }
    const trimmed = walletAddress.trim().toLowerCase();
    if (!trimmed) {
      res.status(400).json({ success: false, error: "walletAddress required" });
      return;
    }
    if (!/^0x[0-9a-f]{40}$/.test(trimmed)) {
      res.status(400).json({ success: false, error: "Invalid walletAddress: must be a valid EVM address (0x + 40 hex chars)" });
      return;
    }
    let user = await User.findOne({ walletAddress: trimmed });
    if (user) {
      // Ensure there is an ApiKey row for the primary key (for unified key listing).
      await ApiKey.updateOne(
        { key: user.apiKey },
        {
          $setOnInsert: {
            key: user.apiKey,
            walletAddress: user.walletAddress,
            name: "Primary",
            createdAt: user.createdAt ?? new Date(),
          },
        },
        { upsert: true }
      );
      res.json({
        success: true,
        walletAddress: user.walletAddress,
        apiKey: user.apiKey,
        message: "Existing user",
      });
      return;
    }
    const apiKey = generateApiKey();
    user = await User.create({
      walletAddress: trimmed,
      apiKey,
      createdAt: new Date(),
    });
    await ApiKey.create({
      key: apiKey,
      walletAddress: user.walletAddress,
      name: "Primary",
      createdAt: user.createdAt ?? new Date(),
    });
    res.status(201).json({
      success: true,
      walletAddress: user.walletAddress,
      apiKey: user.apiKey,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Create user failed",
    });
  }
}

/**
 * GET /user/keys (auth)
 * List API keys for the authenticated wallet (includes Primary + any additional keys).
 */
export async function listKeys(req: Request, res: Response): Promise<void> {
  try {
    const walletAddress = (req.user!.walletAddress as string).toLowerCase();
    const keys = await ApiKey.find({ walletAddress, key: { $exists: true, $ne: null } }).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      keys: keys.map((k) => ({
        id: k._id.toString(),
        name: k.name,
        prefix: k.key.slice(0, 12),
        createdAt: k.createdAt,
        lastUsed: k.lastUsedAt ?? null,
        revokedAt: k.revokedAt ?? null,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : "List keys failed" });
  }
}

/**
 * POST /user/keys (auth)
 * Body: { name?: string }
 * Creates an additional API key for this wallet.
 */
export async function createKey(req: Request, res: Response): Promise<void> {
  try {
    const walletAddress = (req.user!.walletAddress as string).toLowerCase();
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const apiKey = generateApiKey();
    const doc = await ApiKey.create({
      key: apiKey,
      walletAddress,
      name: name || "API Key",
      createdAt: new Date(),
    });
    res.status(201).json({
      success: true,
      id: doc._id.toString(),
      key: apiKey,
      prefix: apiKey.slice(0, 12),
      name: doc.name,
      createdAt: doc.createdAt,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : "Create key failed" });
  }
}

/**
 * DELETE /user/keys/:id (auth)
 * Revoke a key belonging to this wallet. Primary key can be revoked but will still exist on User; keep it active by convention.
 */
export async function revokeKey(req: Request, res: Response): Promise<void> {
  try {
    const walletAddress = (req.user!.walletAddress as string).toLowerCase();
    const { id } = req.params;
    const result = await ApiKey.updateOne(
      { _id: id, walletAddress },
      { $set: { revokedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, error: "Key not found" });
      return;
    }
    res.json({ success: true, revoked: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : "Revoke failed" });
  }
}
