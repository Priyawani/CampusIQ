import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/stats", async (req: Request, res: Response) => {
  try {
    // 1. Get Total Students
    const totalStudents = await prisma.student.count();

    // 2. Calculate Average Attendance 
    const totalAttendanceRecords = await prisma.attendance.count();
    const presentRecords = await prisma.attendance.count({
      where: { status: "PRESENT" }
    });
    
    const attendancePercentage = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
      : 0;

    // 3. Calculate Average Academic Performance
    const marksAggregation = await prisma.mark.aggregate({
      _avg: {
        marksObtained: true,
      },
    });
    
    const averagePerformance = marksAggregation._avg.marksObtained 
      ? Math.round(marksAggregation._avg.marksObtained) 
      : 0;

    res.json({
      totalStudents,
      attendancePercentage: `${attendancePercentage}%`,
      averagePerformance: `${averagePerformance}%`,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: "Failed to calculate dashboard statistics" });
  }
});

export default router;