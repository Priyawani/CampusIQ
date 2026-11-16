import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.middleware.js";

const router = express.Router();

// ===============================
// REGISTER
// ===============================

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, enrollmentNo, role } = req.body;

    // 1. Validate required fields (name/enrollmentNo accepted for the
    // client contract; role-linked profiles are managed via the
    // Students/Faculty flows which require a department)
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // 2. Validate role against the Prisma Role enum (defaults to STUDENT)
    const allowedRoles = ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "STUDENT"];
    const assignedRole = role ?? "STUDENT";

    if (!allowedRoles.includes(assignedRole)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${allowedRoles.join(", ")}`
      });
    }

    // 3. Check whether email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists"
      });
    }

    if (enrollmentNo) {
      const existingRollNumber = await prisma.student.findUnique({
        where: { rollNumber: enrollmentNo }
      });

      if (existingRollNumber) {
        return res.status(409).json({
          message: "Enrollment number is already in use"
        });
      }
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Create user (no auto-login; client redirects to / login page)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: assignedRole
      }
    });

    // 6. Return safe user information
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        ...(name ? { name } : {}),
        ...(enrollmentNo ? { enrollmentNo } : {})
      }
    });

  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


// ===============================
// LOGIN
// ===============================

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // 2. Find user
    const user = await prisma.user.findUnique({
      where: {
        email
      },
      include: {
        assignedClasses: { select: { id: true } }
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // 3. Compare password with stored hash
    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // 4. Get JWT secret
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const assignedClasses = user.assignedClasses.map((classGroup) => classGroup.id);

    // 5. Generate JWT with tenancy + class assignment claims
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        departmentId: user.departmentId,
        assignedClasses
      },
      jwtSecret,
      {
        expiresIn: "1h"
      }
    );

    // 6. Return token and safe user information
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        assignedClasses
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


// ===============================
// GET CURRENT PROFILE
// ===============================

router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        bio: true,
        departmentId: true,
        department: { select: { code: true, name: true } },
        createdAt: true,
        updatedAt: true,
        assignedClasses: { select: { id: true, name: true } },
        studentProfile: {
          select: {
            rollNumber: true,
            firstName: true,
            lastName: true,
            department: { select: { code: true, name: true } }
          }
        },
        faculty: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { code: true, name: true } }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// ===============================
// UPDATE CURRENT PROFILE
// ===============================

router.put("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, email, phone, bio, department } = req.body;

    // 1. If email is changing, ensure it isn't taken
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Email is already in use" });
      }
    }

    // 2. Update the user record (only provided fields)
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {})
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        phone: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 3. Optionally move the student's department (lookup by code)
    if (department) {
      const student = await prisma.student.findUnique({ where: { userId } });

      if (student) {
        const dept = await prisma.department.findUnique({ where: { code: department } });

        if (!dept) {
          return res.status(400).json({ message: `Unknown department code: ${department}` });
        }

        if (dept.id !== student.departmentId) {
          await prisma.student.update({
            where: { userId },
            data: { departmentId: dept.id }
          });
        }
      }
    }

    return res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// ===============================
// EXPORT ROUTER
// ===============================

export default router;
