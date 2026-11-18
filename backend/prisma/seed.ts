import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// Institutional Hierarchy (MIT ADT University - Root Tenant)
const SOC_CLASS_COUNT = 24; // FY & SY common classes: SOC - 1 .. SOC - 24
const SPECIALIZATION_NAMES = ["Core", "Artificial Intelligence and Analytics", "Cyber Security and Forensics"] as const;
const SPEC_PREFIX: Record<(typeof SPECIALIZATION_NAMES)[number], string> = {
  Core: "Core",
  "Artificial Intelligence and Analytics": "AIA",
  "Cyber Security and Forensics": "Cyber",
};
const SPEC_CLASS_COUNT_Y3 = 9; // Year 3 specialized divisions per spec
const SPEC_CLASS_COUNT_Y4 = 9; // Year 4 specialized divisions per spec
const CSE_SUBJECT_CREDITS = 4;
const ACADEMIC_YEAR = "2025-26";
const ATTENDANCE_DAYS = 30;
const ATTENDANCE_DATES = Array.from({ length: ATTENDANCE_DAYS }, (_, index) => {
  const date = new Date("2025-07-01T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + index);
  return date;
});
const MARK_TEMPLATES = [
  { examType: "ASSIGNMENT" as const, maxMarks: 10 },
  { examType: "ASSIGNMENT" as const, maxMarks: 10 },
  { examType: "INTERNAL" as const, maxMarks: 50 },
];
const HIGH_RISK_ATTENDANCE_DAYS = 100;
const HIGH_RISK_ATTENDANCE_DATES = Array.from(
  { length: HIGH_RISK_ATTENDANCE_DAYS },
  (_, index) => {
    const date = new Date("2025-07-01T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() + index);
    return date;
  }
);
const HIGH_RISK_SHAP_DRIVERS = [
  { feature: "Attendance < 75%", impact: -0.45 },
  { feature: "CA Marks < 12", impact: -0.32 },
  { feature: "Missed Lab Submissions", impact: -0.14 },
] as const;

const CSE_SUBJECTS = [
  { code: "MATH101", name: "Engineering Mathematics-I", year: 1, specializationName: null },
  { code: "CS101", name: "C Programming", year: 1, specializationName: null },
  { code: "EE101", name: "Basic Electrical Engineering", year: 1, specializationName: null },
  { code: "CS201", name: "Data Structures and Algorithms", year: 2, specializationName: null },
  { code: "CS202", name: "Database Management Systems", year: 2, specializationName: null },
  { code: "CS203", name: "Software Engineering", year: 2, specializationName: null },
  { code: "AIA301", name: "Artificial Intelligence", year: 3, specializationName: "Artificial Intelligence and Analytics" },
  { code: "AIA302", name: "Machine Learning", year: 3, specializationName: "Artificial Intelligence and Analytics" },
  { code: "AIA401", name: "Deep Learning", year: 4, specializationName: "Artificial Intelligence and Analytics" },
  { code: "AIA402", name: "Natural Language Processing", year: 4, specializationName: "Artificial Intelligence and Analytics" },
  { code: "CYB301", name: "Cryptography", year: 3, specializationName: "Cyber Security and Forensics" },
  { code: "CYB302", name: "Network Security", year: 3, specializationName: "Cyber Security and Forensics" },
  { code: "CYB401", name: "Ethical Hacking", year: 4, specializationName: "Cyber Security and Forensics" },
  { code: "CYB402", name: "Digital Forensics", year: 4, specializationName: "Cyber Security and Forensics" },
  { code: "COR301", name: "Operating Systems", year: 3, specializationName: "Core" },
  { code: "COR302", name: "Computer Networks", year: 3, specializationName: "Core" },
  { code: "COR401", name: "System Design", year: 4, specializationName: "Core" },
  { code: "COR402", name: "Cloud Computing", year: 4, specializationName: "Core" },
] as const;

interface HighRiskStudentSpec {
  fullName: string;
  rollNumber: string;
  className: string;
  attendancePercent: number;
  caMarks: number;
  riskScore: number;
}

const HIGH_RISK_SAMPLE_STUDENTS: HighRiskStudentSpec[] = [
  {
    fullName: "Aarav Kulkarni",
    rollNumber: "MITU22BTCS0101",
    className: "AIA - 1",
    attendancePercent: 54,
    caMarks: 9,
    riskScore: 0.92,
  },
  {
    fullName: "Sneha Deshmukh",
    rollNumber: "MITU22BTCS0102",
    className: "AIA - 1",
    attendancePercent: 58,
    caMarks: 11,
    riskScore: 0.88,
  },
  {
    fullName: "Rohan Patil",
    rollNumber: "MITU22BTCS0205",
    className: "AIA - 2",
    attendancePercent: 61,
    caMarks: 10,
    riskScore: 0.85,
  },
  {
    fullName: "Priya Joshi",
    rollNumber: "MITU22BTCS0309",
    className: "AIA - 3",
    attendancePercent: 49,
    caMarks: 8,
    riskScore: 0.95,
  },
  {
    fullName: "Kabir Sharma",
    rollNumber: "MITU22BTCS0412",
    className: "Core - 1",
    attendancePercent: 63,
    caMarks: 12,
    riskScore: 0.81,
  },
  {
    fullName: "Ananya Nair",
    rollNumber: "MITU22BTCS0518",
    className: "Cyber - 1",
    attendancePercent: 52,
    caMarks: 10,
    riskScore: 0.91,
  },
  {
    fullName: "Siddharth Verma",
    rollNumber: "MITU24BTCS0014",
    className: "SOC - 1",
    attendancePercent: 57,
    caMarks: 9,
    riskScore: 0.89,
  },
  {
    fullName: "Meera Iyer",
    rollNumber: "MITU24BTCS0029",
    className: "SOC - 2",
    attendancePercent: 64,
    caMarks: 11,
    riskScore: 0.79,
  },
];

function generateEnrollmentNumber(
  departmentCode: string,
  classGroupId: number,
  usedNumbers: Set<string>
) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const enrollmentNumber = `MIT-${departmentCode}-2024-${classGroupId}-${faker.string.numeric(4)}`;
    if (!usedNumbers.has(enrollmentNumber)) {
      usedNumbers.add(enrollmentNumber);
      return enrollmentNumber;
    }
  }
  throw new Error(`Unable to generate a unique enrollment number for class ${classGroupId}`);
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || faker.person.lastName(),
  };
}

