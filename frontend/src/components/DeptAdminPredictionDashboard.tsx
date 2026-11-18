import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import api from "../services/api";
import {
  buildClassGroupLookup,
  formatPercentage,
  groupPredictionsByHierarchy,
  resolveAcademicContext,
  type ClassGroupLookupSource,
  type PredictionStudentDatum,
} from "../utils/analytics";

interface PredictionsResponse {
  summary?: {
    studentsAnalyzed: number;
    atRiskCount: number;
    averageRiskProbability: number;
  };
  charts?: { scatter?: PredictionStudentDatum[] };
  highRiskStudents?: PredictionStudentDatum[];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function DeptAdminPredictionDashboard() {
  const predictionsQuery = useQuery({
    queryKey: ["dept-admin", "predictions"],
    queryFn: async () => {
      const response = await api.get<PredictionsResponse>("/analytics/predictions");
      return response.data;
    },
  });

  const classGroupsQuery = useQuery({
    queryKey: ["dept-admin", "class-groups"],
    queryFn: async (): Promise<ClassGroupLookupSource[]> => {
      const response = await api.get("/students/class-groups");
      return Array.isArray(response.data) ? (response.data as ClassGroupLookupSource[]) : [];
    },
  });

  const [yearFilter, setYearFilter] = useState<string>("all");
  const [specializationFilter, setSpecializationFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(() => new Set());
  const [selectedStudent, setSelectedStudent] = useState<PredictionStudentDatum | null>(null);

  const students = useMemo(
    () => predictionsQuery.data?.charts?.scatter ?? [],
    [predictionsQuery.data]
  );
  const lookup = useMemo(
    () => buildClassGroupLookup(classGroupsQuery.data ?? []),
    [classGroupsQuery.data]
  );
  const hierarchy = useMemo(
    () => groupPredictionsByHierarchy(students, lookup),
    [students, lookup]
  );

  const yearOptions = useMemo(
    () => hierarchy.map((year) => ({ value: String(year.year ?? "unknown"), label: year.label })),
    [hierarchy]
  );

  const specializationOptions = useMemo(() => {
    const selectedYear = hierarchy.find(
      (year) => String(year.year ?? "unknown") === yearFilter
    );
    if (!selectedYear) return [];
    return selectedYear.specializations.map((specialization) => ({
      value: specialization.specialization,
      label: specialization.specialization,
    }));
  }, [hierarchy, yearFilter]);

  const classOptions = useMemo(() => {
    const selectedYear = hierarchy.find(
      (year) => String(year.year ?? "unknown") === yearFilter
    );
    if (!selectedYear) return [];
    const classes = selectedYear.specializations
      .filter(
        (specialization) =>
          yearFilter === "all" ||
          specialization.specialization === specializationFilter
      )
      .flatMap((specialization) => specialization.classes);
    return classes.map((classGroup) => ({
      value: classGroup.className,
      label: `${classGroup.className} · ${classGroup.students.length} student${
        classGroup.students.length === 1 ? "" : "s"
      }`,
    }));
  }, [hierarchy, yearFilter, specializationFilter]);

  const filteredClasses = useMemo(
    () =>
      hierarchy
        .filter((year) => yearFilter === "all" || String(year.year ?? "unknown") === yearFilter)
        .flatMap((year) => year.specializations)
        .filter(
          (specialization) =>
            specializationFilter === "all" ||
            specialization.specialization === specializationFilter
        )
        .flatMap((specialization) => specialization.classes)
        .filter((classGroup) => classFilter === "all" || classGroup.className === classFilter),
    [hierarchy, yearFilter, specializationFilter, classFilter]
  );

  const filteredStudents = useMemo(
    () => filteredClasses.flatMap((classGroup) => classGroup.students),
    [filteredClasses]
  );

  const highRiskStudents = useMemo(
    () =>
      filteredStudents
        .filter((student) => student.isAtRisk || student.is_at_risk)
        .sort((a, b) => b.riskProbability - a.riskProbability),
    [filteredStudents]
  );

  const classChartData = useMemo(
    () =>
      filteredClasses.map((classGroup) => ({
        label: classGroup.className,
        totalStudents: classGroup.totalStudents,
        atRiskStudents: classGroup.atRiskStudents,
        averageRiskProbability: classGroup.averageRiskProbability,
        averageAttendance: classGroup.averageAttendance,
        averageFinalCa: classGroup.averageFinalCa,
      })),
    [filteredClasses]
  );

  const summary = {
    students: filteredStudents.length,
    highRisk: highRiskStudents.length,
    averageRisk: average(filteredStudents.map((student) => student.riskProbability)),
    divisions: filteredClasses.length,
  };

  const handleYearChange = (value: string) => {
    setYearFilter(value);
    setSpecializationFilter("all");
    setClassFilter("all");
  };

  const handleSpecializationChange = (value: string) => {
    setSpecializationFilter(value);
    setClassFilter("all");
  };

  const toggleClass = (key: string) => {
    setExpandedClasses((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedShapValues = selectedStudent?.shapValues ?? [];
  const isLoading = predictionsQuery.isLoading || classGroupsQuery.isLoading;

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">
            CampusIQ / Department Admin / Predictions
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Department Performance & Risk Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Drill from year to specialization to individual divisions, then inspect what drives
            each flagged student&apos;s risk score.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          <BrainCircuit className="h-3.5 w-3.5" />
          CatBoost + SHAP · Department view
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Students Analyzed",
            value: summary.students.toLocaleString(),
            description: "In current drill-down",
            icon: Users,
            color: "bg-indigo-600",
          },
          {
            label: "Flagged High Risk",
            value: summary.highRisk.toLocaleString(),
            description: "CatBoost at-risk flag",
            icon: ShieldAlert,
            color: "bg-rose-600",
          },
          {
            label: "Average Risk Probability",
            value: formatPercentage(summary.averageRisk),
            description: "Across filtered students",
            icon: AlertTriangle,
            color: "bg-amber-500",
          },
          {
            label: "Divisions",
            value: summary.divisions.toLocaleString(),
            description: "Classes in scope",
            icon: BrainCircuit,
            color: "bg-violet-600",
          },
        ].map(({ label, value, description, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-white ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Year
            </label>
            <select
              value={yearFilter}
              onChange={(event) => handleYearChange(event.target.value)}
              className="min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All years</option>
              {yearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Specialization
            </label>
            <select
              value={specializationFilter}
              onChange={(event) => handleSpecializationChange(event.target.value)}
              className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All specializations</option>
              {specializationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Class / Division
            </label>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All divisions</option>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="ml-auto text-xs text-slate-500">
            {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"} in scope
          </p>
        </div>
      </section>

      {predictionsQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load department prediction data. Please refresh the page.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading department risk analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">At-Risk Students by Division</h2>
              <p className="mt-1 text-xs text-slate-500">
                Flagged students versus total enrollment for each class in scope.
              </p>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 8, right: 8, bottom: 48, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="totalStudents" name="Total students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atRiskStudents" name="At-risk students" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">Division Risk Profile</h2>
              <p className="mt-1 text-xs text-slate-500">
                Average CatBoost risk compared with attendance and aggregate CA performance.
              </p>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 8, right: 8, bottom: 48, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="#64748b"
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="averageRiskProbability" name="Avg risk" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="averageAttendance" name="Attendance" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="averageFinalCa" name="CA marks" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">Year → Specialization → Class Drill-Down</h2>
              <p className="mt-1 text-xs text-slate-500">
                Expand a division to inspect every student and open their SHAP explanation.
              </p>
            </div>
            <div className="max-h-[30rem] space-y-3 overflow-y-auto p-5">
              {filteredClasses.length === 0 ? (
                <p className="text-sm text-slate-500">No divisions match the selected filters.</p>
              ) : (
                filteredClasses.map((classGroup) => {
                  const isExpanded = expandedClasses.has(classGroup.key);
                  return (
                    <div key={classGroup.key} className="rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleClass(classGroup.key)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {classGroup.className}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            Year {classGroup.year ?? "—"} · {classGroup.specialization}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {classGroup.totalStudents} students
                        </span>
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                          {classGroup.atRiskStudents} at risk
                        </span>
                        <span className="w-16 text-right text-xs font-semibold text-slate-700">
                          {formatPercentage(classGroup.averageRiskProbability)}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-slate-100 px-4 py-3">
                          <table className="w-full min-w-[640px] text-left text-xs">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="py-2 font-semibold">Student</th>
                                <th className="py-2 font-semibold">Enrollment</th>
                                <th className="py-2 text-right font-semibold">Attendance</th>
                                <th className="py-2 text-right font-semibold">CA</th>
                                <th className="py-2 text-right font-semibold">Risk</th>
                                <th className="py-2 text-right font-semibold">SHAP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {classGroup.students.map((student) => (
                                <tr key={student.studentId}>
                                  <td className="py-2 font-medium text-slate-900">{student.studentName}</td>
                                  <td className="py-2 text-slate-600">{student.enrollmentNo ?? "—"}</td>
                                  <td className="py-2 text-right text-slate-700">
                                    {formatPercentage(student.attendance)}
                                  </td>
                                  <td className="py-2 text-right text-slate-700">
                                    {formatPercentage(student.finalCaMarks)}
                                  </td>
                                  <td className="py-2 text-right text-slate-700">
                                    {formatPercentage(student.riskProbability)}
                                  </td>
                                  <td className="py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedStudent(student)}
                                      className="rounded-md border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Flagged High-Risk Students (SHAP Explainability)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Feature attributions show which signals increase or reduce each student&apos;s
                  predicted risk.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                {highRiskStudents.length} flagged
              </span>
            </div>

            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student Name</th>
                    <th className="px-4 py-3 font-semibold">Enrollment No.</th>
                    <th className="px-4 py-3 font-semibold">Class / Specialization</th>
                    <th className="px-4 py-3 text-right font-semibold">Attendance %</th>
                    <th className="px-4 py-3 text-right font-semibold">Aggregate CA %</th>
                    <th className="px-4 py-3 text-right font-semibold">Risk Probability %</th>
                    <th className="px-4 py-3 text-right font-semibold">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {highRiskStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No students are currently flagged at risk in this scope.
                      </td>
                    </tr>
                  ) : (
                    highRiskStudents.map((student) => {
                      const context = resolveAcademicContext(student, lookup);
                      return (
                        <tr key={student.studentId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {student.studentName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{student.enrollmentNo ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {student.className || "—"} · {context.specialization}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatPercentage(student.attendance)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatPercentage(student.finalCaMarks)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                              {formatPercentage(student.riskProbability)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(student)}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
                            >
                              View SHAP Explanation
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="SHAP explanation"
            className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">SHAP Explanation</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedStudent.studentName} · {selectedStudent.enrollmentNo ?? "—"} ·{" "}
                  {selectedStudent.className || "Unassigned"} · Risk{" "}
                  {formatPercentage(selectedStudent.riskProbability)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedStudent(null)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 text-rose-700">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Increases risk
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Reduces risk
              </span>
            </div>

            {selectedShapValues.length === 0 ? (
              <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No feature attribution data is available for this student yet.
              </p>
            ) : (
              <>
                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={selectedShapValues.map((value) => ({
                        feature: value.feature,
                        value: value.value,
                        impact: value.impact,
                      }))}
                      layout="vertical"
                      margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        width={210}
                        tick={{ fontSize: 11 }}
                        stroke="#64748b"
                      />
                      <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                      <ReferenceLine x={0} stroke="#64748b" />
                      <Bar dataKey="value" name="Risk contribution" radius={[0, 4, 4, 0]}>
                        {selectedShapValues.map((value) => (
                          <Cell
                            key={value.feature}
                            fill={value.direction === "risk" ? "#ef4444" : "#10b981"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {selectedShapValues.map((value) => (
                    <div
                      key={value.feature}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-700">{value.feature}</span>
                      <span
                        className={
                          value.direction === "risk"
                            ? "font-semibold text-rose-600"
                            : "font-semibold text-emerald-600"
                        }
                      >
                        {value.impact} · {value.direction === "risk" ? "risk" : "safe"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DeptAdminPredictionDashboard;
