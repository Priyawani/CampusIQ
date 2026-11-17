import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

export interface HierarchyFilters {
  year: string;
  classGroupId: string;
  specializationId: string;
  subjectId: string;
}

interface ClassOption {
  id: number;
  name: string;
  year: number;
  department: { id: number; code: string; name: string };
  specialization: { id: number; name: string } | null;
  specializationId: number | null;
}

interface SubjectOption {
  id: number;
  code: string;
  name: string;
  year: number;
  department: string;
  specializationId: number | null;
  classGroupIds: number[];
}

interface FilterHierarchyProps {
  value: HierarchyFilters;
  onChange: (next: HierarchyFilters) => void;
}

const YEAR_OPTIONS = [
  { label: "Year 1 (FY)", value: 1 },
  { label: "Year 2 (SY)", value: 2 },
  { label: "Year 3 (TY)", value: 3 },
  { label: "Year 4 (B.Tech)", value: 4 },
];

function normalizeSpecialization(id: number | null | undefined) {
  return id == null ? "general" : String(id);
}

function sortClasses(classes: ClassOption[]) {
  return [...classes].sort((a, b) =>
    `${a.name} (${a.department.code})`.localeCompare(
      `${b.name} (${b.department.code})`,
      undefined,
      { numeric: true }
    )
  );
}

function FilterHierarchy({ value, onChange }: FilterHierarchyProps) {
  const initialFiltersRef = useRef(value);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [assignedClassIds, setAssignedClassIds] = useState<number[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedYear, setSelectedYear] = useState(
    value.year || String(YEAR_OPTIONS[0].value)
  );
  const [selectedClass, setSelectedClass] = useState(value.classGroupId);
  const [selectedSpecialization, setSelectedSpecialization] = useState(
    value.specializationId || "general"
  );
  const [selectedSubject, setSelectedSubject] = useState(value.subjectId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const [profileResponse, classResponse, subjectResponse] = await Promise.all([
          api.get("/auth/me"),
          api.get("/students/class-groups"),
          api.get("/subjects"),
        ]);

        const profile = profileResponse.data;
        const fetchedClasses: ClassOption[] = Array.isArray(classResponse.data)
          ? classResponse.data
          : [];
        const assignedClasses = (profile.assignedClasses ?? []).map(
          (item: { id?: number } | number) =>
            typeof item === "number" ? item : Number(item.id)
        );
        const scopedClasses =
          profile.role === "FACULTY"
            ? fetchedClasses.filter((classGroup) => assignedClasses.includes(classGroup.id))
            : fetchedClasses;
        const firstClass = sortClasses(scopedClasses)[0];

        if (cancelled) return;
        setAllClasses(fetchedClasses);
        setAssignedClassIds(profile.role === "FACULTY" ? assignedClasses : null);
        setSubjects(Array.isArray(subjectResponse.data) ? subjectResponse.data : []);
        if (firstClass && !initialFiltersRef.current.classGroupId) {
          setSelectedYear(String(firstClass.year));
          setSelectedClass(String(firstClass.id));
          setSelectedSpecialization(normalizeSpecialization(firstClass.specializationId));
        }
      } catch (error) {
        console.error("Failed to load filter hierarchy:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleClasses = useMemo(
    () =>
      assignedClassIds === null
        ? allClasses
        : allClasses.filter((classGroup) => assignedClassIds.includes(classGroup.id)),
    [allClasses, assignedClassIds]
  );

  const filteredClasses = useMemo(
    () =>
      sortClasses(
        visibleClasses.filter((classGroup) => classGroup.year === Number(selectedYear))
      ),
    [visibleClasses, selectedYear]
  );

  useEffect(() => {
    const classGroup = allClasses.find((item) => String(item.id) === selectedClass);
    setSelectedSpecialization(normalizeSpecialization(classGroup?.specializationId));
  }, [allClasses, selectedClass]);

  useEffect(() => {
    onChange({
      year: selectedYear,
      classGroupId: selectedClass,
      specializationId: selectedSpecialization,
      subjectId: selectedSubject,
    });
  }, [selectedYear, selectedClass, selectedSpecialization, selectedSubject, onChange]);

  const selectedClassGroup = allClasses.find(
    (classGroup) => String(classGroup.id) === selectedClass
  );

  const specializationLabel = !selectedClassGroup
    ? "—"
    : selectedSpecialization === "general"
      ? "Foundation / Common Core"
      : (selectedClassGroup.specialization?.name ?? "Foundation / Common Core");

  const subjectOptions = useMemo(() => {
    if (!selectedClassGroup) return [];
    return subjects.filter((subject) => {
      if (subject.year !== selectedClassGroup.year) return false;
      if (
        normalizeSpecialization(subject.specializationId) !==
        normalizeSpecialization(selectedClassGroup.specializationId)
      ) {
        return false;
      }
      return (
        subject.classGroupIds.includes(selectedClassGroup.id) ||
        subject.department === selectedClassGroup.department.code
      );
    });
  }, [subjects, selectedClassGroup]);

  const handleYearChange = (year: string) => {
    const firstClass = sortClasses(
      visibleClasses.filter((classGroup) => classGroup.year === Number(year))
    )[0];

    setSelectedYear(year);
    setSelectedClass(firstClass ? String(firstClass.id) : "");
    setSelectedSubject("");
  };

  const handleClassChange = (classGroupId: string) => {
    setSelectedClass(classGroupId);
    setSelectedSubject("");
  };

  const selectClass = "border rounded px-2 py-1 text-sm";

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-slate-700 mr-2">
        Filter Hierarchy
      </span>
      <label className="text-xs text-slate-500 flex items-center gap-1">
        Year
        <select
          className={selectClass}
          value={selectedYear}
          disabled={loading}
          onChange={(event) => handleYearChange(event.target.value)}
        >
          {YEAR_OPTIONS.map((year) => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500 flex items-center gap-1">
        Class
        <select
          className={selectClass}
          value={selectedClass}
          disabled={filteredClasses.length === 0}
          onChange={(event) => handleClassChange(event.target.value)}
        >
          <option value="">Select class</option>
          {filteredClasses.map((classGroup) => (
            <option key={classGroup.id} value={classGroup.id}>
              {classGroup.name} ({classGroup.department.code})
            </option>
          ))}
        </select>
      </label>
      <div className="text-xs text-slate-500 flex items-center gap-1">
        Specialization
        <span className="border rounded px-2 py-1 text-sm bg-slate-50 text-slate-700">
          {specializationLabel}
        </span>
      </div>
      <label className="text-xs text-slate-500 flex items-center gap-1">
        Subject
        <select
          className={selectClass}
          value={selectedSubject}
          disabled={!selectedClassGroup}
          onChange={(event) => setSelectedSubject(event.target.value)}
        >
          <option value="">All Subjects</option>
          {subjectOptions.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code} - {subject.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default FilterHierarchy;
