import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const router = express.Router();

// ===============================
// GET ALL STUDENTS (Formatted for the frontend)
// Supports an optional `?classGroupId=` filter for multi-class/batch routing.
// ===============================
router.get("/", async (req: Request, res: Response) => {
  try {
    const classGroupIdParam = req.query.classGroupId;
    const classGroupId =
      typeof classGroupIdParam === "string" && classGroupIdParam.trim() !== ""
        ? Number(classGroupIdParam)
        : undefined;

    if (classGroupId !== undefined && (!Number.isInteger(classGroupId) || classGroupId <= 0)) {
      return res.status(400).json({ message: "Invalid classGroupId" });
    }

    const students = await prisma.student.findMany({
      where: classGroupId !== undefined ? { classGroupId } : undefined,
      include: {
        user: true,
        classGroup: {
          include: {
            department: true,
            specialization: true,
          },
        },
      },
    });

    // Translate database layout back into the simple frontend layout
    const formattedStudents = students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      email: s.user.email,
      enrollmentNo: s.rollNumber,
      department: s.classGroup?.department?.name ?? "",
      departmentId: s.classGroup?.departmentId ?? 0,
      specialization: s.classGroup?.specialization?.name ?? "",
      specializationId: s.classGroup?.specializationId ?? null,
      rollNo: s.rollNo,
      contactNo: s.contactNo,
      parentEmail: s.parentEmail,
      parentMobile: s.parentMobile,
      className: s.classGroup?.name ?? "",
      classGroupId: s.classGroupId ?? null,
      classGroup: s.classGroup
        ? {
            id: s.classGroup.id,
            name: s.classGroup.name,
            year: s.classGroup.year,
            departmentId: s.classGroup.departmentId,
            specializationId: s.classGroup.specializationId,
            specialization: s.classGroup.specialization
              ? {
                  id: s.classGroup.specialization.id,
                  name: s.classGroup.specialization.name,
                }
              : null,
          }
        : null,
    }));

    res.json(formattedStudents);
  } catch (err) {
    console.error("Fetch Students Error:", err);
    return res.json([]);
  }
});

