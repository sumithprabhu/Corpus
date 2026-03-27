import type { Request, Response } from "express";
import { runMonthlyDebit, getBillingStatus } from "../services/billing.service.js";
import { config } from "../config/index.js";

function checkBillingSecret(req: Request, res: Response): boolean {
  const secret = config.billingSecret;
  if (!secret) {
    res.status(503).json({ success: false, error: "Billing endpoint not configured (BILLING_SECRET not set)" });
    return false;
  }
  const provided = req.headers["x-billing-secret"];
  if (!provided || provided !== secret) {
    res.status(401).json({ success: false, error: "Invalid billing secret" });
    return false;
  }
  return true;
}

export async function runMonthlyDebitHandler(req: Request, res: Response): Promise<void> {
  if (!checkBillingSecret(req, res)) return;
  try {
    const result = await runMonthlyDebit();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[billing] runMonthlyDebit error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function getBillingStatusHandler(req: Request, res: Response): Promise<void> {
  if (!checkBillingSecret(req, res)) return;
  try {
    const result = await getBillingStatus();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[billing] getBillingStatus error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