interface ClassContext {
  id: number;
  year: number;
  departmentId: number;
  specializationId: number | null;
}

interface TelemetryStudent {
  studentId: number;
  attendanceRate: number;
  markMultiplier: number;
}

async function ensureClassSubjects(classGroup: ClassContext) {
  let subjects = await prisma.subject.findMany({
    where: {
      departmentId: classGroup.departmentId,
      year: classGroup.year,
      specializationId: classGroup.specializationId,
    },
    select: { id: true },
  });

  if (subjects.length === 0) {
    const code = `GEN-${classGroup.departmentId}-Y${classGroup.year}`;
    const subject = await prisma.subject.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: `General Studies - Year ${classGroup.year}`,
        year: classGroup.year,
        credits: 4,
        departmentId: classGroup.departmentId,
        specializationId: null,
      },
    });
    await prisma.subject.update({
      where: { id: subject.id },
      data: { classGroups: { connect: { id: classGroup.id } } },
    });
    subjects = [{ id: subject.id }];
  }

  return subjects;
}

async function seedAcademicTelemetry(
  students: TelemetryStudent[],
  classGroup: ClassContext
) {
  if (students.length === 0) return;

  const subjects = await ensureClassSubjects(classGroup);
  const subjectIds = subjects.map((subject) => subject.id);
  const studentIds = students.map((student) => student.studentId);

  await prisma.enrollment.createMany({
    data: students.flatMap((student) =>
      subjectIds.map((subjectId) => ({
        studentId: student.studentId,
        subjectId,
        semester: classGroup.year,
        academicYear: ACADEMIC_YEAR,
      }))
    ),
    skipDuplicates: true,
  });

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      subjectId: { in: subjectIds },
      semester: classGroup.year,
      academicYear: ACADEMIC_YEAR,
    },
    select: { id: true, studentId: true },
  });
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
  if (enrollmentIds.length === 0) return;

  await prisma.mark.deleteMany({
    where: { enrollmentId: { in: enrollmentIds } },
  });

  const markMultipliers = new Map(
    students.map((student) => [student.studentId, student.markMultiplier])
  );
  const markTotals = new Map<number, { obtained: number; max: number }>();
  const markData: {
    enrollmentId: number;
    examType: "ASSIGNMENT" | "INTERNAL";
    marksObtained: number;
    maxMarks: number;
  }[] = [];

  for (const enrollment of enrollments) {
    const multiplier = markMultipliers.get(enrollment.studentId) ?? 1;
    for (const template of MARK_TEMPLATES) {
      const marksObtained =
        Math.round(template.maxMarks * multiplier * 10) / 10;
      markData.push({
        enrollmentId: enrollment.id,
        examType: template.examType,
        marksObtained,
        maxMarks: template.maxMarks,
      });
      const totals = markTotals.get(enrollment.studentId) ?? {
        obtained: 0,
        max: 0,
      };
      totals.obtained += marksObtained;
      totals.max += template.maxMarks;
      markTotals.set(enrollment.studentId, totals);
    }
  }

  await prisma.mark.createMany({ data: markData });

  const primaryEnrollmentByStudent = new Map<number, number>();
  for (const enrollment of enrollments) {
    if (!primaryEnrollmentByStudent.has(enrollment.studentId)) {
      primaryEnrollmentByStudent.set(enrollment.studentId, enrollment.id);
    }
  }

  const attendanceByStudent = new Map<number, number>();
  const attendanceData: {
    enrollmentId: number;
    date: Date;
    status: "PRESENT" | "ABSENT";
  }[] = [];

  for (const student of students) {
    const enrollmentId = primaryEnrollmentByStudent.get(student.studentId);
    if (!enrollmentId) continue;

    let presentDays = 0;
    for (const date of ATTENDANCE_DATES) {
      const status =
        faker.number.float({ min: 0, max: 1 }) < student.attendanceRate
          ? "PRESENT"
          : "ABSENT";
      if (status === "PRESENT") presentDays++;
      attendanceData.push({ enrollmentId, date, status });
    }
    attendanceByStudent.set(
      student.studentId,
      (presentDays / ATTENDANCE_DATES.length) * 100
    );
  }

  await prisma.attendance.createMany({
    data: attendanceData,
    skipDuplicates: true,
  });

  for (const student of students) {
    const avgAttendance = attendanceByStudent.get(student.studentId) ?? 0;
    const totals = markTotals.get(student.studentId);
    const avgMarks =
      totals && totals.max > 0 ? (totals.obtained / totals.max) * 100 : 0;

    let riskProbability = 0.1;
    if (avgAttendance < 75 && avgMarks < 40) {
      riskProbability = faker.number.float({ min: 0.85, max: 0.99 });
    } else if (avgAttendance < 75 || avgMarks < 40) {
      riskProbability = faker.number.float({ min: 0.5, max: 0.84 });
    }

    const factors =
      avgAttendance < 75 && avgMarks < 40
        ? "Attendance drop, Low CA marks"
        : avgAttendance < 75
          ? "Attendance drop"
          : avgMarks < 40
            ? "Low CA marks"
            : "Stable attendance and marks";
    const riskScore = Math.round(riskProbability * 1000) / 1000;
    const lastCalculated = new Date();

    await prisma.mLPrediction.upsert({
      where: { studentId: student.studentId },
      update: {
        riskScore,
        isAtRisk: riskProbability > 0.75,
        factors,
        lastCalculated,
      },
      create: {
        studentId: student.studentId,
        riskScore,
        isAtRisk: riskProbability > 0.75,
        factors,
        lastCalculated,
      },
    });
  }
}

