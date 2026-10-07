import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const router = express.Router();

// ===============================
// GET ALL STUDENTS (Formatted for the frontend)
// ===============================
router.get("/", async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: { 
        user: true, 
        department: true 
      }
    });

    // Translate database layout back into the simple frontend layout
    const formattedStudents = students.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      email: s.user.email,
      enrollmentNo: s.rollNumber,
      department: s.department.code
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// CREATE A STUDENT
// ===============================
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, enrollmentNo, department } = req.body;

    // 1. Validate required fields
    if (!name || !email || !enrollmentNo || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Split the full name into first and last name
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // 3. Find the department, or create it if it doesn't exist
    let dept = await prisma.department.findUnique({ 
      where: { code: department } 
    });
    
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: department, code: department }
      });
    }

    // 4. Create the User account for the student (Default password: password123)
    const passwordHash = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "STUDENT"
      }
    });

    // 5. Finally, create the Student profile
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        rollNumber: enrollmentNo,
        firstName,
        lastName,
        admissionYear: new Date().getFullYear(),
        departmentId: dept.id
      }
    });

    res.status(201).json({ message: "Student created successfully!" });

  } catch (error) {
    console.error("Creation error:", error);
    res.status(400).json({ message: "Failed to create student. Email or Roll No may already exist." });
  }
});

// ===============================
// UPDATE A STUDENT
// ===============================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.id);
    const { name, enrollmentNo, department } = req.body;

    if (!name || !enrollmentNo || !department) {
      return res.status(400).json({ message: "Name, enrollment number, and department are required" });
    }

    // Split the name
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Find or create department
    let dept = await prisma.department.findUnique({ where: { code: department } });
    if (!dept) {
      dept = await prisma.department.create({ data: { name: department, code: department } });
    }

    // Update the student profile (we skip email here to keep the login account safe)
    await prisma.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        rollNumber: enrollmentNo,
        departmentId: dept.id
      }
    });

    res.json({ message: "Student updated successfully!" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update student." });
  }
});

export default router;
