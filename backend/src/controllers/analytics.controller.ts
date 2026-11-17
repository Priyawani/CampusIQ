import { Request, Response } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE";

interface RiskRecord {
  attendance: { status: AttendanceStatusValue }[];
  marks: { marksObtained: number; maxMarks: number }[];
}

function parseOptionalId(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function computeRisk(record: RiskRecord) {
  const totalClasses = record.attendance.length;
  const attended = record.attendance.filter((item) => item.status !== "ABSENT").length;
  const attendance = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;

  const maxMarks = record.marks.reduce((sum, mark) => sum + mark.maxMarks, 0);
  const obtained = record.marks.reduce((sum, mark) => sum + mark.marksObtained, 0);
  const finalCa = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;

  const riskProbability = round(
    Math.min(100, Math.max(0, (100 - attendance) * 0.55 + (100 - finalCa) * 0.45))
  );

  return {
    attendance,
    finalCa,
    riskProbability,
    isAtRisk: attendance < 75 || finalCa < 40,
  };
}

export async function getPredictions(req: AuthRequest, res: Response) {
  try {
    const classGroupId = parseOptionalId(req.query.classGroupId);
    const subjectId = parseOptionalId(req.query.subjectId);

    if (classGroupId === null || subjectId === null) {
      return res.status(400).json({ message: "Invalid classGroupId or subjectId" });
    }

    const isFaculty = req.user?.role === "FACULTY";
    const assignedClasses = req.user?.assignedClasses ?? [];

    if (isFaculty && classGroupId !== undefined && !assignedClasses.includes(classGroupId)) {
      return res.status(403).json({ message: "Class is not assigned to this faculty member" });
    }

    const studentWhere: Prisma.StudentWhereInput = {};
    if (isFaculty) {
      studentWhere.classGroupId = {
        in: classGroupId !== undefined ? [classGroupId] : assignedClasses,
      };
    } else if (classGroupId !== undefined) {
      studentWhere.classGroupId = classGroupId;
    }

    const enrollmentWhere: Prisma.EnrollmentWhereInput | undefined =
      subjectId !== undefined ? { subjectId } : undefined;

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        user: { select: { name: true } },
        classGroup: { select: { id: true, name: true } },
        mlPrediction: {
          select: { riskScore: true, isAtRisk: true, lastCalculated: true },
        },
        enrollments: {
          where: enrollmentWhere,
          include: {
            subject: { select: { id: true, name: true, code: true } },
            attendance: { select: { status: true, date: true } },
            marks: { select: { marksObtained: true, maxMarks: true } },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const subjectWhere: Prisma.SubjectWhereInput = {};
    if (classGroupId !== undefined) {
      subjectWhere.classGroups = { some: { id: classGroupId } };
    } else if (isFaculty) {
      subjectWhere.classGroups = { some: { id: { in: assignedClasses } } };
    }
    if (subjectId !== undefined) {
      subjectWhere.id = subjectId;
    }

    const subjects = await prisma.subject.findMany({
      where: subjectWhere,
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    });

    const subjectRisks = new Map<
      number,
      { subject: { id: number; name: string; code: string }; atRiskCount: number; total: number }
    >();
    const timeline = new Map<string, { total: number; count: number }>();
    const scatter: {
      studentId: number;
      studentName: string;
      className: string;
      attendance: number;
      finalCaMarks: number;
      riskProbability: number;
      isAtRisk: boolean;
    }[] = [];

    let analyzedCount = 0;
    let atRiskCount = 0;
    let totalRisk = 0;

    for (const student of students) {
      if (subjectId !== undefined && student.enrollments.length === 0) continue;

      const allAttendance = student.enrollments.flatMap((enrollment) => enrollment.attendance);
      const allMarks = student.enrollments.flatMap((enrollment) => enrollment.marks);
      const rawRisk = computeRisk({ attendance: allAttendance, marks: allMarks });
      const overall = student.mlPrediction
        ? {
            ...rawRisk,
            riskProbability: round(student.mlPrediction.riskScore * 100),
            isAtRisk: student.mlPrediction.isAtRisk,
          }
        : rawRisk;
      const studentName =
        student.user.name?.trim() || `${student.firstName} ${student.lastName}`.trim();

      analyzedCount += 1;
      if (overall.isAtRisk) atRiskCount += 1;
      totalRisk += overall.riskProbability;

      scatter.push({
        studentId: student.id,
        studentName,
        className: student.classGroup?.name ?? "",
        attendance: round(overall.attendance),
        finalCaMarks: round(overall.finalCa),
        riskProbability: overall.riskProbability,
        isAtRisk: overall.isAtRisk,
      });

      for (const enrollment of student.enrollments) {
        const risk = computeRisk(enrollment);
        const entry = subjectRisks.get(enrollment.subject.id) ?? {
          subject: enrollment.subject,
          atRiskCount: 0,
          total: 0,
        };
        entry.total += 1;
        if (risk.isAtRisk) entry.atRiskCount += 1;
        subjectRisks.set(enrollment.subject.id, entry);

        for (const record of enrollment.attendance) {
          const period = record.date.toISOString().slice(0, 7);
          const point = timeline.get(period) ?? { total: 0, count: 0 };
          point.total += risk.riskProbability;
          point.count += 1;
          timeline.set(period, point);
        }
      }
    }

    const averageRiskProbability = analyzedCount > 0 ? round(totalRisk / analyzedCount) : 0;

    const bar = Array.from(subjectRisks.values())
      .map((entry) => ({
        subject: entry.subject.name,
        subjectCode: entry.subject.code,
        atRiskCount: entry.atRiskCount,
        totalStudents: entry.total,
      }))
      .sort((a, b) => b.atRiskCount - a.atRiskCount);

    const line = timeline.size
      ? Array.from(timeline.entries())
          .map(([period, point]) => ({
            timeline: period,
            averageRiskProbability: round(point.total / point.count),
          }))
          .sort((a, b) => a.timeline.localeCompare(b.timeline))
      : [{ timeline: "Current", averageRiskProbability }];

    return res.json({
      filters: { subjects },
      summary: {
        studentsAnalyzed: analyzedCount,
        atRiskCount,
        averageRiskProbability,
      },
      charts: { bar, line, scatter },
    });
  } catch (error) {
    console.error("Analytics prediction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
