import express, { Request, Response } from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

// ===============================
// ADD MARKS
// ===============================
router.post("/", async (req: Request, res: Response) => {
  try {
    const { studentId, examType, marksObtained, maxMarks } = req.body;

    if (!studentId || !examType || marksObtained === undefined || maxMarks === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedStudentId = parseInt(studentId);

    // 1. Get the student to find their department
    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId }
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Find or create a default "Academics" subject for MVP testing
    let subject = await prisma.subject.findFirst({
      where: { code: "GEN101" }
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          code: "GEN101",
          name: "General Academics",
          credits: 3,
          departmentId: student.departmentId
        }
      });
    }

    // 3. Find or create an enrollment for this student
    let enrollment = await prisma.enrollment.findFirst({
      where: { studentId: parsedStudentId, subjectId: subject.id }
    });

    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: {
          studentId: parsedStudentId,
          subjectId: subject.id,
          semester: 1,
          academicYear: new Date().getFullYear().toString()
        }
      });
    }

    // 4. Save the actual marks
    const mark = await prisma.mark.create({
      data: {
        enrollmentId: enrollment.id,
        examType: examType, // Must match the Prisma Enum (e.g., MIDTERM, ASSIGNMENT)
        marksObtained: parseFloat(marksObtained),
        maxMarks: parseFloat(maxMarks)
      }
    });

    res.status(201).json({ message: "Marks saved successfully!", mark });
  } catch (error) {
    console.error("Error saving marks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