// ===============================
// GET CLASS GROUPS (for dropdowns)
// ===============================
router.get("/class-groups", async (req: Request, res: Response) => {
  try {
    const parseNumberParam = (value: unknown) => {
      if (typeof value !== "string") return undefined;
      const digits = value.replace(/\D/g, "");
      if (!digits) return undefined;

      const parsed = Number(digits);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const departmentId = parseNumberParam(req.query.departmentId);
    const year = parseNumberParam(req.query.year);
    const rawSpecializationId = req.query.specializationId;
    const specializationId =
      typeof rawSpecializationId === "string" &&
      rawSpecializationId.trim().toLowerCase() === "null"
        ? null
        : parseNumberParam(rawSpecializationId);

    const classGroups = await prisma.classGroup.findMany({
      where: {
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(year !== undefined ? { year } : {}),
        ...(specializationId !== undefined ? { specializationId } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, code: true, name: true } },
        specialization: { select: { id: true, name: true, departmentId: true } },
      },
    });

    return res.json(classGroups);
  } catch (error) {
    console.error("Error fetching class groups:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// GET SPECIALIZATIONS (for dropdowns)
// ===============================
router.get("/specializations", async (req: Request, res: Response) => {
  try {
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;

    const specializations = await prisma.specialization.findMany({
      where: departmentId !== undefined ? { departmentId } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true, departmentId: true },
    });

    res.json(specializations);
  } catch (error) {
    console.error("Error fetching specializations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// GET DEPARTMENTS (for dropdowns)
// ===============================
router.get("/departments", async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });

    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// CREATE A STUDENT
// ===============================
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};

    // Safely normalize the incoming payload. The Student model uses rollNumber
    // (not enrollmentNo) and has no departmentId column.
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const enrollmentNo =
      body.enrollmentNo !== undefined && body.enrollmentNo !== null
        ? String(body.enrollmentNo).trim()
        : "";
    const rawClassGroupId = body.classGroupId;
    const classGroupId =
      rawClassGroupId !== undefined &&
      rawClassGroupId !== null &&
      String(rawClassGroupId).trim() !== ""
        ? Number(rawClassGroupId)
        : null;
    const rollNo =
      body.rollNo !== undefined && body.rollNo !== null && String(body.rollNo).trim() !== ""
        ? String(body.rollNo).trim()
        : null;
    const contactNo =
      body.contactNo !== undefined && body.contactNo !== null && String(body.contactNo).trim() !== ""
        ? String(body.contactNo).trim()
        : null;
    const parentEmailRaw = body.parentEmail ?? body.parentMailID;
    const parentEmail =
      parentEmailRaw !== undefined && parentEmailRaw !== null && String(parentEmailRaw).trim() !== ""
        ? String(parentEmailRaw).trim()
        : null;
    const parentMobileRaw = body.parentMobile ?? body.parentMobileNo;
    const parentMobile =
      parentMobileRaw !== undefined && parentMobileRaw !== null && String(parentMobileRaw).trim() !== ""
        ? String(parentMobileRaw).trim()
        : null;

    // 1. Validate required fields
    if (!name || !email || !enrollmentNo) {
      return res.status(400).json({ error: "Name, email, and enrollment number are required." });
    }

    if (classGroupId !== null && Number.isNaN(classGroupId)) {
      return res.status(400).json({ error: "Invalid class group." });
    }

    // 2. Split the full name into first and last name
    const nameParts = name.split(/\s+/);
    const firstName = nameParts.shift() ?? "";
    const lastName = nameParts.join(" ");

    // 3. Create the User account and Student profile atomically
    const passwordHash = await bcrypt.hash("password123", 10);
    const newStudent = await prisma.$transaction(async (tx) => {
      if (classGroupId !== null) {
        const classGroup = await tx.classGroup.findUnique({
          where: { id: classGroupId },
        });
        if (!classGroup) {
          throw new Error("Invalid class group.");
        }
      }

      // Create the base User
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "STUDENT",
        },
      });

      // Create the linked Student profile using the exact Prisma schema fields.
      // There is no departmentId on Student; department is reached through
      // classGroup -> specialization -> department.
      return await tx.student.create({
        data: {
          userId: user.id,
          rollNumber: enrollmentNo,
          firstName,
          lastName,
          admissionYear: new Date().getFullYear(),
          ...(classGroupId !== null ? { classGroupId } : {}),
          rollNo,
          contactNo,
          parentEmail,
          parentMobile,
        },
      });
    });

    return res.status(201).json({ message: "Student created successfully!", studentId: newStudent.id });
  } catch (error) {
    console.error("Student Creation Failed:", error);
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === "P2002") {
      const target = prismaError.meta?.target;
      return res.status(400).json({
        error: `A record with this ${
          Array.isArray(target) ? target.join(", ") : "email or enrollment number"
        } already exists.`,
      });
    }
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to create student",
    });
  }
});

// ===============================
// UPDATE A STUDENT
// ===============================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);
    if (Number.isNaN(studentId)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }
    const { name, enrollmentNo, classGroupId, rollNo, contactNo, parentEmail, parentMobile } = req.body;

    if (!name || !enrollmentNo) {
      return res.status(400).json({ message: "Name and enrollment number are required" });
    }

    // Split the name
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Validate classGroupId if provided
    if (classGroupId) {
      const classGroup = await prisma.classGroup.findUnique({
        where: { id: Number(classGroupId) },
      });
      if (!classGroup) {
        return res.status(400).json({ message: "Invalid class group" });
      }
    }

    // Update the student profile (we skip email here to keep the login account safe)
    await prisma.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        rollNumber: enrollmentNo,
        classGroupId: classGroupId ? Number(classGroupId) : null,
        ...(rollNo !== undefined ? { rollNo } : {}),
        ...(contactNo !== undefined ? { contactNo } : {}),
        ...(parentEmail !== undefined ? { parentEmail } : {}),
        ...(parentMobile !== undefined ? { parentMobile } : {}),
      },
    });

    res.json({ message: "Student updated successfully!" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update student." });
  }
});

export default router;