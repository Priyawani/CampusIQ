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
  getDailyAttendance,
  getMonthlyAttendanceReport,
  createAttendance,
  createBatchAttendance,
  notifyParents,
} from "../controllers/academic.controller.js";

const router = Router();

// Every academic endpoint requires a valid JWT. Curriculum changes belong to
// SUPERADMIN alone; marks/attendance writes belong to FACULTY alone.
// DEPT_ADMIN keeps read-only oversight, scoped to their department in the
// controller. STUDENT callers are restricted to their own records there too.
const SUPERADMIN_ONLY = authorizeRoles("SUPERADMIN");
const FACULTY_ONLY = authorizeRoles("FACULTY");
const STAFF_READ = authorizeRoles("SUPERADMIN", "DEPT_ADMIN", "ADMIN", "FACULTY");

// ===============================
// SUBJECTS
// ===============================
router.get("/subjects", authenticateToken, listSubjects);
router.get("/subjects/:id", authenticateToken, getSubjectById);
router.post("/subjects", authenticateToken, SUPERADMIN_ONLY, createSubject);
router.put("/subjects/:id", authenticateToken, SUPERADMIN_ONLY, updateSubject);
router.delete("/subjects/:id", authenticateToken, SUPERADMIN_ONLY, deleteSubject);

// ===============================
// MARKS
// ===============================
router.get("/marks/subject/:id", authenticateToken, getMarksBySubject);
router.get("/marks/student/:id", authenticateToken, getMarksByStudent);
router.post("/marks/batch", authenticateToken, FACULTY_ONLY, createBatchMarks);
router.put("/marks/batch", authenticateToken, FACULTY_ONLY, createBatchMarks);
router.post("/marks", authenticateToken, FACULTY_ONLY, createMark);
router.put("/marks", authenticateToken, FACULTY_ONLY, createMark);

// ===============================
// ATTENDANCE
// ===============================
router.get("/attendance/day", authenticateToken, STAFF_READ, getDailyAttendance);
router.get("/attendance/monthly-report", authenticateToken, STAFF_READ, getMonthlyAttendanceReport);
router.get("/attendance/student/:id", authenticateToken, getAttendanceByStudent);
router.post("/attendance/batch", authenticateToken, FACULTY_ONLY, createBatchAttendance);
router.put("/attendance/batch", authenticateToken, FACULTY_ONLY, createBatchAttendance);
router.post("/attendance/notify-parents", authenticateToken, FACULTY_ONLY, notifyParents);
router.post("/attendance", authenticateToken, FACULTY_ONLY, createAttendance);
router.put("/attendance", authenticateToken, FACULTY_ONLY, createAttendance);

export default router;
