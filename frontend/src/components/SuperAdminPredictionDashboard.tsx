import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BrainCircuit, ShieldAlert, Users } from "lucide-react";
import api from "../services/api";
import {
  buildClassGroupLookup,
  formatPercentage,
  groupPredictionsByYearAndSpecialization,
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
  charts?: {
    scatter?: PredictionStudentDatum[];
  };
}

function SuperAdminPredictionDashboard() {
  const predictionsQuery = useQuery({
    queryKey: ["superadmin", "prediction-macro"],
    queryFn: async () => {
      const response = await api.get("/analytics/predictions");
      return response.data as PredictionsResponse;
    },
  });

  const classGroupsQuery = useQuery({
    queryKey: ["superadmin", "prediction-class-groups"],
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

  const groups = useMemo(
    () => groupPredictionsByYearAndSpecialization(students, lookup),
    [students, lookup]
  );

  const highRiskStudents = useMemo(
    () =>
      students
        .filter((student) => student.isAtRisk)
        .sort((a, b) => b.riskProbability - a.riskProbability),
    [students]
  );

  const atRiskCount =
    predictionsQuery.data?.summary?.atRiskCount ?? highRiskStudents.length;
  const averageRisk =
    predictionsQuery.data?.summary?.averageRiskProbability ??
    (students.length > 0
      ? Math.round(
          (students.reduce((sum, student) => sum + student.riskProbability, 0) / students.length) *
            10
        ) / 10
      : 0);

  const isLoading = predictionsQuery.isLoading || classGroupsQuery.isLoading;

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">
            CampusIQ / Artificial Intelligence / Institutional View
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Performance Prediction
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Macro-level CatBoost risk analysis grouped by academic year and specialization.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          <BrainCircuit className="h-3.5 w-3.5" />
          Superadmin macro view
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Students Analyzed
            </p>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {students.length.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              High-Risk Students
            </p>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">
            {atRiskCount.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Average Risk Probability
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatPercentage(averageRisk)}
          </p>
        </div>
      </div>

      {predictionsQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load university-wide prediction data. Please refresh the page.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading macro risk analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="font-bold text-slate-900">
                Risk Distribution by Year & Specialization
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Total students versus students flagged at risk by CatBoost.
              </p>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groups} margin={{ top: 8, right: 8, bottom: 48, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="totalStudents" name="Total students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atRiskStudents" name="At-risk students" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="font-bold text-slate-900">
                Average Risk Probability by Group
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Mean CatBoost risk score for each year and specialization cohort.
              </p>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groups} margin={{ top: 8, right: 8, bottom: 48, left: 0 }}>
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
                    <Tooltip formatter={(value) => [`${value}%`, "Average risk"]} />
                    <Bar dataKey="averageRiskProbability" name="Average risk" radius={[4, 4, 0, 0]}>
                      {groups.map((group) => (
                        <Cell
                          key={group.key}
                          fill={
                            group.averageRiskProbability >= 60
                              ? "#e11d48"
                              : group.averageRiskProbability >= 35
                                ? "#f59e0b"
                                : "#10b981"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">High-Risk Student Roster</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Every student currently flagged at risk across the university, ordered by risk
                  probability.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                {highRiskStudents.length} at risk
              </span>
            </div>

            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Enrollment</th>
                    <th className="px-4 py-3 font-semibold">Year</th>
                    <th className="px-4 py-3 font-semibold">Specialization</th>
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 text-right font-semibold">Attendance</th>
                    <th className="px-4 py-3 text-right font-semibold">CA Marks</th>
                    <th className="px-4 py-3 text-right font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {highRiskStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No students are currently flagged at risk.
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
                          <td className="px-4 py-3 text-slate-600">
                            {student.enrollmentNo ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {context.year != null ? `Year ${context.year}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{context.specialization}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {student.className || "—"}
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
    </div>
  );
}

export default SuperAdminPredictionDashboard;