async function seedHighRiskSampleStudents(departmentId: number) {
  const passwordHash = await bcrypt.hash("password123", 10);
  const rollNumbers = HIGH_RISK_SAMPLE_STUDENTS.map((student) => student.rollNumber);
  const emailFor = (rollNumber: string) => `${rollNumber.toLowerCase()}@student.campusiq.com`;

  for (const spec of HIGH_RISK_SAMPLE_STUDENTS) {
    const classGroup = await prisma.classGroup.findUniqueOrThrow({
      where: { name_departmentId: { name: spec.className, departmentId } },
      select: {
        id: true,
        year: true,
        departmentId: true,
        specializationId: true,
      },
    });
    const { firstName, lastName } = splitFullName(spec.fullName);
    const email = emailFor(spec.rollNumber);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: spec.fullName,
        role: "STUDENT",
        passwordHash,
        departmentId,
      },
      create: {
        name: spec.fullName,
        email,
        passwordHash,
        role: "STUDENT",
        departmentId,
      },
    });

    const student = await prisma.student.upsert({
      where: { rollNumber: spec.rollNumber },
      update: {
        userId: user.id,
        firstName,
        lastName,
        phone: `+91-90000${spec.rollNumber.slice(-4)}`,
        admissionYear: classGroup.year === 1 ? 2024 : 2022,
        classGroupId: classGroup.id,
        departmentId,
      },
      create: {
        userId: user.id,
        rollNumber: spec.rollNumber,
        firstName,
        lastName,
        phone: `+91-90000${spec.rollNumber.slice(-4)}`,
        admissionYear: classGroup.year === 1 ? 2024 : 2022,
        classGroupId: classGroup.id,
        departmentId,
      },
    });

    const subjects = await ensureClassSubjects(classGroup);
    const subjectIds = subjects.map((subject) => subject.id);
    await prisma.enrollment.createMany({
      data: subjectIds.map((subjectId) => ({
        studentId: student.id,
        subjectId,
        semester: classGroup.year,
        academicYear: ACADEMIC_YEAR,
      })),
      skipDuplicates: true,
    });

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        subjectId: { in: subjectIds },
        semester: classGroup.year,
        academicYear: ACADEMIC_YEAR,
      },
      select: { id: true },
    });
    const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
    if (enrollmentIds.length === 0) {
      throw new Error(`No enrollments found for high-risk student ${spec.rollNumber}`);
    }

    await prisma.mark.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });
    await prisma.attendance.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });

    await prisma.mark.createMany({
      data: enrollmentIds.map((enrollmentId) => ({
        enrollmentId,
        examType: "INTERNAL" as const,
        marksObtained: spec.caMarks,
        maxMarks: 30,
      })),
    });

    await prisma.attendance.createMany({
      data: enrollmentIds.flatMap((enrollmentId) =>
        HIGH_RISK_ATTENDANCE_DATES.map((date, index) => ({
          enrollmentId,
          date,
          status: index < spec.attendancePercent ? ("PRESENT" as const) : ("ABSENT" as const),
        }))
      ),
    });

    await prisma.mLPrediction.upsert({
      where: { studentId: student.id },
      update: {
        riskScore: spec.riskScore,
        isAtRisk: true,
        factors: JSON.stringify(HIGH_RISK_SHAP_DRIVERS),
        lastCalculated: new Date(),
      },
      create: {
        studentId: student.id,
        riskScore: spec.riskScore,
        isAtRisk: true,
        factors: JSON.stringify(HIGH_RISK_SHAP_DRIVERS),
        lastCalculated: new Date(),
      },
    });
  }

  const inserted = await prisma.student.findMany({
    where: { rollNumber: { in: rollNumbers } },
    select: { rollNumber: true },
  });
  if (inserted.length !== rollNumbers.length) {
    throw new Error(
      `High-risk sample verification failed: expected ${rollNumbers.length}, found ${inserted.length}`
    );
  }
  console.log(
    `Seeded ${inserted.length} deterministic high-risk sample students without duplicates: ${rollNumbers.join(", ")}.`
  );
}

