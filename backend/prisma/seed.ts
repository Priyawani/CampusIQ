import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

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

  console.log("Database seed completed successfully (MIT ADT: CSE, IT, SOC 1-24, Core/AIA/Cyber).");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
