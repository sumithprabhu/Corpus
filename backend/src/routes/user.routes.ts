import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = Router();

router.post("/create", userController.create);
router.get("/keys", apiKeyAuth, userController.listKeys);
router.post("/keys", apiKeyAuth, userController.createKey);
router.delete("/keys/:id", apiKeyAuth, userController.revokeKey);

export const userRoutes = router;
