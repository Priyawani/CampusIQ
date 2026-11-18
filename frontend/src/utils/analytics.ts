export interface ClassGroupLookupSource {
  id: number;
  name: string;
  year: number;
  specializationId?: number | null;
  specialization?: { id: number; name: string } | null;
}

export interface ShapValue {
  feature: string;
  impact: string;
  direction: "risk" | "safe";
  value: number;
}

export interface PredictionStudentDatum {
  studentId: number;
  studentName: string;
  enrollmentNo?: string | null;
  className: string;
  classGroupId?: number | null;
  year?: number | null;
  specializationId?: number | null;
  specialization?: string | null;
  attendance: number;
  finalCaMarks: number;
  riskProbability: number;
  isAtRisk: boolean;
  is_at_risk?: boolean;
  shapValues?: ShapValue[];
}

export interface ClassGroupLookup {
  byId: Map<number, ClassGroupLookupSource>;
  byName: Map<string, ClassGroupLookupSource>;
}

export interface AcademicContext {
  year: number | null;
  specialization: string;
  specializationId: number | null;
}

export interface PredictionGroup {
  key: string;
  label: string;
  year: number | null;
  specialization: string;
  totalStudents: number;
  atRiskStudents: number;
  averageRiskProbability: number;
}

export function buildClassGroupLookup(
  classGroups: ClassGroupLookupSource[] = []
): ClassGroupLookup {
  const byId = new Map<number, ClassGroupLookupSource>();
  const byName = new Map<string, ClassGroupLookupSource>();

  for (const classGroup of classGroups) {
    byId.set(classGroup.id, classGroup);
    if (!byName.has(classGroup.name)) {
      byName.set(classGroup.name, classGroup);
    }
  }

  return { byId, byName };
}

export function resolveAcademicContext(
  student: PredictionStudentDatum,
  lookup: ClassGroupLookup
): AcademicContext {
  const classGroup =
    (student.classGroupId != null ? lookup.byId.get(student.classGroupId) : undefined) ??
    lookup.byName.get(student.className);

  const year = student.year ?? classGroup?.year ?? null;
  const specialization =
    student.specialization ?? classGroup?.specialization?.name ?? null;
  const specializationId =
    student.specializationId ??
    classGroup?.specializationId ??
    classGroup?.specialization?.id ??
    null;

  return {
    year,
    specialization: specialization?.trim() || "Common / SOC",
    specializationId,
  };
}

export function bottomPercent<T>(
  items: T[],
  selector: (item: T) => number,
  percent = 0.05
): T[] {
  if (items.length === 0) return [];
  const count = Math.max(1, Math.ceil(items.length * percent));
  return [...items].sort((a, b) => selector(a) - selector(b)).slice(0, count);
}

export function groupPredictionsByYearAndSpecialization(
  students: PredictionStudentDatum[],
  lookup: ClassGroupLookup
): PredictionGroup[] {
  const groups = new Map<string, PredictionGroup>();

  for (const student of students) {
    const context = resolveAcademicContext(student, lookup);
    const key = `${context.year ?? "unknown"}::${context.specialization}`;
    const existing = groups.get(key) ?? {
      key,
      label: `${context.year != null ? `Year ${context.year}` : "Unknown year"} · ${context.specialization}`,
      year: context.year,
      specialization: context.specialization,
      totalStudents: 0,
      atRiskStudents: 0,
      averageRiskProbability: 0,
    };

    existing.totalStudents += 1;
    if (student.isAtRisk) existing.atRiskStudents += 1;
    existing.averageRiskProbability += student.riskProbability;
    groups.set(key, existing);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      averageRiskProbability:
        group.totalStudents > 0
          ? Math.round((group.averageRiskProbability / group.totalStudents) * 10) / 10
          : 0,
    }))
    .sort((a, b) => {
      const yearA = a.year ?? Number.MAX_SAFE_INTEGER;
      const yearB = b.year ?? Number.MAX_SAFE_INTEGER;
      return yearA - yearB || a.specialization.localeCompare(b.specialization);
    });
}

