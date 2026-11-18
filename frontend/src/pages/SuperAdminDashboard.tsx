import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BrainCircuit, TrendingDown, Users } from "lucide-react";
import api from "../services/api";
import {
  bottomPercent,
  buildClassGroupLookup,
  formatPercentage,
  resolveAcademicContext,
  type ClassGroupLookup,
  type ClassGroupLookupSource,
  type PredictionStudentDatum,
} from "../utils/analytics";

interface PredictionsResponse {
  summary?: {
    studentsAnalyzed: number;
    atRiskCount: number;
    averageRiskProbability: number;
  };
  charts?: {
    scatter?: PredictionStudentDatum[];
  };
}

interface AlertCardProps {
  title: string;
  description: string;
  metric: "attendance" | "finalCaMarks";
  metricLabel: string;
  students: PredictionStudentDatum[];
  lookup: ClassGroupLookup;
  tone: "rose" | "amber";
}

function AlertCard({
  title,
  description,
  metric,
  metricLabel,
  students,
  lookup,
  tone,
}: AlertCardProps) {
  const toneClasses =
    tone === "rose"
      ? {
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          icon: "bg-rose-100 text-rose-600",
          bar: "bg-rose-500",
        }
      : {
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          icon: "bg-amber-100 text-amber-600",
          bar: "bg-amber-500",
        };

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${toneClasses.icon}`}>
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>
        <div className={`mt-4 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses.badge}`}>
          Bottom 5% · {students.length} student{students.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {students.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No student records available yet.</p>
        ) : (
          students.map((student, index) => {
            const context = resolveAcademicContext(student, lookup);
            const value = student[metric];
            return (
              <div key={student.studentId} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                <span className="w-6 shrink-0 text-[11px] font-semibold text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {student.studentName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {student.enrollmentNo ? `${student.enrollmentNo} · ` : ""}
                    {student.className || "Unassigned class"} ·{" "}
                    {context.year != null ? `Year ${context.year}` : "Unknown year"} ·{" "}
                    {context.specialization}
                  </p>
                </div>
                <div className="w-24 shrink-0 text-right">
                  <p className="text-xs font-semibold text-slate-700">{metricLabel}</p>
                  <p className="text-sm font-bold text-slate-900">{formatPercentage(value)}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${toneClasses.bar}`}
                      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function SuperAdminDashboard() {
  const predictionsQuery = useQuery({
    queryKey: ["superadmin", "macro-predictions"],
    queryFn: async () => {
      const response = await api.get("/analytics/predictions");
      return response.data as PredictionsResponse;
    },
  });

  const classGroupsQuery = useQuery({
    queryKey: ["superadmin", "class-groups"],
    queryFn: async () => {
      const response = await api.get("/students/class-groups");
      return Array.isArray(response.data) ? (response.data as ClassGroupLookupSource[]) : [];
    },
  });

  const students = useMemo(
    () => predictionsQuery.data?.charts?.scatter ?? [],
    [predictionsQuery.data]
  );
  const lookup = useMemo(
    () => buildClassGroupLookup(classGroupsQuery.data ?? []),
    [classGroupsQuery.data]
  );

  const attendanceAlerts = useMemo(
    () => bottomPercent(students, (student) => student.attendance),
    [students]
  );

  const marksAlerts = useMemo(
    () => bottomPercent(students, (student) => student.finalCaMarks),
    [students]
  );

  const atRiskCount =
    predictionsQuery.data?.summary?.atRiskCount ??
    students.filter((student) => student.isAtRisk).length;
  const averageRisk =
    predictionsQuery.data?.summary?.averageRiskProbability ??
    (students.length > 0
      ? Math.round(
          (students.reduce((sum, student) => sum + student.riskProbability, 0) / students.length) *
            10
        ) / 10
      : 0);

  const alertsLoading = predictionsQuery.isLoading || classGroupsQuery.isLoading;
  const summaryCards = [
    {
      label: "Institution Students",
      value: students.length.toLocaleString(),
      description: "University-wide enrollment",
      icon: Users,
      color: "bg-indigo-600",
    },
    {
      label: "High-Risk Students",
      value: atRiskCount.toLocaleString(),
      description: "CatBoost at-risk flag",
      icon: AlertTriangle,
      color: "bg-rose-600",
    },
    {
      label: "Average Risk Probability",
      value: formatPercentage(averageRisk),
      description: "Across the full student body",
      icon: BrainCircuit,
      color: "bg-violet-600",
    },
    {
      label: "Macro Alerts",
      value: (attendanceAlerts.length + marksAlerts.length).toLocaleString(),
      description: "Bottom-5% attendance & CA records",
      icon: TrendingDown,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">CampusIQ / Superadmin</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Institution Macro Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            University-wide academic oversight, risk intelligence, and intervention alerts.
          </p>
        </div>
        <Link
          to="/ai-predictions"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <BrainCircuit className="h-4 w-4" />
          Open AI Prediction Dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, description, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-5"
          >
            <div className={`h-10 w-10 rounded-lg ${color} text-white flex items-center justify-center mb-4`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
        ))}
      </div>

      {predictionsQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load university-wide prediction data. Please refresh the dashboard.
        </div>
      )}

      {alertsLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading bottom-5% intervention alerts...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AlertCard
            title="Lowest Attendance Alerts"
            description="Students in the bottom 5% for university-wide attendance."
            metric="attendance"
            metricLabel="Attendance"
            students={attendanceAlerts}
            lookup={lookup}
            tone="rose"
          />
          <AlertCard
            title="Lowest CA Marks Alerts"
            description="Students in the bottom 5% for continuous assessment marks."
            metric="finalCaMarks"
            metricLabel="CA Marks"
            students={marksAlerts}
            lookup={lookup}
            tone="amber"
          />
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;