async function ensureDeptHierarchy(departmentId: number, deptCode: string) {
  // 1st & 2nd Year (FY & SY): Common SOC classes, nullable specialization
  for (let i = 1; i <= SOC_CLASS_COUNT; i++) {
    const name = `SOC - ${i}`;
    await prisma.classGroup.upsert({
      where: { name_departmentId: { name, departmentId } },
      update: { year: i <= 12 ? 1 : 2, specializationId: null },
      create: { name, year: i <= 12 ? 1 : 2, departmentId, specializationId: null },
    });
  }

  // 3rd Year: Specialized classes (Core, AIA, Cyber)
  for (const specName of SPECIALIZATION_NAMES) {
    const spec = await prisma.specialization.upsert({
      where: { name_departmentId: { name: specName, departmentId } },
      update: {},
      create: { name: specName, departmentId },
    });
    const prefix = SPEC_PREFIX[specName];
    for (let i = 1; i <= SPEC_CLASS_COUNT_Y3; i++) {
      const name = `${prefix} - ${i}`;
      await prisma.classGroup.upsert({
        where: { name_departmentId: { name, departmentId } },
        update: { year: 3, specializationId: spec.id },
        create: { name, year: 3, departmentId, specializationId: spec.id },
      });
    }

    // 4th Year: Specialized classes (LY) - suffixed to avoid name collisions with Year 3
    for (let i = 1; i <= SPEC_CLASS_COUNT_Y4; i++) {
      const name = `${prefix} - ${i} (LY)`;
      await prisma.classGroup.upsert({
        where: { name_departmentId: { name, departmentId } },
        update: { year: 4, specializationId: spec.id },
        create: { name, year: 4, departmentId, specializationId: spec.id },
      });
    }
  }
  console.log(
    `Seeded hierarchy for ${deptCode}: ${SOC_CLASS_COUNT} SOC + ${SPECIALIZATION_NAMES.length * SPEC_CLASS_COUNT_Y3} Y3 specialized + ${SPECIALIZATION_NAMES.length * SPEC_CLASS_COUNT_Y4} Y4 specialized classes.`
  );
}

