import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { sendParentEmail } from "../utils/mailer.js";

// ============================================================================
// CampusIQ Academic Engine — Subjects, Marks & Attendance
//
// Data model notes:
// - `Subject` carries (id, code, name, credits) plus its department.
// - `Attendance` / `Mark` rows hang off the `Enrollment` junction, which is
//   what links them to a `Student` (User with role STUDENT) and — for marks
//   and attendance — to a `Subject`. So a "studentId" in the API contract is
//   resolved to that student's enrollment(s) internally.
// - `Mark` stores the score as the (marksObtained, maxMarks) pair. The API
//   also accepts a plain `score` field (maxMarks defaults to 100).
// ============================================================================

const WRITE_ROLES = ["ADMIN", "FACULTY"];

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE"] as const;
type AttendanceStatusInput = (typeof ATTENDANCE_STATUSES)[number];

const EXAM_TYPES = ["INTERNAL", "MIDTERM", "END_SEMESTER", "ASSIGNMENT", "QUIZ"] as const;
type ExamTypeInput = (typeof EXAM_TYPES)[number];

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Extract an optional `className` (batch) filter from the query string.
 * Returns undefined when absent/blank so callers can spread it into a
 * Prisma `where` clause only when filtering was requested.
 */
function parseClassName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Resolve the Student profile id that belongs to the authenticated user.
 * Returns null when the user has no student profile (staff accounts).
 */
async function getOwnStudentId(userId: number): Promise<number | null> {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  return student?.id ?? null;
}

/**
 * Read guard: ADMIN/FACULTY may read any student's records, while a STUDENT
 * may only read their own. Returns true when the request is allowed.
 */
async function canReadStudentRecord(req: AuthRequest, studentId: number): Promise<boolean> {
  if (!req.user) return false;
  if (WRITE_ROLES.includes(req.user.role) || req.user.role === "ADMIN") return true;
  if (req.user.role === "STUDENT") {
    const ownId = await getOwnStudentId(req.user.userId);
    return ownId === studentId;
  }
  return false;
}

/** Find-or-create the enrollment that ties a student to a subject. */
async function resolveEnrollment(studentId: number, subjectId: number) {
  let enrollment = await prisma.enrollment.findFirst({
    where: { studentId, subjectId },
  });

  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        subjectId,
        semester: 1,
        academicYear: new Date().getFullYear().toString(),
      },
    });
  }

  return enrollment;
}

// ===============================
// SUBJECTS
// ===============================

/** GET /subjects — any authenticated user. */
export async function listSubjects(_req: Request, res: Response) {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        department: true,
        classGroups: { select: { id: true } },
      },
      orderBy: { code: "asc" },
    });

    res.json(
      subjects.map((s) => ({
        id: s.id,
        code: s.code,
        abbreviation: s.abbreviation,
        name: s.name,
        credits: s.credits,
        year: s.year,
        department: s.department.code,
        specializationId: s.specializationId,
        classGroupIds: s.classGroups.map((classGroup) => classGroup.id),
      }))
    );
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** GET /subjects/:id — any authenticated user. */
export async function getSubjectById(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({
      id: subject.id,
      code: subject.code,
      abbreviation: subject.abbreviation,
      name: subject.name,
      credits: subject.credits,
      department: subject.department.code,
    });
  } catch (error) {
    console.error("Error fetching subject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /subjects — ADMIN / FACULTY only (enforced in the router).
 *
 * Accepts the curriculum payload `{ courseCode, abbreviation, name, credits }`
 * as well as the legacy `{ code, name, credits, department }` shape.
 * `department` is optional and falls back to a "General" (GEN) department.
 */
export async function createSubject(req: Request, res: Response) {
  try {
    const { code, courseCode, abbreviation, name, credits, department } = req.body;
    const subjectCode = courseCode ?? code;

    if (!subjectCode || !name || credits === undefined) {
      return res.status(400).json({ message: "courseCode, name and credits are required" });
    }

    const parsedCredits = parseInt(credits, 10);
    if (Number.isNaN(parsedCredits) || parsedCredits < 0) {
      return res.status(400).json({ message: "Credits must be a valid number" });
    }

    // Find the department, or create it if it doesn't exist. Default to a
    // "General" department when the caller uses the curriculum payload.
    const departmentCode = department ?? "GEN";
    const departmentName = department ?? "General";
    let dept = await prisma.department.findUnique({ where: { code: departmentCode } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: departmentName, code: departmentCode },
      });
    }

    const subject = await prisma.subject.create({
      data: {
        code: subjectCode,
        abbreviation: abbreviation ?? null,
        name,
        credits: parsedCredits,
        departmentId: dept.id,
      },
    });

    res.status(201).json({ message: "Subject created successfully!", subject });
  } catch (error) {
    console.error("Creation error:", error);
    res.status(400).json({ message: "Failed to create subject. Code may already exist." });
  }
}

