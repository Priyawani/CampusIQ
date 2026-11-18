import { Router } from "express";
import {
  getHighRiskShap,
  getPredictions,
} from "../controllers/analytics.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/rbac.middleware.js";

const router = Router();

const ANALYTICS_VIEWERS = authorizeRoles(
  "ADMIN",
  "FACULTY",
  "DEPT_ADMIN",
  "SUPERADMIN"
);

router.get("/predictions", authenticateToken, ANALYTICS_VIEWERS, getPredictions);
router.get(
  "/high-risk-shap",
  authenticateToken,
  ANALYTICS_VIEWERS,
  getHighRiskShap
);

export default router;