async function ensureCseSubjects(departmentId: number) {
  const specializations = await prisma.specialization.findMany({
    where: { departmentId },
  });
  const specializationIds = new Map(
    specializations.map((specialization) => [specialization.name, specialization.id])
  );

  for (const subject of CSE_SUBJECTS) {
    const specializationId = subject.specializationName
      ? specializationIds.get(subject.specializationName)
      : null;
    if (subject.specializationName && !specializationId) {
      throw new Error(`Specialization "${subject.specializationName}" not found for CSE`);
    }

    await prisma.subject.upsert({
      where: { code: subject.code },
      update: {
        name: subject.name,
        year: subject.year,
        departmentId,
        specializationId: specializationId ?? null,
      },
      create: {
        code: subject.code,
        name: subject.name,
        year: subject.year,
        credits: CSE_SUBJECT_CREDITS,
        departmentId,
        specializationId: specializationId ?? null,
      },
    });
  }

  const classes = await prisma.classGroup.findMany({ where: { departmentId } });
  for (const subject of CSE_SUBJECTS) {
    const specializationId = subject.specializationName
      ? specializationIds.get(subject.specializationName) ?? null
      : null;
    const linkedClasses = classes
      .filter(
        (classGroup) =>
          classGroup.year === subject.year &&
          classGroup.specializationId === specializationId
      )
      .map((classGroup) => ({ id: classGroup.id }));

    await prisma.subject.update({
      where: { code: subject.code },
      data: { classGroups: { set: linkedClasses } },
    });
  }

  console.log(`Seeded ${CSE_SUBJECTS.length} year-wise CSE subjects.`);
}

