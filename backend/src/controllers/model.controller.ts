import { Request, Response } from "express";
import * as modelService from "../services/model.service.js";

/**
 * POST /model/register
 * Body: datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash.
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash } = req.body;
    if (
      !datasetCID ||
      !modelArtifactCID ||
      !trainingConfigHash ||
      !trainingCodeHash
    ) {
      res.status(400).json({
        success: false,
        error: "datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash required",
      });
      return;
    }
    const run = await modelService.registerModelRun({
      datasetCID,
      modelArtifactCID,
      trainingConfigHash,
      trainingCodeHash,
      ownerApiKey: req.user!.apiKey,
      ownerWalletAddress: req.user!.walletAddress,
    });
    res.status(201).json({ success: true, ...run });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Register failed",
    });
  }
}

/**
 * GET /model — list model runs; optional ?datasetCID= to filter.
 * GET /model/:provenanceHash — get single run.
 */
export async function get(req: Request, res: Response): Promise<void> {
  try {
    const { provenanceHash } = req.params;
    if (provenanceHash) {
      const run = await modelService.getModelRunByProvenanceHash(provenanceHash);
      res.json({ success: true, ...run });
      return;
    }
    const datasetCID = req.query.datasetCID as string | undefined;
    const mine = req.query.mine === "1" || req.query.mine === "true";
    const list = await modelService.listModelRuns({
      ...(datasetCID && { datasetCID }),
      ...(mine && { ownerApiKey: req.user!.apiKey }),
    });
    res.json({ success: true, modelRuns: list });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Model run not found") {
      res.status(404).json({ success: false, error: msg });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
}
