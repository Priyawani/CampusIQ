import express, { Request, Response } from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

// ===============================
// MARK ATTENDANCE
// ===============================
router.post("/", async (req: Request, res: Response) => {
  try {
    const { studentId, date, status } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedStudentId = parseInt(studentId);
    // Convert the "YYYY-MM-DD" string from the frontend into a real Date object
    const attendanceDate = new Date(date);

    // 1. Get the student to find their department
    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId }
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Find or create a default "General" subject for daily attendance
    let subject = await prisma.subject.findFirst({
      where: { code: "ATT101" }
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          code: "ATT101",
          name: "General Attendance",
          credits: 0,
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

    // 4. Create or update (Upsert) the attendance record
    // We use "upsert" so that if you accidentally click "Absent", you can just click "Present" to overwrite it!
    await prisma.attendance.upsert({
      where: {
        enrollmentId_date: {
          enrollmentId: enrollment.id,
          date: attendanceDate
        }
      },
      update: {
        status: status
      },
      create: {
        enrollmentId: enrollment.id,
        date: attendanceDate,
        status: status
      }
    });

    res.status(200).json({ message: `Student marked ${status} successfully!` });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
