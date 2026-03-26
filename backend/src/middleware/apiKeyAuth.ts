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
    const apiKeyDoc = await ApiKey.findOne({ key, revokedAt: null }).lean();
    if (apiKeyDoc) {
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
        $set: { lastUsedAt: new Date(), revokedAt: null },
      },
      { upsert: true }
    );
    // Legacy key still works; attach user.
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: "Authentication error" });
  }
}
