import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/rbac.middleware.js";
import { predictPerformance } from "../controllers/ai.controller.js";

const router = Router();

// ============================================================
// POST /api/ai/predict-performance
// Delegates to ai.controller.predictPerformance, which aggregates
// live PostgreSQL data (Attendance %, average Mark score) via Prisma
// and forwards { studentId, attendanceRate, averageScore, ... } to
// the Python microservice on port 8000.
// ===========================================================
router.post(
  "/predict-performance",
  authenticateToken,
  authorizeRoles("ADMIN", "FACULTY"),
  predictPerformance
);

export default router;