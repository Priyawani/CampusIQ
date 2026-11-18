import { Response } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE";

interface RiskRecord {
  attendance: { status: AttendanceStatusValue }[];
  marks: { marksObtained: number; maxMarks: number }[];
}

export interface ShapContribution {
  feature: string;
  impact: string;
  direction: "risk" | "safe";
  value: number;
}

interface ScatterRecord {
  studentId: number;
  studentName: string;
  enrollmentNo: string;
  className: string;
  classGroupId: number | null;
  year: number | null;
  specializationId: number | null;
  specialization: string | null;
  attendance: number;
  finalCaMarks: number;
  riskProbability: number;
  isAtRisk: boolean;
  is_at_risk: boolean;
  shapValues?: ShapContribution[];
}

interface SubjectFilterItem {
  id: number;
  name: string;
  code: string;
}

interface PredictionBody {
  filters: { subjects: SubjectFilterItem[] };
  summary: {
    studentsAnalyzed: number;
    atRiskCount: number;
    averageRiskProbability: number;
    totalAnalyzed?: number;
    atRisk?: number;
    avgRisk?: number;
  };
  charts: {
    bar: {
      subject: string;
      subjectCode: string;
      atRiskCount: number;
      totalStudents: number;
    }[];
    line: { timeline: string; averageRiskProbability: number }[];
    scatter: ScatterRecord[];
  };
  highRiskStudents: ScatterRecord[];
}

type PredictionResult = { status: number; body: PredictionBody | { message: string } };

function parseOptionalId(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function emptyPredictionResponse(
  subjects: SubjectFilterItem[] = []
): PredictionBody {
  return {
    filters: { subjects },
    summary: {
      studentsAnalyzed: 0,
      atRiskCount: 0,
      averageRiskProbability: 0,
      totalAnalyzed: 0,
      atRisk: 0,
      avgRisk: 0,
    },
    charts: { bar: [], line: [], scatter: [] },
    highRiskStudents: [],
  };
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

const EXAM_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "CA-1 Marks",
  MIDTERM: "Midterm Marks",
  END_SEMESTER: "Final Exam Marks",
  ASSIGNMENT: "Lab Submissions",
  QUIZ: "Quiz Scores",
};

interface ShapSource {
  attendance: number;
  finalCa: number;
  factors: string | null;
  attendanceRecords: { status: string; subjectCode: string }[];
  marks: {
    examType: string;
    marksObtained: number;
    maxMarks: number;
    subjectCode: string;
  }[];
}

function formatContribution(feature: string, value: number): ShapContribution {
  const rounded = Math.round(value * 100) / 100;
  return {
    feature,
    value: rounded,
    impact: `${rounded >= 0 ? "+" : ""}${rounded.toFixed(2)}`,
    direction: rounded >= 0 ? "risk" : "safe",
  };
}

function explainFromStoredFactors(factors: string | null): ShapContribution[] | null {
  if (!factors) return null;
  try {
    const parsed: unknown = JSON.parse(factors);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const numeric = parsed
      .map((item: unknown) => {
        if (typeof item !== "object" || item === null) return null;
        const entry = item as { feature?: unknown; impact?: unknown };
        const impact = Number(entry.impact);
        if (typeof entry.feature !== "string" || !Number.isFinite(impact)) return null;
        return formatContribution(entry.feature, -impact);
      })
      .filter((item): item is ShapContribution => item !== null);

    if (numeric.length === 0) return null;

    const largest = Math.max(...numeric.map((item) => Math.abs(item.value)), 0);
    if (largest === 0) return null;
    const scale = 0.42 / largest;
    return numeric
      .map((item) => formatContribution(item.feature, item.value * scale))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 5);
  } catch {
    return null;
  }
}

/**
 * Produces top SHAP-style feature contributions for an at-risk student.
 *
 * When the ML service has persisted numeric explanations in
 * `MLPrediction.factors` they are used directly (SHAP on the grade scale is
 * inverted so positive always means "increases risk"). Otherwise the same
 * live attendance/mark aggregates that feed the risk score are decomposed
 * into readable feature impacts, so the explainability view always has data.
 */