/** PUT /subjects/:id — ADMIN / FACULTY only (enforced in the router). */
export async function updateSubject(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const { code, courseCode, abbreviation, name, credits, department } = req.body;

    let departmentId: number | undefined;
    if (department) {
      let dept = await prisma.department.findUnique({ where: { code: department } });
      if (!dept) {
        dept = await prisma.department.create({
          data: { name: department, code: department },
        });
      }
      departmentId = dept.id;
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(courseCode ?? code ? { code: (courseCode ?? code) as string } : {}),
        ...(abbreviation !== undefined ? { abbreviation } : {}),
        ...(name ? { name } : {}),
        ...(credits !== undefined ? { credits: parseInt(credits, 10) } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
      },
    });

    res.json({ message: "Subject updated successfully!", subject });
  } catch (error) {
    console.error("Update error:", error);
    res.status(400).json({ message: "Failed to update subject." });
  }
}

/** DELETE /subjects/:id — ADMIN / FACULTY only (enforced in the router). */
export async function deleteSubject(req: Request, res: Response) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    await prisma.subject.delete({ where: { id } });
    res.json({ message: "Subject deleted successfully!" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(400).json({ message: "Failed to delete subject." });
  }
}

// ===============================
// MARKS
// ===============================

/**
 * GET /marks/student/:id — staff may read any student; students may read
 * only their own record.
 */
