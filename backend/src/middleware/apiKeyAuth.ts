import { Request, Response, NextFunction } from "express";
import { User } from "../models/User.model.js";
import { ApiKey } from "../models/ApiKey.model.js";

/**
 * API key gating: validates x-api-key header, looks up user, attaches to request.
 * Rejects with 401 if missing or invalid.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers["x-api-key"];
  const key = typeof apiKey === "string" ? apiKey.trim() : "";

  if (!key) {
    res.status(401).json({ success: false, error: "Missing x-api-key header" });
    return;
  }

  try {
    // Prefer ApiKey collection (supports multiple keys); fallback to legacy User.apiKey.
    const apiKeyDoc = await ApiKey.findOne({ key }).lean();
    if (apiKeyDoc) {
      // Reject revoked keys immediately — do NOT fall through to legacy path.
      if (apiKeyDoc.revokedAt) {
        res.status(401).json({ success: false, error: "API key has been revoked" });
        return;
      }
      const user = await User.findOne({ walletAddress: apiKeyDoc.walletAddress });
      if (!user) {
        res.status(401).json({ success: false, error: "Invalid API key" });
        return;
      }
      // update last used
      await ApiKey.updateOne({ _id: apiKeyDoc._id }, { $set: { lastUsedAt: new Date() } });
      req.user = user;
      next();
      return;
    }

    // Legacy fallback: key exists on User but not yet migrated to ApiKey collection.
    const user = await User.findOne({ apiKey: key });
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid API key" });
      return;
    }
    await ApiKey.updateOne(
      { key: user.apiKey },
      {
        $setOnInsert: {
          key: user.apiKey,
          walletAddress: user.walletAddress,
          name: "Primary",
          createdAt: user.createdAt ?? new Date(),
        },
        $set: { lastUsedAt: new Date() },
      },
      { upsert: true }
    );
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: "Authentication error" });
  }
}
