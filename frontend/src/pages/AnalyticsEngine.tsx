import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import DeptAdminPredictionDashboard from "../components/DeptAdminPredictionDashboard";
import { Button } from "@/components/ui/button";
import { getUserRole } from "../utils/auth";
import FilterHierarchy, { type HierarchyFilters } from "../components/FilterHierarchy";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SubjectOption {
  id: number;
  name: string;
  code: string;
}

interface BarDatum {
  subject: string;
  atRiskCount: number;
  totalStudents: number;
}

interface LineDatum {
  timeline: string;
  averageRiskProbability: number;
}

interface ScatterDatum {
  studentId: number;
  studentName: string;
  className: string;
  attendance: number;
  finalCaMarks: number;
  riskProbability: number;
  isAtRisk: boolean;
}

interface PredictionResponse {
  filters: { subjects: SubjectOption[] };
  summary: {
    studentsAnalyzed: number;
    atRiskCount: number;
    averageRiskProbability: number;
  };
  charts: {
    bar: BarDatum[];
    line: LineDatum[];
    scatter: ScatterDatum[];
  };
}

type ChartType = "bar" | "line" | "scatter";

const EMPTY_PREDICTIONS: PredictionResponse = {
  filters: { subjects: [] },
  summary: {
    studentsAnalyzed: 0,
    atRiskCount: 0,
    averageRiskProbability: 0,
  },
  charts: { bar: [], line: [], scatter: [] },
};

function AnalyticsEngine() {
  const role = getUserRole();
  const [filters, setFilters] = useState<HierarchyFilters>({
    year: "",
    classGroupId: "",
    specializationId: "",
    subjectId: "",
  });
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [predictions, setPredictions] = useState<PredictionResponse>(EMPTY_PREDICTIONS);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const handleFiltersChange = useCallback((next: HierarchyFilters) => {
    setFilters(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPredictions = async () => {
      if (role === "DEPT_ADMIN") {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      setNotice("");
      try {
        const token = localStorage.getItem("campusiq_token");
        if (!token) {
          if (!cancelled) {
            setPredictions(EMPTY_PREDICTIONS);
            setNotice("Please log in again to load prediction data.");
          }
          return;
        }

        const params: Record<string, string> = {};
        if (filters.classGroupId) params.classGroupId = filters.classGroupId;
        if (filters.subjectId) params.subjectId = filters.subjectId;

        const response = await api.get("/analytics/predictions", {
          params,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        const payload = response.data;
        const next: PredictionResponse =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? {
                filters: {
                  subjects: Array.isArray(payload.filters?.subjects)
                    ? payload.filters.subjects
                    : [],
                },
                summary: {
                  studentsAnalyzed: Number(payload.summary?.studentsAnalyzed ?? 0),
                  atRiskCount: Number(payload.summary?.atRiskCount ?? 0),
                  averageRiskProbability: Number(payload.summary?.averageRiskProbability ?? 0),
                },
                charts: {
                  bar: Array.isArray(payload.charts?.bar) ? payload.charts.bar : [],
                  line: Array.isArray(payload.charts?.line) ? payload.charts.line : [],
                  scatter: Array.isArray(payload.charts?.scatter) ? payload.charts.scatter : [],
                },
              }
            : EMPTY_PREDICTIONS;

        if (!cancelled) setPredictions(next);
      } catch (loadError) {
        console.error("Failed to load predictions:", loadError);
        if (!cancelled) {
          setPredictions(EMPTY_PREDICTIONS);
          setNotice("No prediction data available for the selected filters.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPredictions();
    return () => {
      cancelled = true;
    };
  }, [filters.classGroupId, filters.subjectId, role]);

  const charts = predictions?.charts;
  const summary = predictions?.summary ?? {
    studentsAnalyzed: 0,
    atRiskCount: 0,
    averageRiskProbability: 0,
  };

  const exportCSV = () => {
    const rows = (charts?.scatter ?? []).map((student) => [
      student.studentName,
      student.className,
      student.attendance,
      student.finalCaMarks,
      student.riskProbability,
      student.isAtRisk ? "AT_RISK" : "LOW_RISK",
    ]);
    const csv = [
      ["Student", "Class", "Attendance %", "Final CA Marks", "Risk Probability", "Status"],
      ...rows,
    ]
      .map((row) => row.join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "analytics-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    switch (chartType) {
      case "line":
        return (
          <LineChart data={charts?.line ?? []} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timeline" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="averageRiskProbability"
              name="Avg Risk Probability"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        );
      case "scatter":
        return (
          <ScatterChart margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="attendance"
              name="Attendance"
              unit="%"
              domain={[0, 100]}
            />
            <YAxis
              type="number"
              dataKey="finalCaMarks"
              name="Final CA Marks"
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            <Scatter name="Students" data={charts?.scatter ?? []}>
              {(charts?.scatter ?? []).map((student) => (
                <Cell key={student.studentId} fill={student.isAtRisk ? "#f43f5e" : "#10b981"} />
              ))}
            </Scatter>
          </ScatterChart>
        );
      default:
        return (
          <BarChart data={charts?.bar ?? []} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="atRiskCount" name="At-Risk Students" fill="#f43f5e" />
          </BarChart>
        );
    }
  };

  if (role === "DEPT_ADMIN") {
    return <DeptAdminPredictionDashboard />;
  }

  return (
    <div className="p-4 space-y-4">
      <FilterHierarchy value={filters} onChange={handleFiltersChange} />

      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
        <select
          value={chartType}
          onChange={(event) => setChartType(event.target.value as ChartType)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="bar">Bar Chart</option>
          <option value="line">Line Chart</option>
          <option value="scatter">Scatter Plot</option>
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>Export to CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Download PDF Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Students Analyzed</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.studentsAnalyzed}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-rose-600">At-Risk Students</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{summary.atRiskCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Average Risk Probability</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{summary.averageRiskProbability}%</div>
        </div>
      </div>

      {notice && <div role="status" className="text-sm text-amber-700">{notice}</div>}
      {loading && <div className="text-sm text-slate-500">Loading prediction data...</div>}

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2 text-slate-900">
          {chartType === "bar"
            ? "At-Risk Students by Subject"
            : chartType === "line"
              ? "Average Predicted Risk Over Time"
              : "Attendance vs Final CA Marks"}
        </h3>
        <ResponsiveContainer width="100%" height={360}>
          {renderChart()}
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-2">
          {chartType === "scatter" ? "Red = High Risk, Green = Low Risk" : "Filtered by class and subject"}
        </p>
      </div>
    </div>
  );
}

export default AnalyticsEngine;