export function buildShapValues(source: ShapSource): ShapContribution[] {
  const stored = explainFromStoredFactors(source.factors);
  if (stored) return stored;

  const candidates: ShapContribution[] = [];

  if (source.attendance < 75) {
    candidates.push(
      formatContribution(
        `Attendance (${round(source.attendance)}%)`,
        clamp(0.08 + ((75 - source.attendance) / 75) * 0.45, 0.08, 0.5)
      )
    );
  } else {
    candidates.push(
      formatContribution(
        `Attendance (${round(source.attendance)}%)`,
        -clamp(0.03 + ((source.attendance - 75) / 25) * 0.12, 0.03, 0.15)
      )
    );
  }

  if (source.finalCa < 40) {
    candidates.push(
      formatContribution(
        `Aggregate CA (${round(source.finalCa)}%)`,
        clamp(0.06 + ((40 - source.finalCa) / 40) * 0.4, 0.06, 0.46)
      )
    );
  } else {
    candidates.push(
      formatContribution(
        `Aggregate CA (${round(source.finalCa)}%)`,
        -clamp(0.02 + ((source.finalCa - 40) / 60) * 0.12, 0.02, 0.14)
      )
    );
  }

  const examGroups = new Map<
    string,
    { obtained: number; max: number; count: number; sample: string }
  >();
  for (const mark of source.marks) {
    if (mark.maxMarks <= 0) continue;
    const entry = examGroups.get(mark.examType) ?? {
      obtained: 0,
      max: 0,
      count: 0,
      sample: `${Math.round(mark.marksObtained)}/${Math.round(mark.maxMarks)}`,
    };
    entry.obtained += mark.marksObtained;
    entry.max += mark.maxMarks;
    entry.count += 1;
    examGroups.set(mark.examType, entry);
  }

  const examRisks = Array.from(examGroups.entries())
    .map(([examType, entry]) => ({
      label: EXAM_TYPE_LABELS[examType] ?? examType,
      percentage: (entry.obtained / entry.max) * 100,
      sample: entry.sample,
    }))
    .sort((a, b) => a.percentage - b.percentage);

  examRisks.slice(0, 2).forEach((exam, index) => {
    const isLow = exam.percentage < 75;
    const magnitude = isLow
      ? clamp((100 - exam.percentage) / 100 * (index === 0 ? 0.24 : 0.14), 0.04, 0.24)
      : -clamp((exam.percentage - 75) / 25 * 0.08, 0.02, 0.08);
    candidates.push(
      formatContribution(`${exam.label} (${exam.sample})`, isLow ? magnitude : -Math.abs(magnitude))
    );
  });

  const subjectAttendance = new Map<string, { total: number; attended: number }>();
  for (const record of source.attendanceRecords) {
    const subjectCode = record.subjectCode || "GEN";
    const entry = subjectAttendance.get(subjectCode) ?? { total: 0, attended: 0 };
    entry.total += 1;
    if (record.status !== "ABSENT") entry.attended += 1;
    subjectAttendance.set(subjectCode, entry);
  }
  const weakestSubject = Array.from(subjectAttendance.entries())
    .filter(([, entry]) => entry.total > 0)
    .map(([subjectCode, entry]) => ({
      subjectCode,
      percentage: (entry.attended / entry.total) * 100,
    }))
    .sort((a, b) => a.percentage - b.percentage)[0];

  if (weakestSubject) {
    candidates.push(
      formatContribution(
        `Subject Attendance ${weakestSubject.subjectCode} (${round(weakestSubject.percentage)}%)`,
        weakestSubject.percentage < 75
          ? clamp((75 - weakestSubject.percentage) / 75 * 0.2, 0.03, 0.2)
          : -0.05
      )
    );
  }

  if (source.factors?.trim()) {
    candidates.push(formatContribution("Historical risk signals", 0.06));
  }

  const sorted = candidates
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 5);

  if (sorted.length < 3) {
    sorted.push(formatContribution("Assessment submission consistency", -0.04));
    sorted.push(formatContribution("Class participation signals", -0.03));
  }

  return sorted.slice(0, 5);
}

