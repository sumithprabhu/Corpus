import { Router } from "express";
import { runMonthlyDebitHandler, getBillingStatusHandler } from "../controllers/billing.controller.js";

export const billingRoutes = Router();

billingRoutes.post("/run-monthly-debit", runMonthlyDebitHandler);
billingRoutes.get("/status", getBillingStatusHandler);