export interface ClassRiskGroup {
  key: string;
  classGroupId: number | null;
  className: string;
  year: number | null;
  specialization: string;
  totalStudents: number;
  atRiskStudents: number;
  averageRiskProbability: number;
  averageAttendance: number;
  averageFinalCa: number;
  students: PredictionStudentDatum[];
}

export interface SpecializationRiskGroup {
  key: string;
  year: number | null;
  specialization: string;
  totalStudents: number;
  atRiskStudents: number;
  averageRiskProbability: number;
  classes: ClassRiskGroup[];
}

export interface YearRiskGroup {
  year: number | null;
  label: string;
  totalStudents: number;
  atRiskStudents: number;
  averageRiskProbability: number;
  specializations: SpecializationRiskGroup[];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/** Year -> Specialization -> Class drill-down used by the department admin view. */
export function groupPredictionsByHierarchy(
  students: PredictionStudentDatum[],
  lookup: ClassGroupLookup
): YearRiskGroup[] {
  const years = new Map<number | null, Map<string, Map<string, ClassRiskGroup>>>();

  for (const student of students) {
    const context = resolveAcademicContext(student, lookup);
    const yearKey = context.year;
    const specializationKey = context.specialization;
    const classKey = student.className || `Unassigned (${student.studentId})`;

    let specializations = years.get(yearKey);
    if (!specializations) {
      specializations = new Map();
      years.set(yearKey, specializations);
    }
    let classes = specializations.get(specializationKey);
    if (!classes) {
      classes = new Map();
      specializations.set(specializationKey, classes);
    }

    const classGroup =
      classes.get(classKey) ??
      ({
        key: classKey,
        classGroupId: student.classGroupId ?? null,
        className: classKey,
        year: context.year,
        specialization: context.specialization,
        totalStudents: 0,
        atRiskStudents: 0,
        averageRiskProbability: 0,
        averageAttendance: 0,
        averageFinalCa: 0,
        students: [],
      } satisfies ClassRiskGroup);

    classGroup.totalStudents += 1;
    if (student.isAtRisk) classGroup.atRiskStudents += 1;
    classGroup.students.push(student);
    classes.set(classKey, classGroup);
  }

  return Array.from(years.entries())
    .map(([year, specializations]) => {
      const specializationGroups: SpecializationRiskGroup[] = Array.from(
        specializations.entries()
      ).map(([specialization, classes]) => {
        const classGroups = Array.from(classes.values())
          .map((classGroup) => ({
            ...classGroup,
            averageRiskProbability: average(
              classGroup.students.map((student) => student.riskProbability)
            ),
            averageAttendance: average(classGroup.students.map((student) => student.attendance)),
            averageFinalCa: average(classGroup.students.map((student) => student.finalCaMarks)),
          }))
          .sort((a, b) =>
            a.className.localeCompare(b.className, undefined, { numeric: true })
          );

        return {
          key: `${year ?? "unknown"}::${specialization}`,
          year,
          specialization,
          totalStudents: classGroups.reduce((sum, group) => sum + group.totalStudents, 0),
          atRiskStudents: classGroups.reduce((sum, group) => sum + group.atRiskStudents, 0),
          averageRiskProbability: average(
            classGroups.flatMap((group) => group.students.map((student) => student.riskProbability))
          ),
          classes: classGroups,
        };
      });

      const allStudents = specializationGroups.flatMap((group) =>
        group.classes.flatMap((classGroup) => classGroup.students)
      );

      return {
        year,
        label: year != null ? `Year ${year}` : "Unknown year",
        totalStudents: allStudents.length,
        atRiskStudents: allStudents.filter((student) => student.isAtRisk).length,
        averageRiskProbability: average(allStudents.map((student) => student.riskProbability)),
        specializations: specializationGroups.sort((a, b) =>
          a.specialization.localeCompare(b.specialization)
        ),
      } satisfies YearRiskGroup;
    })
    .sort((a, b) => (a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER));
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}