async function buildPredictionsResponse(req: AuthRequest): Promise<PredictionResult> {
  const classGroupId = parseOptionalId(req.query.classGroupId);
  const subjectId = parseOptionalId(req.query.subjectId);

  if (classGroupId === null || subjectId === null) {
    return { status: 400, body: { message: "Invalid classGroupId or subjectId" } };
  }

  const role = req.user?.role;
  const userId = req.user?.userId;
  const departmentId = req.user?.departmentId ?? null;

  let studentWhere: Prisma.StudentWhereInput = {};
  let subjectWhere: Prisma.SubjectWhereInput = {};

  if (role === "SUPERADMIN") {
    if (classGroupId !== undefined) {
      studentWhere = { classGroupId };
      subjectWhere = { classGroups: { some: { id: classGroupId } } };
    }
  } else if (role === "DEPT_ADMIN") {
    if (departmentId == null) {
      return { status: 403, body: { message: "Department context required" } };
    }
    if (classGroupId !== undefined) {
      const allowed = await prisma.classGroup.findFirst({
        where: { id: classGroupId, departmentId },
        select: { id: true },
      });
      if (!allowed) {
        return { status: 403, body: { message: "Forbidden" } };
      }
      studentWhere = { classGroupId };
      subjectWhere = { classGroups: { some: { id: classGroupId } } };
    } else {
      studentWhere = {
        OR: [{ departmentId }, { classGroup: { departmentId } }],
      };
      subjectWhere = { classGroups: { some: { departmentId } } };
    }
  } else if (role === "FACULTY") {
    if (!userId) {
      return { status: 401, body: { message: "Unauthorized" } };
    }
    if (classGroupId !== undefined) {
      const allowed = await prisma.classGroup.findFirst({
        where: { id: classGroupId, faculties: { some: { id: userId } } },
        select: { id: true },
      });
      if (!allowed) {
        return { status: 403, body: { message: "Forbidden" } };
      }
      studentWhere = { classGroupId };
      subjectWhere = { classGroups: { some: { id: classGroupId } } };
    } else {
      studentWhere = { classGroup: { faculties: { some: { id: userId } } } };
      subjectWhere = { classGroups: { some: { faculties: { some: { id: userId } } } } };
    }
  } else {
    return { status: 403, body: { message: "Forbidden" } };
  }

  if (subjectId !== undefined) {
    subjectWhere = { ...subjectWhere, id: subjectId };
  }

  const enrollmentWhere: Prisma.EnrollmentWhereInput | undefined =
    subjectId !== undefined ? { subjectId } : undefined;

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      user: { select: { name: true } },
      classGroup: {
        select: {
          id: true,
          name: true,
          year: true,
          specialization: { select: { id: true, name: true } },
        },
      },
      mlPrediction: {
        select: {
          riskScore: true,
          isAtRisk: true,
          lastCalculated: true,
          factors: true,
        },
      },
      enrollments: {
        where: enrollmentWhere,
        include: {
          subject: { select: { id: true, name: true, code: true } },
          attendance: { select: { status: true, date: true } },
          marks: { select: { marksObtained: true, maxMarks: true, examType: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const subjects = await prisma.subject.findMany({
    where: subjectWhere,
    select: { id: true, name: true, code: true },
    orderBy: { code: "asc" },
  });

  if (students.length === 0) {
    return { status: 200, body: emptyPredictionResponse(subjects) };
  }

  const subjectRisks = new Map<
    number,
    { subject: { id: number; name: string; code: string }; atRiskCount: number; total: number }
  >();
  const timeline = new Map<string, { total: number; count: number }>();
  const scatter: ScatterRecord[] = [];

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

    const record: ScatterRecord = {
      studentId: student.id,
      studentName,
      enrollmentNo: student.rollNumber,
      className: student.classGroup?.name ?? "",
      classGroupId: student.classGroup?.id ?? null,
      year: student.classGroup?.year ?? null,
      specializationId: student.classGroup?.specialization?.id ?? null,
      specialization: student.classGroup?.specialization?.name ?? null,
      attendance: round(overall.attendance),
      finalCaMarks: round(overall.finalCa),
      riskProbability: overall.riskProbability,
      isAtRisk: overall.isAtRisk,
      is_at_risk: overall.isAtRisk,
    };

    if (overall.isAtRisk) {
      record.shapValues = buildShapValues({
        attendance: overall.attendance,
        finalCa: overall.finalCa,
        factors: student.mlPrediction?.factors ?? null,
        attendanceRecords: student.enrollments.flatMap((enrollment) =>
          enrollment.attendance.map((attendance) => ({
            status: attendance.status,
            subjectCode: enrollment.subject.code,
          }))
        ),
        marks: student.enrollments.flatMap((enrollment) =>
          enrollment.marks.map((mark) => ({
            examType: mark.examType,
            marksObtained: mark.marksObtained,
            maxMarks: mark.maxMarks,
            subjectCode: enrollment.subject.code,
          }))
        ),
      });
    }

    scatter.push(record);

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

      for (const attendanceRecord of enrollment.attendance) {
        const period = attendanceRecord.date.toISOString().slice(0, 7);
        const point = timeline.get(period) ?? { total: 0, count: 0 };
        point.total += risk.riskProbability;
        point.count += 1;
        timeline.set(period, point);
      }
    }
  }

  if (analyzedCount === 0) {
    return { status: 200, body: emptyPredictionResponse(subjects) };
  }

  const averageRiskProbability = round(totalRisk / analyzedCount);

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

  return {
    status: 200,
    body: {
      filters: { subjects },
      summary: {
        studentsAnalyzed: analyzedCount,
        atRiskCount,
        averageRiskProbability,
      },
      charts: { bar, line, scatter },
      highRiskStudents: scatter.filter((student) => student.isAtRisk),
    },
  };
}

export async function getPredictions(req: AuthRequest, res: Response) {
  try {
    const { status, body } = await buildPredictionsResponse(req);
    return res.status(status).json(body);
  } catch (error) {
    console.error("Analytics prediction error:", error);
    return res.status(200).json(emptyPredictionResponse());
  }
}

/** GET /api/analytics/high-risk-shap — at-risk roster with feature attributions. */
export async function getHighRiskShap(req: AuthRequest, res: Response) {
  try {
    const { status, body } = await buildPredictionsResponse(req);
    if (status !== 200 || !("charts" in body)) {
      return res.status(status).json(body);
    }
    return res.status(200).json({
      filters: body.filters,
      summary: body.summary,
      highRiskStudents: body.highRiskStudents,
      students: body.highRiskStudents,
    });
  } catch (error) {
    console.error("Analytics high-risk SHAP error:", error);
    return res.status(200).json({
      filters: { subjects: [] },
      summary: { studentsAnalyzed: 0, atRiskCount: 0, averageRiskProbability: 0 },
      highRiskStudents: [],
      students: [],
    });
  }
}
