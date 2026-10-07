import express, { Request, Response } from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

// ===============================
// GET ALL SUBJECTS
// ===============================
router.get("/", async (req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: { department: true }
    });

    const formattedSubjects = subjects.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      credits: s.credits,
      department: s.department.code
    }));

    res.json(formattedSubjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// CREATE A SUBJECT
// ===============================
router.post("/", async (req: Request, res: Response) => {
  try {
    const { code, name, credits, department } = req.body;

    if (!code || !name || !credits || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the department, or create it if it doesn't exist
    let dept = await prisma.department.findUnique({ 
      where: { code: department } 
    });
    
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: department, code: department }
      });
    }

    // Create the Subject
    const subject = await prisma.subject.create({
      data: {
        code,
        name,
        credits: parseInt(credits),
        departmentId: dept.id
      }
    });

    res.status(201).json({ message: "Subject created successfully!", subject });
  } catch (error) {
    console.error("Creation error:", error);
    res.status(400).json({ message: "Failed to create subject. Code may already exist." });
  }
});

export default router;
