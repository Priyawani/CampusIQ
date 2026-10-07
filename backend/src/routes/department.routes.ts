import express, { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

/**
 * CREATE DEPARTMENT
 * ADMIN only
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { name, code } = req.body;

      if (!name || !code) {
        return res.status(400).json({
          message: "Department name and code are required"
        });
      }

      const existingDepartment = await prisma.department.findUnique({
        where: { code }
      });

      if (existingDepartment) {
        return res.status(409).json({
          message: "Department code already exists"
        });
      }

      const department = await prisma.department.create({
        data: {
          name,
          code
        }
      });

      return res.status(201).json({
        message: "Department created successfully",
        department
      });
    } catch (error) {
      console.error("Create department error:", error);

      return res.status(500).json({
        message: "Internal server error"
      });
    }
  }
);


/**
 * GET ALL DEPARTMENTS
 * ADMIN only
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (_req: Request, res: Response) => {
    try {
      const departments = await prisma.department.findMany({
        orderBy: {
          name: "asc"
        }
      });

      return res.json({
        departments
      });
    } catch (error) {
      console.error("Get departments error:", error);

      return res.status(500).json({
        message: "Internal server error"
      });
    }
  }
);


/**
 * GET DEPARTMENT BY ID
 * ADMIN only
 */
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid department ID"
        });
      }

      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          subjects: true,
          students: true,
          faculty: true
        }
      });

      if (!department) {
        return res.status(404).json({
          message: "Department not found"
        });
      }

      return res.json({
        department
      });
    } catch (error) {
      console.error("Get department error:", error);

      return res.status(500).json({
        message: "Internal server error"
      });
    }
  }
);


/**
 * DELETE DEPARTMENT
 * ADMIN only
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid department ID"
        });
      }

      const department = await prisma.department.findUnique({
        where: { id }
      });

      if (!department) {
        return res.status(404).json({
          message: "Department not found"
        });
      }

      await prisma.department.delete({
        where: { id }
      });

      return res.json({
        message: "Department deleted successfully"
      });
    } catch (error) {
      console.error("Delete department error:", error);

      return res.status(500).json({
        message: "Department cannot be deleted because it may contain students, faculty or subjects"
      });
    }
  }
);

export default router;
