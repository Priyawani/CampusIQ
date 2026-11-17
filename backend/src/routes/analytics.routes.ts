import { Router } from "express";
import { getPredictions } from "../controllers/analytics.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/rbac.middleware.js";

const router = Router();

router.get(
  "/predictions",
  authenticateToken,
  authorizeRoles("ADMIN", "FACULTY", "DEPT_ADMIN", "SUPERADMIN"),
  getPredictions
);

export default router;
