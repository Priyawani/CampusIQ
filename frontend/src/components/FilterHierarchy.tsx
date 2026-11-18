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
  const [selectedYear, setSelectedYear] = useState<number>(
    value.year ? Number(value.year) : YEAR_OPTIONS[0].value
  );
  const [selectedClass, setSelectedClass] = useState<number | "">(
    value.classGroupId ? Number(value.classGroupId) : ""
  );
  const [selectedSpecialization, setSelectedSpecialization] = useState(
    value.specializationId || "general"
  );
  const [selectedSubject, setSelectedSubject] = useState(value.subjectId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        if (!localStorage.getItem("campusiq_token")) {
          setLoadError(true);
          return;
        }

        const [profileResponse, classResponse, subjectResponse] = await Promise.all([
          api.get("/auth/me", { timeout: 10000 }),
          api.get("/students/class-groups", { timeout: 10000 }),
          api.get("/subjects", { timeout: 10000 }),
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

        setAllClasses(fetchedClasses);
        setAssignedClassIds(profile.role === "FACULTY" ? assignedClasses : null);
        setSubjects(Array.isArray(subjectResponse.data) ? subjectResponse.data : []);
        if (firstClass && !initialFiltersRef.current.classGroupId) {
          setSelectedYear(firstClass.year);
          setSelectedClass(firstClass.id);
          setSelectedSpecialization(normalizeSpecialization(firstClass.specializationId));
        }
      } catch (error) {
        console.error("Failed to load filter hierarchy:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        visibleClasses.filter((classGroup) => classGroup.year === selectedYear)
      ),
    [visibleClasses, selectedYear]
  );

  const selectedClassGroup = allClasses.find(
    (classGroup) => classGroup.id === selectedClass
  );

  const effectiveSpecialization = selectedClassGroup
    ? normalizeSpecialization(selectedClassGroup.specializationId)
    : selectedSpecialization;

  useEffect(() => {
    onChange({
      year: String(selectedYear),
      classGroupId: selectedClass === "" ? "" : String(selectedClass),
      specializationId: effectiveSpecialization,
      subjectId: selectedSubject,
    });
  }, [selectedYear, selectedClass, effectiveSpecialization, selectedSubject, onChange]);

  const specializationLabel = !selectedClassGroup
    ? "—"
    : effectiveSpecialization === "general"
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

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setSelectedClass("");
    setSelectedSpecialization("");
    setSelectedSubject("");
  };

  const handleClassChange = (classGroupId: number | "") => {
    setSelectedClass(classGroupId);
    setSelectedSubject("");
  };

  const selectClass = "border rounded px-2 py-1 text-sm";
  const dropdownWrapperClass = "relative z-10 flex items-center gap-1 text-xs text-slate-500";

  return (
    <div className="relative z-10 bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-slate-700 mr-2">
        Filter Hierarchy
      </span>
      {loadError && !loading && (
        <span role="status" className="text-xs font-medium text-amber-700">
          Using default filters — some options could not be loaded.
        </span>
      )}
      <label className={dropdownWrapperClass}>
        Year
        <select
          className={selectClass}
          value={selectedYear}
          onChange={(event) => handleYearChange(Number(event.target.value))}
        >
          {YEAR_OPTIONS.map((year) => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>
      </label>
      <label className={dropdownWrapperClass}>
        Class
        <select
          className={selectClass}
          value={selectedClass}
          disabled={!selectedYear}
          onChange={(event) =>
            handleClassChange(event.target.value ? Number(event.target.value) : "")
          }
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
      <label className={dropdownWrapperClass}>
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