export async function getMarksByStudent(req: AuthRequest, res: Response) {
  try {
    const studentId = parseId(req.params.id);
    if (studentId === null) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    if (!(await canReadStudentRecord(req, studentId))) {
      return res.status(403).json({ message: "You do not have permission to access this resource" });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        subject: true,
        marks: { orderBy: { id: "asc" } },
      },
    });

    const marks = enrollments.flatMap((enrollment) =>
      enrollment.marks.map((mark) => ({
        id: mark.id,
        studentId,
        subjectId: enrollment.subjectId,
        subjectCode: enrollment.subject.code,
        subjectName: enrollment.subject.name,
        examType: mark.examType,
        score: mark.marksObtained,
        marksObtained: mark.marksObtained,
        maxMarks: mark.maxMarks,
      }))
    );

    res.json(marks);
  } catch (error) {
    console.error("Error fetching marks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /marks/subject/:id — staff may read any subject; students may read it
 * too (aggregate only, no per-student PII).
 *
 * Returns per-examType average performance for BI visualizations:
 *   [{ examType, label, averageScore, count }]
 * where averageScore is the mean percentage (marksObtained / maxMarks * 100)
 * rounded to 1 decimal, ordered by the canonical EXAM_TYPES order.
 */
export async function getMarksBySubject(req: Request, res: Response) {
  try {
    const subjectId = parseId(req.params.id);
    if (subjectId === null) {
      return res.status(400).json({ message: "Invalid subject ID" });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Optional multi-class/batch filter: ?className=TY-B
    const className = parseClassName(req.query.className);

    const marks = await prisma.mark.findMany({
      where: {
        enrollment: {
          subjectId,
          ...(className !== undefined ? { student: { className } } : {}),
        },
      },
      select: { examType: true, marksObtained: true, maxMarks: true },
    });

    const EXAM_TYPE_LABELS: Record<string, string> = {
      INTERNAL: "Internal",
      MIDTERM: "Mid Term",
      END_SEMESTER: "Final",
      ASSIGNMENT: "Assignment",
      QUIZ: "Quiz",
    };

    const analytics = EXAM_TYPES.map((examType) => {
      const group = marks.filter((m) => m.examType === examType);
      if (group.length === 0) {
        return {
          examType,
          label: EXAM_TYPE_LABELS[examType] ?? examType,
          averageScore: 0,
          count: 0,
        };
      }
      const totalPct = group.reduce((sum, m) => {
        if (!m.maxMarks || m.maxMarks <= 0) return sum;
        return sum + (m.marksObtained / m.maxMarks) * 100;
      }, 0);
      return {
        examType,
        label: EXAM_TYPE_LABELS[examType] ?? examType,
        averageScore: Math.round((totalPct / group.length) * 10) / 10,
        count: group.length,
      };
    });

    res.json({
      subjectId,
      subjectCode: subject.code,
      subjectName: subject.name,
      ...(className !== undefined ? { className } : {}),
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching subject marks analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /marks — ADMIN / FACULTY only (enforced in the router). */
export async function createMark(req: Request, res: Response) {
  try {
    const { studentId, subjectId, subjectCode, examType, score, marksObtained, maxMarks } = req.body;

    const parsedStudentId = parseId(studentId);
    if (parsedStudentId === null || !examType) {
      return res.status(400).json({ message: "studentId and examType are required" });
    }

    if (!EXAM_TYPES.includes(examType as ExamTypeInput)) {
      return res
        .status(400)
        .json({ message: `Invalid examType. Must be one of: ${EXAM_TYPES.join(", ")}` });
    }

    // Accept either `score` or the explicit (marksObtained, maxMarks) pair.
    const obtained = marksObtained !== undefined ? parseFloat(marksObtained) : parseFloat(score);
    const maximum = maxMarks !== undefined ? parseFloat(maxMarks) : 100;

    if (Number.isNaN(obtained) || Number.isNaN(maximum)) {
      return res.status(400).json({ message: "A valid score (or marksObtained/maxMarks) is required" });
    }

    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId },
      include: { classGroup: true },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const departmentId = student.classGroup?.departmentId ?? student.departmentId;

    // Resolve the subject: explicit id/code win, otherwise fall back to the
    // default "General Academics" subject in the student's department.
    let subject = null;
    if (subjectId !== undefined) {
      const parsedSubjectId = parseId(subjectId);
      if (parsedSubjectId === null) {
        return res.status(400).json({ message: "Invalid subjectId" });
      }
      subject = await prisma.subject.findUnique({ where: { id: parsedSubjectId } });
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
    } else if (subjectCode) {
      subject = await prisma.subject.findFirst({ where: { code: subjectCode } });
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
    } else {
      subject = await prisma.subject.findFirst({ where: { code: "GEN101" } });
      if (!subject && departmentId) {
        subject = await prisma.subject.create({
          data: {
            code: "GEN101",
            name: "General Academics",
            credits: 3,
            departmentId,
          },
        });
      }
    }
    if (!subject) {
      return res.status(400).json({ message: "Unable to resolve a subject for this student" });
    }

    const enrollment = await resolveEnrollment(parsedStudentId, subject.id);

    const mark = await prisma.mark.create({
      data: {
        enrollmentId: enrollment.id,
        examType: examType as ExamTypeInput,
        marksObtained: obtained,
        maxMarks: maximum,
      },
    });

    res.status(201).json({ message: "Marks saved successfully!", mark });
  } catch (error) {
    console.error("Error saving marks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /marks/batch — ADMIN / FACULTY only (enforced in the router).
 *
 * Batch grading for Faculty. Accepts:
 *   { subjectId: "string", examType: "string", records: [{ studentId: "string", score: number, maxMarks: number }] }
 *
 * All inserts/upserts run inside a single `prisma.$transaction` so the batch
 * is atomic. Re-submitting the same (enrollment, examType) overwrites the
 * prior score rather than creating duplicates.
 */
export async function createBatchMarks(req: Request, res: Response) {
  try {
    const { subjectId, examType, records } = req.body;

    if (subjectId === undefined || !examType || !Array.isArray(records)) {
      return res
        .status(400)
        .json({ message: "subjectId, examType and records array are required" });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: "records must contain at least one entry" });
    }

    const parsedSubjectId = parseId(subjectId);
    if (parsedSubjectId === null) {
      return res.status(400).json({ message: "Invalid subjectId" });
    }

    if (!EXAM_TYPES.includes(examType as ExamTypeInput)) {
      return res
        .status(400)
        .json({ message: `Invalid examType. Must be one of: ${EXAM_TYPES.join(", ")}` });
    }

    const subject = await prisma.subject.findUnique({ where: { id: parsedSubjectId } });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Validate every record up front so the transaction never partially runs
    // on bad input.
    const parsedRecords: { studentId: number; score: number; maxMarks: number }[] = [];
    for (let i = 0; i < records.length; i++) {
      const entry = records[i];
      const parsedStudentId = parseId(entry?.studentId);
      if (parsedStudentId === null) {
        return res
          .status(400)
          .json({ message: `records[${i}].studentId must be a valid id` });
      }
      const score = Number(entry?.score ?? entry?.marksObtained);
      const maxMarks = entry?.maxMarks !== undefined ? Number(entry.maxMarks) : 100;
      if (!Number.isFinite(score) || !Number.isFinite(maxMarks)) {
        return res.status(400).json({
          message: `records[${i}] must include a valid numeric score and maxMarks`,
        });
      }
      if (score < 0 || maxMarks <= 0 || score > maxMarks) {
        return res.status(400).json({
          message: `records[${i}].score must be between 0 and maxMarks`,
        });
      }
      parsedRecords.push({ studentId: parsedStudentId, score, maxMarks });
    }

    // Fail fast if any student does not exist.
    const studentIds = [...new Set(parsedRecords.map((r) => r.studentId))];
    const existingStudents = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingStudents.map((s) => s.id));
    const missingIds = studentIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return res
        .status(404)
        .json({ message: `Student(s) not found: ${missingIds.join(", ")}` });
    }

    const academicYear = new Date().getFullYear().toString();

    const results = await prisma.$transaction(async (tx) => {
      const outcomes = [];
      for (const record of parsedRecords) {
        let enrollment = await tx.enrollment.findFirst({
          where: { studentId: record.studentId, subjectId: parsedSubjectId },
        });
        if (!enrollment) {
          enrollment = await tx.enrollment.create({
            data: {
              studentId: record.studentId,
              subjectId: parsedSubjectId,
              semester: 1,
              academicYear,
            },
          });
        }

        // No unique constraint on (enrollmentId, examType), so find-then-write
        // inside the transaction to avoid duplicates on re-submission.
        const existing = await tx.mark.findFirst({
          where: { enrollmentId: enrollment.id, examType: examType as ExamTypeInput },
        });
        const mark = existing
          ? await tx.mark.update({
              where: { id: existing.id },
              data: { marksObtained: record.score, maxMarks: record.maxMarks },
            })
          : await tx.mark.create({
              data: {
                enrollmentId: enrollment.id,
                examType: examType as ExamTypeInput,
                marksObtained: record.score,
                maxMarks: record.maxMarks,
              },
            });
        outcomes.push(mark);
      }
      return outcomes;
    });

    res.status(200).json({
      message: `Batch marks saved for ${results.length} student(s) successfully!`,
      count: results.length,
      subjectId: parsedSubjectId,
      examType,
    });
  } catch (error) {
    console.error("Error saving batch marks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ===============================
// ATTENDANCE
// ===============================

/**
 * GET /attendance/student/:id — staff may read any student; students may
 * read only their own record.
 */
export async function getAttendanceByStudent(req: AuthRequest, res: Response) {
  try {
    const studentId = parseId(req.params.id);
    if (studentId === null) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    if (!(await canReadStudentRecord(req, studentId))) {
      return res.status(403).json({ message: "You do not have permission to access this resource" });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        subject: true,
        attendance: { orderBy: { date: "asc" } },
      },
    });

    const records = enrollments.flatMap((enrollment) =>
      enrollment.attendance.map((entry) => ({
        id: entry.id,
        studentId,
        subjectId: enrollment.subjectId,
        subjectCode: enrollment.subject.code,
        date: entry.date,
        status: entry.status,
      }))
    );

    const present = records.filter((r) => r.status === "PRESENT").length;
    const late = records.filter((r) => r.status === "LATE").length;

    res.json({
      records,
      summary: {
        total: records.length,
        present,
        absent: records.filter((r) => r.status === "ABSENT").length,
        late,
        attendancePercentage:
          records.length > 0 ? Math.round(((present + late) / records.length) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /attendance/monthly-report?subjectId=:id&month=YYYY-MM[&className=:name]
 * Staff only (enforced in the router).
 *
 * Aggregates all attendance records for a subject within a calendar month,
 * grouped by student:
 *   [{ studentId, enrollmentNo, name, totalClasses, present, absent,
 *      attendancePercentage }]
 * where attendancePercentage = ((present / total) * 100).toFixed(2).
 * Students enrolled in the subject but with no records that month are
 * included with zero counts.
 */
export async function getMonthlyAttendanceReport(req: Request, res: Response) {
  try {
    const subjectId = parseId(req.query.subjectId);
    if (subjectId === null) {
      return res.status(400).json({ message: "A valid subjectId query parameter is required" });
    }

    const month = typeof req.query.month === "string" ? req.query.month : "";
    const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!monthMatch) {
      return res
        .status(400)
        .json({ message: "A valid month query parameter is required (YYYY-MM)" });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const year = Number(monthMatch[1]);
    const monthIndex = Number(monthMatch[2]) - 1;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 1);

    // Optional multi-class/batch filter: ?className=TY-B
    const className = parseClassName(req.query.className);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        subjectId,
        ...(className !== undefined ? { student: { className } } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, rollNumber: true } },
        attendance: {
          where: { date: { gte: monthStart, lt: monthEnd } },
          select: { status: true },
        },
      },
      orderBy: { student: { rollNumber: "asc" } },
    });

    const report = enrollments.map((enrollment) => {
      const totalClasses = enrollment.attendance.length;
      const present = enrollment.attendance.filter(
        (entry) => entry.status === "PRESENT" || entry.status === "LATE"
      ).length;
      const absent = enrollment.attendance.filter(
        (entry) => entry.status === "ABSENT"
      ).length;
      return {
        studentId: enrollment.student.id,
        enrollmentNo: enrollment.student.rollNumber,
        name: `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim(),
        totalClasses,
        present,
        absent,
        attendancePercentage:
          totalClasses > 0 ? ((present / totalClasses) * 100).toFixed(2) : "0.00",
      };
    });

    res.json(report);
  } catch (error) {
    console.error("Error building monthly attendance report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /attendance/batch — ADMIN / FACULTY only (enforced in the router).
 *
 * Batch attendance logging for Faculty. Accepts:
 *   { date: "YYYY-MM-DD", subjectId: "string", records: [{ studentId: "string", status: "PRESENT" | "ABSENT" }] }
 *
 * All upserts run inside a single `prisma.$transaction` so the batch is
 * atomic: re-marking the same (enrollment, date) overwrites the prior value.
 */
export async function createBatchAttendance(req: Request, res: Response) {
  try {
    const { date, subjectId, records } = req.body;

    if (!date || subjectId === undefined || !Array.isArray(records)) {
      return res
        .status(400)
        .json({ message: "date, subjectId and records array are required" });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: "records must contain at least one entry" });
    }

    const attendanceDate = new Date(date);
    if (Number.isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const parsedSubjectId = parseId(subjectId);
    if (parsedSubjectId === null) {
      return res.status(400).json({ message: "Invalid subjectId" });
    }

    const subject = await prisma.subject.findUnique({ where: { id: parsedSubjectId } });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Validate every record up front so the transaction never partially runs
    // on bad input.
    const BATCH_STATUSES = ["PRESENT", "ABSENT"] as const;
    type BatchStatusInput = (typeof BATCH_STATUSES)[number];
    const parsedRecords: { studentId: number; status: BatchStatusInput }[] = [];
    for (let i = 0; i < records.length; i++) {
      const entry = records[i];
      const parsedStudentId = parseId(entry?.studentId);
      if (parsedStudentId === null) {
        return res
          .status(400)
          .json({ message: `records[${i}].studentId must be a valid id` });
      }
      if (!BATCH_STATUSES.includes(entry?.status as BatchStatusInput)) {
        return res.status(400).json({
          message: `records[${i}].status is invalid. Must be one of: ${BATCH_STATUSES.join(", ")}`,
        });
      }
      parsedRecords.push({ studentId: parsedStudentId, status: entry.status });
    }

    // Fail fast if any student does not exist.
    const studentIds = [...new Set(parsedRecords.map((r) => r.studentId))];
    const existingStudents = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingStudents.map((s) => s.id));
    const missingIds = studentIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return res
        .status(404)
        .json({ message: `Student(s) not found: ${missingIds.join(", ")}` });
    }

    const academicYear = new Date().getFullYear().toString();

    const results = await prisma.$transaction(async (tx) => {
      const outcomes = [];
      for (const record of parsedRecords) {
        let enrollment = await tx.enrollment.findFirst({
          where: { studentId: record.studentId, subjectId: parsedSubjectId },
        });
        if (!enrollment) {
          enrollment = await tx.enrollment.create({
            data: {
              studentId: record.studentId,
              subjectId: parsedSubjectId,
              semester: 1,
              academicYear,
            },
          });
        }

        const attendance = await tx.attendance.upsert({
          where: {
            enrollmentId_date: {
              enrollmentId: enrollment.id,
              date: attendanceDate,
            },
          },
          update: { status: record.status },
          create: {
            enrollmentId: enrollment.id,
            date: attendanceDate,
            status: record.status,
          },
        });
        outcomes.push(attendance);
      }
      return outcomes;
    });

    res.status(200).json({
      message: `Batch attendance logged for ${results.length} student(s) successfully!`,
      count: results.length,
      date: attendanceDate,
      subjectId: parsedSubjectId,
    });
  } catch (error) {
    console.error("Error logging batch attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /attendance/notify-parents — ADMIN / FACULTY only. */
export async function notifyParents(req: Request, res: Response) {
  try {
    const { classGroupId, subjectId, date } = req.body ?? {};
    const parsedClassGroupId = parseId(classGroupId);
    if (parsedClassGroupId === null) {
      return res.status(400).json({ message: "A valid classGroupId is required" });
    }
    const attendanceDate = date ? new Date(date) : new Date();
    if (Number.isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }
    const dayStart = new Date(attendanceDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const students = await prisma.student.findMany({
      where: { classGroupId: parsedClassGroupId },
      include: { enrollments: { include: { attendance: true } } },
    });

    let notified = 0;
    let skipped = 0;
    for (const s of students) {
      const parent = s.parentEmail?.trim();
      if (!parent) { skipped++; continue; }
      let isAbsent = false;
      for (const e of s.enrollments) {
        if (subjectId && String(e.subjectId) !== String(subjectId)) continue;
        const rec = e.attendance.find((a) => a.date >= dayStart && a.date < dayEnd);
        if (rec?.status === "ABSENT") { isAbsent = true; break; }
      }
      if (!isAbsent) { skipped++; continue; }
      const name = `${s.firstName} ${s.lastName}`.trim();
      try {
        await sendParentEmail(
          parent,
          "CampusIQ Attendance Alert - MIT ADT University",
          `Dear Parent,\n\nThis is to inform you that ${name} (Roll No: ${s.rollNumber}) was marked ABSENT on ${dayStart.toISOString().slice(0, 10)}.\n\nRegards,\nMIT ADT University | CampusIQ`
        );
        notified++;
      } catch (e) {
        console.error("Notify parent failed for", parent, e);
        skipped++;
      }
    }
    return res.json({ message: "Parent notifications processed.", notified, skipped, total: students.length });
  } catch (error) {
    console.error("Error notifying parents:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /attendance — ADMIN / FACULTY only (enforced in the router). */
export async function createAttendance(req: Request, res: Response) {
  try {
    const { studentId, date, status, subjectId, subjectCode } = req.body;

    const parsedStudentId = parseId(studentId);
    if (parsedStudentId === null || !date || !status) {
      return res.status(400).json({ message: "studentId, date and status are required" });
    }

    if (!ATTENDANCE_STATUSES.includes(status as AttendanceStatusInput)) {
      return res
        .status(400)
        .json({ message: `Invalid status. Must be one of: ${ATTENDANCE_STATUSES.join(", ")}` });
    }

    const attendanceDate = new Date(date);
    if (Number.isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId },
      include: { classGroup: true },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const departmentId = student.classGroup?.departmentId ?? student.departmentId;

    // Resolve the subject: explicit id/code win, otherwise fall back to the
    // default "General Attendance" subject in the student's department.
    let subject = null;
    if (subjectId !== undefined) {
      const parsedSubjectId = parseId(subjectId);
      if (parsedSubjectId === null) {
        return res.status(400).json({ message: "Invalid subjectId" });
      }
      subject = await prisma.subject.findUnique({ where: { id: parsedSubjectId } });
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
    } else if (subjectCode) {
      subject = await prisma.subject.findFirst({ where: { code: subjectCode } });
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
    } else {
      subject = await prisma.subject.findFirst({ where: { code: "ATT101" } });
      if (!subject && departmentId) {
        subject = await prisma.subject.create({
          data: {
            code: "ATT101",
            name: "General Attendance",
            credits: 0,
            departmentId,
          },
        });
      }
    }
    if (!subject) {
      return res.status(400).json({ message: "Unable to resolve a subject for this student" });
    }

    const enrollment = await resolveEnrollment(parsedStudentId, subject.id);

    // Upsert so re-marking the same day simply overwrites the previous value.
    await prisma.attendance.upsert({
      where: {
        enrollmentId_date: {
          enrollmentId: enrollment.id,
          date: attendanceDate,
        },
      },
      update: { status: status as AttendanceStatusInput },
      create: {
        enrollmentId: enrollment.id,
        date: attendanceDate,
        status: status as AttendanceStatusInput,
      },
    });

    res.status(200).json({ message: `Student marked ${status} successfully!` });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
