import express, { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

/**
 * CREATE FACULTY
 * ADMIN only
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const {
        userId,
        employeeId,
        firstName,
        lastName,
        departmentId,
      } = req.body;

      if (
        !userId ||
        !employeeId ||
        !firstName ||
        !lastName ||
        !departmentId
      ) {
        return res.status(400).json({
          message:
            "userId, employeeId, firstName, lastName and departmentId are required",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.role !== "FACULTY") {
        return res.status(400).json({
          message: "User role must be FACULTY",
        });
      }

      const existingFaculty = await prisma.faculty.findUnique({
        where: { userId: Number(userId) },
      });

      if (existingFaculty) {
        return res.status(409).json({
          message: "Faculty profile already exists for this user",
        });
      }

      const existingEmployee = await prisma.faculty.findUnique({
        where: { employeeId },
      });

      if (existingEmployee) {
        return res.status(409).json({
          message: "Employee ID already exists",
        });
      }

      const department = await prisma.department.findUnique({
        where: { id: Number(departmentId) },
      });

      if (!department) {
        return res.status(404).json({
          message: "Department not found",
        });
      }

      const faculty = await prisma.faculty.create({
        data: {
          userId: Number(userId),
          employeeId,
          firstName,
          lastName,
          departmentId: Number(departmentId),
        },
        include: {
          department: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return res.status(201).json({
        message: "Faculty created successfully",
        faculty,
      });
    } catch (error) {
      console.error("Create faculty error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET ALL FACULTY
 * ADMIN and HOD
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "HOD"),
  async (_req: Request, res: Response) => {
    try {
      const faculty = await prisma.faculty.findMany({
        include: {
          department: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      });

      return res.status(200).json({
        count: faculty.length,
        faculty,
      });
    } catch (error) {
      console.error("Get faculty error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET FACULTY BY ID
 * ADMIN and HOD
 */
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "HOD"),
  async (req: Request, res: Response) => {
    try {
      const facultyId = Number(req.params.id);

      if (Number.isNaN(facultyId)) {
        return res.status(400).json({
          message: "Invalid faculty ID",
        });
      }

      const faculty = await prisma.faculty.findUnique({
        where: { id: facultyId },
        include: {
          department: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!faculty) {
        return res.status(404).json({
          message: "Faculty not found",
        });
      }

      return res.status(200).json({
        faculty,
      });
    } catch (error) {
      console.error("Get faculty error:", error);

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

export default router;
