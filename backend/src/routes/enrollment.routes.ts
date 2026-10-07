import express, { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

/**
 * CREATE ENROLLMENT
 * ADMIN and HOD can enroll students
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "HOD"),
  async (req: Request, res: Response) => {
    try {
      const {
        studentId,
        subjectId,
        semester,
        academicYear,
      } = req.body;

      if (
        !studentId ||
        !subjectId ||
        !semester ||
        !academicYear
      ) {
        return res.status(400).json({
          message:
            "studentId, subjectId, semester and academicYear are required",
        });
      }

      const student = await prisma.student.findUnique({
        where: {
          id: Number(studentId),
        },
      });

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      const subject = await prisma.subject.findUnique({
        where: {
          id: Number(subjectId),
        },
      });

      if (!subject) {
        return res.status(404).json({
          message: "Subject not found",
        });
      }

      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_subjectId_semester_academicYear: {
            studentId: Number(studentId),
            subjectId: Number(subjectId),
            semester: Number(semester),
            academicYear,
          },
        },
      });

      if (existingEnrollment) {
        return res.status(409).json({
          message: "Student is already enrolled in this subject",
        });
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: Number(studentId),
          subjectId: Number(subjectId),
          semester: Number(semester),
          academicYear,
        },
        include: {
          student: true,
          subject: true,
        },
      });

      return res.status(201).json({
        message: "Student enrolled successfully",
        enrollment,
      });
    } catch (error) {
      console.error("Create enrollment error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET ALL ENROLLMENTS
 * ADMIN, FACULTY and HOD can view enrollments
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "FACULTY", "HOD"),
  async (_req: Request, res: Response) => {
    try {
      const enrollments = await prisma.enrollment.findMany({
        include: {
          student: true,
          subject: true,
        },
        orderBy: {
          id: "asc",
        },
      });

      return res.status(200).json({
        count: enrollments.length,
        enrollments,
      });
    } catch (error) {
      console.error("Get enrollments error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET ENROLLMENT BY ID
 * ADMIN, FACULTY and HOD can view an enrollment
 */
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "FACULTY", "HOD"),
  async (req: Request, res: Response) => {
    try {
      const enrollmentId = Number(req.params.id);

      if (Number.isNaN(enrollmentId)) {
        return res.status(400).json({
          message: "Invalid enrollment ID",
        });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          id: enrollmentId,
        },
        include: {
          student: true,
          subject: true,
          attendance: true,
          marks: true,
        },
      });

      if (!enrollment) {
        return res.status(404).json({
          message: "Enrollment not found",
        });
      }

      return res.status(200).json({
        enrollment,
      });
    } catch (error) {
      console.error("Get enrollment error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

/**
 * DELETE ENROLLMENT
 * ADMIN and HOD can remove enrollment
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "HOD"),
  async (req: Request, res: Response) => {
    try {
      const enrollmentId = Number(req.params.id);

      if (Number.isNaN(enrollmentId)) {
        return res.status(400).json({
          message: "Invalid enrollment ID",
        });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          id: enrollmentId,
        },
      });

      if (!enrollment) {
        return res.status(404).json({
          message: "Enrollment not found",
        });
      }

      await prisma.enrollment.delete({
        where: {
          id: enrollmentId,
        },
      });

      return res.status(200).json({
        message: "Enrollment deleted successfully",
      });
    } catch (error) {
      console.error("Delete enrollment error:", error);

      return res.status(500).json({
        message:
          "Enrollment cannot be deleted because it may have attendance or marks",
      });
    }
  }
);

export default router;
