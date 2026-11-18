import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from 'xlsx';
import api from "../services/api";
import { getUserRole } from "../utils/auth";
import { getSelectedDepartmentId } from "../utils/department";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { FileSpreadsheet, BellRing, Zap } from "lucide-react";

interface StudentUser {
  name?: string | null;
  email?: string | null;
}

interface StudentClassGroup {
  id?: number;
  name?: string | null;
  year?: number | null;
  departmentId?: number | null;
  specializationId?: number | null;
  specialization?: { id?: number; name?: string | null } | null;
}

interface Student {
  id: string;
  enrollmentNo?: string | null;
  rollNo?: string | null;
  className?: string | null;
  classGroupId?: number | null;
  user?: StudentUser | null;
  classGroup?: StudentClassGroup | null;
}

function normalizeStudent(raw: unknown): Student {
  const student = (raw ?? {}) as Record<string, unknown>;
  const nestedUser =
    student.user && typeof student.user === "object" ? (student.user as StudentUser) : undefined;
  const nestedClassGroup =
    student.classGroup && typeof student.classGroup === "object"
      ? (student.classGroup as StudentClassGroup)
      : undefined;

  const user = nestedUser ?? {
    name: typeof student.name === "string" ? student.name : undefined,
    email: typeof student.email === "string" ? student.email : undefined,
  };

  const className =
    typeof student.className === "string"
      ? student.className
      : nestedClassGroup?.name ?? null;

  return {
    id: String(student.id ?? ""),
    enrollmentNo: typeof student.enrollmentNo === "string" ? student.enrollmentNo : null,
    rollNo: typeof student.rollNo === "string" ? student.rollNo : null,
    className,
    classGroupId: typeof student.classGroupId === "number" ? student.classGroupId : null,
    user,
    classGroup: nestedClassGroup ?? (className ? { name: className } : null),
  };
}

interface Department {
  id: number;
  code: string;
  name: string;
}

interface ClassGroup {
  id: number;
  name: string;
  year: number;
  departmentId: number;
  specializationId: number | null;
}

interface Specialization {
  id: number;
  name: string;
  departmentId: number;
}

const YEARS = [1, 2, 3, 4];
const EMPTY_CLASS_GROUPS: ClassGroup[] = [];

interface Subject {
  id: string;
  code: string;
  name: string;
}

type AttendanceStatus = "PRESENT" | "ABSENT";

interface MonthlyReportRow {
  studentId: number;
  enrollmentNo: string;
  name: string;
  totalClasses: number;
  present: number;
  absent: number;
  attendancePercentage: string;
}

interface DailyAttendanceResponse {
  statuses: Record<string, AttendanceStatus>;
}

function Attendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = getUserRole();
  const isFacultyView = role === "FACULTY" || role === "ADMIN";
  const isDeptAdmin = role === "DEPT_ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();

  const linkedClassId = Number(searchParams.get("classId"));
  const linkedSubjectId = searchParams.get("subjectId");
  const hasLinkedSession =
    Number.isInteger(linkedClassId) && linkedClassId > 0 && !!linkedSubjectId;

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedDepartmentId] = useState<number | null>(() => getSelectedDepartmentId());
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSpecializationId, setSelectedSpecializationId] = useState<number | null>(null);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  // Local drafted attendance for the day: studentId -> status
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [exportingMonthly, setExportingMonthly] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const activeClassGroupId = hasLinkedSession ? linkedClassId : selectedClassGroupId;
  const activeSubjectId = hasLinkedSession ? linkedSubjectId ?? "" : selectedSubjectId;

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", "attendance", activeClassGroupId],
    queryFn: async (): Promise<Student[]> => {
      if (activeClassGroupId === null) return [];
      const response = await api.get("/students", {
        params: { classGroupId: activeClassGroupId },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload.map(normalizeStudent);
      if (Array.isArray(payload?.data)) return payload.data.map(normalizeStudent);
      return [] as Student[];
    },
    enabled: activeClassGroupId !== null,
  });

  const { data: dailyAttendanceData } = useQuery({
    queryKey: ["attendance", "daily", activeClassGroupId, activeSubjectId, selectedDate],
    queryFn: async (): Promise<Record<string, AttendanceStatus>> => {
      if (activeClassGroupId === null || !activeSubjectId) return {};
      const response = await api.get<DailyAttendanceResponse>("/attendance/day", {
        params: { subjectId: activeSubjectId, date: selectedDate },
      });
      return response.data?.statuses ?? {};
    },
    enabled: activeClassGroupId !== null && !!activeSubjectId,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await api.get("/subjects");
      const payload = response.data;
      if (Array.isArray(payload)) return payload as Subject[];
      if (Array.isArray(payload?.data)) return payload.data as Subject[];
      return [] as Subject[];
    },
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<Department[]> => {
      const response = await api.get("/students/departments");
      return Array.isArray(response.data) ? (response.data as Department[]) : [];
    },
  });

  const classGroupSpecializationParam =
    selectedYear !== null && selectedYear <= 2
      ? "null"
      : selectedSpecializationId ?? undefined;

  const { data: classGroupsData } = useQuery({
    queryKey: [
      "classGroups",
      selectedDepartmentId,
      selectedYear,
      classGroupSpecializationParam,
    ],
    queryFn: async (): Promise<ClassGroup[]> => {
      if (selectedYear === null) return [];
      if (!isDeptAdmin && selectedDepartmentId === null) return [];

      const params: Record<string, string | number> = { year: selectedYear };
      if (!isDeptAdmin && selectedDepartmentId !== null) {
        params.departmentId = selectedDepartmentId;
      }
      if (classGroupSpecializationParam !== undefined) {
        params.specializationId = classGroupSpecializationParam;
      }

      const response = await api.get("/students/class-groups", { params });
      const payload = response.data;
      if (Array.isArray(payload)) return payload as ClassGroup[];
      if (Array.isArray(payload?.data)) return payload.data as ClassGroup[];
      return [];
    },
    enabled:
      selectedYear !== null &&
      (isDeptAdmin || selectedDepartmentId !== null) &&
      (selectedYear <= 2 || selectedSpecializationId !== null),
  });

  const { data: specializationsData } = useQuery({
    queryKey: ["specializations", selectedDepartmentId],
    queryFn: async (): Promise<Specialization[]> => {
      const response = await api.get("/students/specializations", {
        params: { departmentId: selectedDepartmentId },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload as Specialization[];
      if (Array.isArray(payload?.data)) return payload.data as Specialization[];
      return [];
    },
    enabled: selectedDepartmentId !== null || isDeptAdmin,
  });

  const students = studentsData ?? [];
  const subjects = subjectsData ?? [];
  const departments = departmentsData ?? [];
  const classGroups = classGroupsData ?? EMPTY_CLASS_GROUPS;
  const specializations = specializationsData ?? [];
  const savedStatuses = dailyAttendanceData ?? {};
  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId) ?? null;

  const availableClassGroups = useMemo(
    () =>
      classGroups
        .filter((classGroup) => {
          if (selectedYear === null || classGroup.year !== selectedYear) return false;
          if (selectedYear <= 2) return classGroup.specializationId == null;
          return (
            selectedSpecializationId !== null &&
            classGroup.specializationId === selectedSpecializationId
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [classGroups, selectedYear, selectedSpecializationId]
  );

  const visibleStudents =
    activeClassGroupId !== null
      ? students.filter((student) => student.classGroupId === activeClassGroupId)
      : students;

  const handleYearChange = (value: string) => {
    const year = value ? Number(value) : null;
    setSelectedYear(year);
    setSelectedSpecializationId(null);
    setSelectedClassGroupId(null);
  };

  const handleSpecializationChange = (value: string) => {
    setSelectedSpecializationId(value ? Number(value) : null);
    setSelectedClassGroupId(null);
  };

  const clearLinkedSession = () => {
    setSearchParams({}, { replace: true });
    setSelectedClassGroupId(null);
    setSelectedSubjectId("");
  };

  // Default to the first subject once loaded so the batch payload always has one.
  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(String(subjects[0].id));
    }
  }, [subjects, selectedSubjectId]);

  // Reset the draft when the date/subject/class context changes.
  useEffect(() => {
    setDraft({});
  }, [selectedDate, activeSubjectId, activeClassGroupId]);

  const markStatus = (studentId: string, status: AttendanceStatus) => {
    setDraft((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    const records = Object.entries(draft).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    if (!activeSubjectId) {
      toast({
        title: "Select a subject",
        description: "Choose a subject before saving attendance.",
        variant: "destructive",
      });
      return;
    }

    if (records.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Mark at least one student Present or Absent first.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post("/attendance/batch", {
        date: selectedDate,
        subjectId: activeSubjectId,
        records,
      });
      toast({
        title: "Attendance saved",
        description: `Saved ${records.length} record(s) for ${selectedDate}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "daily"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch (error) {
      console.error("Failed to save batch attendance:", error);
      toast({
        title: "Error saving attendance",
        description: "Check the browser console for details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportToExcel = () => {
    const data = visibleStudents.map((student) => ({
      "Student Name": student.user?.name || "Unknown",
      "Enrollment No": student.enrollmentNo || "-",
      Date: selectedDate,
      Status: draft[student.id] ?? "NOT_MARKED",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "Attendance_Report.xlsx");
  };

  const handleExportMonthlyReport = async () => {
    if (!activeSubjectId) {
      toast({ title: "Select a subject", description: "Choose a subject before exporting the monthly report.", variant: "destructive" });
      return;
    }
    if (!selectedMonth) {
      toast({ title: "Select a month", description: "Choose a month before exporting the monthly report.", variant: "destructive" });
      return;
    }
    setExportingMonthly(true);
    try {
      const response = await api.get<MonthlyReportRow[]>("/attendance/monthly-report", {
        params: { subjectId: activeSubjectId, month: selectedMonth },
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      const data = rows.map((row) => ({
        "Enrollment No": row.enrollmentNo, "Name": row.name, "Total Classes": row.totalClasses,
        "Present": row.present, "Absent": row.absent, "Attendance %": row.attendancePercentage,
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Report");
      XLSX.writeFile(workbook, `Attendance_Report_${selectedMonth}.xlsx`);
      toast({ title: "Monthly report exported", description: `Exported ${rows.length} record(s) for ${selectedMonth}.` });
    } catch (error) {
      console.error("Failed to export monthly attendance report:", error);
      toast({ title: "Error exporting report", description: "Check the browser console for details.", variant: "destructive" });
    } finally {
      setExportingMonthly(false);
    }
  };

  const handleNotifyParents = async () => {
    if (!activeClassGroupId) {
      toast({ title: "Select a class", description: "Choose a class to notify parents for absent students.", variant: "destructive" });
      return;
    }
    setNotifying(true);
    try {
      const res = await api.post("/attendance/notify-parents", {
        classGroupId: activeClassGroupId,
        subjectId: activeSubjectId || undefined,
        date: selectedDate,
      });
      const d = res.data ?? {};
      toast({ title: "Parent notifications sent", description: `Notified: ${d.notified ?? 0}, Skipped: ${d.skipped ?? 0}.` });
    } catch (error) {
      console.error("Failed to notify parents:", error);
      toast({ title: "Notification failed", description: "Could not dispatch parent emails.", variant: "destructive" });
    } finally {
      setNotifying(false);
    }
  };

  if (!isFacultyView && !isDeptAdmin) {
    return (
      <div className="p-8 max-w-7xl w-full mx-auto">
        <p className="text-sm text-slate-600">
          You do not have permission to access this resource.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-slate-500 font-medium">CampusIQ / Attendance</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Daily Attendance</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isFacultyView ? "Faculty View" : "Department Admin View — Read Only"}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select month for monthly report"
              className="px-4 h-10 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            />
            {isFacultyView && (
              <Button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white"
              >
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            )}
            <Button
              onClick={handleExportMonthlyReport}
              disabled={exportingMonthly}
              variant="outline"
              className="h-10 px-6"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exportingMonthly ? "Exporting..." : "Export Monthly Report"}
            </Button>
            {isFacultyView && (
              <Button onClick={handleNotifyParents} disabled={notifying} variant="outline" className="h-10 px-4 border-amber-300 text-amber-700 hover:bg-amber-50">
                <BellRing className="h-4 w-4 mr-1" />
                {notifying ? "Notifying..." : "Notify Parents"}
              </Button>
            )}
            <Button onClick={handleExportToExcel} variant="outline" className="h-10 px-6">
              Export Daily (Excel)
            </Button>
          </div>
        </header>

        {hasLinkedSession && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Quick session from My Day
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {subjects.find((subject) => String(subject.id) === activeSubjectId)?.name ?? `Subject #${activeSubjectId}`}
                  {" · "}
                  {visibleStudents[0]?.className ?? `Class #${activeClassGroupId}`}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={clearLinkedSession}>
              Change filters
            </Button>
          </div>
        )}

        {!hasLinkedSession && (
        <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tracking</p>
            <p className="text-sm font-semibold text-slate-900">Mark Attendance</p>
          </div>
          <div className="flex gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Department
              </label>
              <div className="h-10 px-3 flex items-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 min-w-28">
                {isDeptAdmin ? "Your Department" : selectedDepartment?.code ?? "Not selected"}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Year
              </label>
              <select
                value={selectedYear ?? ""}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-32"
              >
                <option value="">All Years</option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>
            </div>
            {selectedYear !== null && selectedYear >= 3 && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Specialization
                </label>
                <select
                  value={selectedSpecializationId ?? ""}
                  onChange={(e) => handleSpecializationChange(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-48"
                >
                  <option value="">Select specialization</option>
                  {specializations.map((specialization) => (
                    <option key={specialization.id} value={specialization.id}>
                      {specialization.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedYear !== null &&
              (selectedYear <= 2 || selectedSpecializationId !== null) && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Class
                  </label>
                  <select
                    value={selectedClassGroupId ?? ""}
                    onChange={(e) =>
                      setSelectedClassGroupId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-40"
                  >
                    <option value="" disabled>
                      Select Class
                    </option>
                    {availableClassGroups.map((classGroup) => (
                      <option key={classGroup.id} value={classGroup.id}>
                        {classGroup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-40"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.code} — {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
        )}
        {!hasLinkedSession && !isDeptAdmin && !selectedDepartmentId && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            Select CSE or IT from the Dashboard to enable department, year, and class filters.
          </p>
        )}

        {activeClassGroupId === null ? (
          <div className="p-8 text-center text-gray-500">
            Please select a specific class (e.g., SOC - 1, AIA - 9) to view students.
          </div>
        ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[60vh]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow className="h-8 hover:bg-slate-50">
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Roll No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Enrollment No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Name</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Status</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={5} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">Loading students...</TableCell>
                </TableRow>
              ) : visibleStudents.length === 0 ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={5} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">No students found.</TableCell>
                </TableRow>
              ) : (
                visibleStudents?.map((student: any) => {
                  const current = draft[student?.id] ?? savedStatuses[student?.id];
                  return (
                    <TableRow
                      key={student?.id}
                      className={`h-8 ${
                        current === "PRESENT"
                          ? "bg-emerald-50/50 hover:bg-emerald-100/60"
                          : current === "ABSENT"
                            ? "bg-rose-50/50 hover:bg-rose-100/60"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.rollNo || "-"}</TableCell>
                      <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap"><span className="font-semibold text-slate-900">{student?.enrollmentNo || "-"}</span></TableCell>
                      <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.user?.name || student?.name || "Unknown"}</TableCell>
                      <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">
                        {current === "PRESENT" ? (
                          <span className="inline-flex bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-0.5 rounded-full">
                            Present
                          </span>
                        ) : current === "ABSENT" ? (
                          <span className="inline-flex bg-rose-100 text-rose-800 border border-rose-300 font-semibold px-2.5 py-0.5 rounded-full">
                            Absent
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                            Not marked
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markStatus(student?.id, "PRESENT")}
                            disabled={!isFacultyView}
                            className={`h-6 w-6 p-0 text-xs ${current === "PRESENT" ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-emerald-600" : ""}`}
                          >
                            P
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markStatus(student?.id, "ABSENT")}
                            disabled={!isFacultyView}
                            className={`h-6 w-6 p-0 text-xs ${current === "ABSENT" ? "bg-rose-600 text-white hover:bg-rose-700 hover:text-white border-rose-600" : ""}`}
                          >
                            A
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </div>
    </>
  );
}

export default Attendance;