async function main() {
  console.log("Starting MIT ADT University (CampusIQ ERP) seed...");

  const cse = await prisma.department.upsert({
    where: { code: "CSE" },
    update: { name: "Computer Science and Engineering" },
    create: { name: "Computer Science and Engineering", code: "CSE" },
  });

  const it = await prisma.department.upsert({
    where: { code: "IT" },
    update: { name: "Information Technology" },
    create: { name: "Information Technology", code: "IT" },
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin2@campusiq.com" },
    update: { departmentId: cse.id, role: "DEPT_ADMIN" },
    create: {
      name: "CSE Admin",
      email: "admin2@campusiq.com",
      passwordHash: adminPassword,
      role: "DEPT_ADMIN",
      departmentId: cse.id,
    },
  });

  const superPassword = await bcrypt.hash("super123", 10);
  await prisma.user.upsert({
    where: { email: "superadmin@mitadt.edu.in" },
    update: { role: "SUPERADMIN" },
    create: {
      name: "MIT ADT Super Admin",
      email: "superadmin@mitadt.edu.in",
      passwordHash: superPassword,
      role: "SUPERADMIN",
      departmentId: null,
    },
  });

  await ensureDeptHierarchy(cse.id, "CSE");
  await ensureDeptHierarchy(it.id, "IT");
  await ensureCseSubjects(cse.id);
  await seedHighRiskSampleStudents(cse.id);

  const aia1Class = await prisma.classGroup.findUniqueOrThrow({
    where: {
      name_departmentId: { name: "AIA - 1", departmentId: cse.id },
    },
  });
  const aia2Class = await prisma.classGroup.findUniqueOrThrow({
    where: {
      name_departmentId: { name: "AIA - 2", departmentId: cse.id },
    },
  });
  const aia3Class = await prisma.classGroup.findUniqueOrThrow({
    where: {
      name_departmentId: { name: "AIA - 3", departmentId: cse.id },
    },
  });

  const allClasses = await prisma.classGroup.findMany();
  const departmentCodes = new Map<number, string>([
    [cse.id, "CSE"],
    [it.id, "IT"],
  ]);
  const existingRollNumbers = await prisma.student.findMany({
    select: { rollNumber: true },
  });
  const usedEnrollmentNumbers = new Set(
    existingRollNumbers.map((student) => student.rollNumber)
  );
  const passwordHash = await bcrypt.hash("password123", 10);

  let studentsCreated = 0;
  for (const classGroup of allClasses) {
    const studentCount = Math.floor(Math.random() * 6) + 50;
    const departmentCode = departmentCodes.get(classGroup.departmentId) ?? "CSE";
    const studentSpecs = Array.from({ length: studentCount }, () => {
      const enrollmentNumber = generateEnrollmentNumber(
        departmentCode,
        classGroup.id,
        usedEnrollmentNumbers
      );
      const { firstName, lastName } = splitFullName(faker.person.fullName());
      const isAtRiskCohort = faker.number.float({ min: 0, max: 1 }) < 0.2;

      return {
        enrollmentNumber,
        firstName,
        lastName,
        phone: faker.phone.number(),
        email: `${enrollmentNumber.toLowerCase()}@student.campusiq.com`,
        attendanceRate: isAtRiskCohort
          ? faker.number.float({ min: 0.68, max: 0.78 })
          : faker.number.float({ min: 0.8, max: 0.96 }),
        markMultiplier: isAtRiskCohort
          ? faker.number.float({ min: 0.42, max: 0.55 })
          : faker.number.float({ min: 0.7, max: 0.98 }),
      };
    });

    await prisma.user.createMany({
      data: studentSpecs.map((student) => ({
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        passwordHash,
        role: "STUDENT",
        departmentId: classGroup.departmentId,
      })),
    });

    const createdUsers = await prisma.user.findMany({
      where: { email: { in: studentSpecs.map((student) => student.email) } },
      select: { id: true, email: true },
    });
    const usersByEmail = new Map(
      createdUsers.map((user) => [user.email, user.id])
    );

    await prisma.student.createMany({
      data: studentSpecs.map((student) => ({
        userId: usersByEmail.get(student.email)!,
        rollNumber: student.enrollmentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        admissionYear: 2024,
        classGroupId: classGroup.id,
        departmentId: classGroup.departmentId,
      })),
    });

    const createdStudents = await prisma.student.findMany({
      where: {
        rollNumber: { in: studentSpecs.map((student) => student.enrollmentNumber) },
      },
      select: { id: true, rollNumber: true },
    });
    const studentsByRollNumber = new Map(
      createdStudents.map((student) => [student.rollNumber, student.id])
    );

    const telemetryStudents: TelemetryStudent[] = studentSpecs.map((student) => ({
      studentId: studentsByRollNumber.get(student.enrollmentNumber)!,
      attendanceRate: student.attendanceRate,
      markMultiplier: student.markMultiplier,
    }));

    await seedAcademicTelemetry(telemetryStudents, {
      id: classGroup.id,
      year: classGroup.year,
      departmentId: classGroup.departmentId,
      specializationId: classGroup.specializationId,
    });

    studentsCreated += studentSpecs.length;
  }

  await prisma.user.upsert({
    where: { email: "superadmin@campusiq.com" },
    update: {
      name: "Test Super Admin",
      role: "SUPERADMIN",
      passwordHash,
      departmentId: null,
    },
    create: {
      name: "Test Super Admin",
      email: "superadmin@campusiq.com",
      passwordHash,
      role: "SUPERADMIN",
      departmentId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: "cse_admin@campusiq.com" },
    update: {
      name: "Test CSE Admin",
      role: "DEPT_ADMIN",
      passwordHash,
      departmentId: cse.id,
    },
    create: {
      name: "Test CSE Admin",
      email: "cse_admin@campusiq.com",
      passwordHash,
      role: "DEPT_ADMIN",
      departmentId: cse.id,
    },
  });

  const testFaculty = await prisma.user.upsert({
    where: { email: "faculty_aia1@campusiq.com" },
    update: {
      name: "Test AIA-1 Faculty",
      role: "FACULTY",
      passwordHash,
      department: { connect: { id: cse.id } },
      assignedClasses: {
        set: [{ id: aia1Class.id }, { id: aia2Class.id }, { id: aia3Class.id }],
      },
    },
    create: {
      name: "Test AIA-1 Faculty",
      email: "faculty_aia1@campusiq.com",
      passwordHash,
      role: "FACULTY",
      department: { connect: { id: cse.id } },
      assignedClasses: {
        connect: [{ id: aia1Class.id }, { id: aia2Class.id }, { id: aia3Class.id }],
      },
    },
  });

  await prisma.faculty.upsert({
    where: { userId: testFaculty.id },
    update: {
      employeeId: "MIT-FAC-TEST-001",
      firstName: "Test",
      lastName: "Faculty",
      departmentId: cse.id,
    },
    create: {
      userId: testFaculty.id,
      employeeId: "MIT-FAC-TEST-001",
      firstName: "Test",
      lastName: "Faculty",
      departmentId: cse.id,
    },
  });

  const testStudent = await prisma.user.upsert({
    where: { email: "student_aia1@campusiq.com" },
    update: {
      name: "Test AIA-1 Student",
      role: "STUDENT",
      passwordHash,
      departmentId: cse.id,
    },
    create: {
      name: "Test AIA-1 Student",
      email: "student_aia1@campusiq.com",
      passwordHash,
      role: "STUDENT",
      departmentId: cse.id,
    },
  });

  const testStudentProfile = await prisma.student.upsert({
    where: { userId: testStudent.id },
    update: {
      rollNumber: "MIT-CSE-2024-TEST-0001",
      firstName: "Test",
      lastName: "Student",
      classGroupId: aia1Class.id,
      departmentId: cse.id,
      admissionYear: 2024,
    },
    create: {
      userId: testStudent.id,
      rollNumber: "MIT-CSE-2024-TEST-0001",
      firstName: "Test",
      lastName: "Student",
      classGroupId: aia1Class.id,
      departmentId: cse.id,
      admissionYear: 2024,
    },
  });

  await seedAcademicTelemetry(
    [
      {
        studentId: testStudentProfile.id,
        attendanceRate: 0.62,
        markMultiplier: 0.38,
      },
    ],
    {
      id: aia1Class.id,
      year: aia1Class.year,
      departmentId: aia1Class.departmentId,
      specializationId: aia1Class.specializationId,
    }
  );

  console.log(
    `Database seed completed: ${studentsCreated} mock students across ${allClasses.length} classes, 8 deterministic high-risk sample students, plus 4 role-switching test accounts.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
