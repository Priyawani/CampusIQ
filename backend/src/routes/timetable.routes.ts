import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/rbac.middleware.js";
import {
  createLessonResource,
  createSubstituteRequest,
  createTimetableBlock,
  deleteTimetableBlock,
  getDepartmentTimetable,
  getFacultyOptions,
  getClassLessonResources,
  getMyDayTimetable,
  updateTimetableBlock,
} from "../controllers/timetable.controller.js";

const router = Router();
const TIMETABLE_MANAGERS = authorizeRoles("DEPT_ADMIN", "SUPERADMIN");

router.get("/my-day", authenticateToken, getMyDayTimetable);
router.get("/resources", authenticateToken, getClassLessonResources);
router.get(
  "/blocks",
  authenticateToken,
  authorizeRoles("DEPT_ADMIN", "SUPERADMIN", "FACULTY"),
  getDepartmentTimetable
);
router.get("/faculty-options", authenticateToken, TIMETABLE_MANAGERS, getFacultyOptions);
router.post("/", authenticateToken, TIMETABLE_MANAGERS, createTimetableBlock);
router.put("/:id", authenticateToken, TIMETABLE_MANAGERS, updateTimetableBlock);
router.delete("/:id", authenticateToken, TIMETABLE_MANAGERS, deleteTimetableBlock);
router.post(
  "/:timetableId/resources",
  authenticateToken,
  authorizeRoles("FACULTY", "ADMIN", "DEPT_ADMIN", "SUPERADMIN"),
  createLessonResource
);
router.post(
  "/substitute",
  authenticateToken,
  authorizeRoles("FACULTY", "ADMIN"),
  createSubstituteRequest
);

export default router;
