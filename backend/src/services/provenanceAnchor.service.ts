import { ModelRun } from "../models/ModelRun.model.js";
import {
  submitProvenanceAnchor,
  waitForAnchorReceipt,
  isProvenanceAnchorConfigured,
} from "../helpers/provenance.js";

/**
 * Submit a provenance anchor tx for a model run and store the txHash with status='pending'.
 * Does NOT wait for receipt — the background retry service handles confirmation.
 */
export async function enqueueProvenanceAnchor(modelRunId: string, provenanceHash: string): Promise<void> {
  try {
    const txHash = await submitProvenanceAnchor(provenanceHash);
    await ModelRun.updateOne(
      { _id: modelRunId },
      { $set: { anchorTxHash: txHash, anchorStatus: "pending" } }
    );
    console.log(`[provenanceAnchor] Submitted anchor tx ${txHash} for model run ${modelRunId}`);
  } catch (err) {
    console.error(`[provenanceAnchor] Failed to submit anchor tx for ${modelRunId}:`, err);
    // Don't crash — registration already succeeded. Will be retried if manually triggered.
    await ModelRun.updateOne(
      { _id: modelRunId },
      { $set: { anchorStatus: "failed" } }
    );
  }
}

/**
 * Process all pending provenance anchors: wait for receipt and mark as anchored.
 */
export async function processPendingAnchors(): Promise<{ processed: number; confirmed: number; failed: number }> {
  if (!isProvenanceAnchorConfigured()) return { processed: 0, confirmed: 0, failed: 0 };

  const pending = await ModelRun.find({ anchorStatus: "pending", anchorTxHash: { $exists: true } }).lean();
  let confirmed = 0;
  let failed = 0;

  for (const run of pending) {
    if (!run.anchorTxHash) continue;
    try {
      const { blockNumber } = await waitForAnchorReceipt(run.anchorTxHash);
      await ModelRun.updateOne(
        { _id: run._id },
        { $set: { anchorStatus: "anchored", anchorBlock: blockNumber.toString() } }
      );
      console.log(`[provenanceAnchor] Confirmed anchor for ${run._id} at block ${blockNumber}`);
      confirmed++;
    } catch (err) {
      console.error(`[provenanceAnchor] Failed to confirm anchor for ${run._id}:`, err);
      failed++;
    }
  }

  return { processed: pending.length, confirmed, failed };
}
