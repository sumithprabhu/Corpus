import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import { uploadSingle } from "../middleware/upload.js";
import * as datasetController from "../controllers/dataset.controller.js";

const router = Router();

router.use(apiKeyAuth);

router.get("/prepare", datasetController.getPrepare);
router.post("/upload", uploadSingle, datasetController.upload);
router.post("/version", uploadSingle, datasetController.createVersion);
router.get("/", datasetController.list);
// Named datasets (must be before /:cid so "by-name" is not treated as cid)
router.get("/by-name/:name/versions", datasetController.listVersionsByName);
router.post("/by-name/:name/version", uploadSingle, datasetController.addVersionByName);
router.put("/by-name/:name/default", datasetController.setDefaultByName);
router.delete("/by-name/:name", datasetController.deleteByName);
router.get("/by-name/:name", datasetController.getByName);
router.get("/:cid/raw", datasetController.getRawByCid);
router.get("/:cid/shares", datasetController.listShares);
router.post("/:cid/share", datasetController.shareDataset);
router.delete("/:cid/share/:walletAddress", datasetController.revokeShare);
router.delete("/:cid", datasetController.deleteByCid);
router.get("/:cid", datasetController.getByCid);

export const datasetRoutes = router;
