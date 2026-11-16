import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/rbac.middleware.js";
import {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getMarksByStudent,
  getMarksBySubject,
  createMark,
  createBatchMarks,
  getAttendanceByStudent,
  getMonthlyAttendanceReport,
  createAttendance,
  createBatchAttendance,
  notifyParents,
} from "../controllers/academic.controller.js";

const router = Router();

// Every academic endpoint requires a valid JWT. Write access is limited to
// ADMIN/FACULTY; read endpoints additionally enforce "own records only" for
// STUDENT callers inside the controller.
const STAFF_ONLY = authorizeRoles("ADMIN", "FACULTY");

// ===============================
// SUBJECTS
// ===============================
router.get("/subjects", authenticateToken, listSubjects);
router.get("/subjects/:id", authenticateToken, getSubjectById);
router.post("/subjects", authenticateToken, STAFF_ONLY, createSubject);
router.put("/subjects/:id", authenticateToken, STAFF_ONLY, updateSubject);
router.delete("/subjects/:id", authenticateToken, STAFF_ONLY, deleteSubject);

// ===============================
// MARKS
// ===============================
router.get("/marks/subject/:id", authenticateToken, getMarksBySubject);
router.get("/marks/student/:id", authenticateToken, getMarksByStudent);
router.post("/marks/batch", authenticateToken, STAFF_ONLY, createBatchMarks);
router.post("/marks", authenticateToken, STAFF_ONLY, createMark);

// ===============================
// ATTENDANCE
// ===============================
router.get("/attendance/monthly-report", authenticateToken, STAFF_ONLY, getMonthlyAttendanceReport);
router.get("/attendance/student/:id", authenticateToken, getAttendanceByStudent);
router.post("/attendance/batch", authenticateToken, STAFF_ONLY, createBatchAttendance);
router.post("/attendance/notify-parents", authenticateToken, STAFF_ONLY, notifyParents);
router.post("/attendance", authenticateToken, STAFF_ONLY, createAttendance);

export default router;
