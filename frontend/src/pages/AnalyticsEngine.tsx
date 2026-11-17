import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { Button } from "@/components/ui/button";
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

function AnalyticsEngine() {
  const [filters, setFilters] = useState<HierarchyFilters>({
    year: "",
    classGroupId: "",
    specializationId: "",
    subjectId: "",
  });
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFiltersChange = useCallback((next: HierarchyFilters) => {
    setFilters(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPredictions = async () => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string> = {};
        if (filters.classGroupId) params.classGroupId = filters.classGroupId;
        if (filters.subjectId) params.subjectId = filters.subjectId;

        const response = await api.get("/analytics/predictions", { params });
        if (!cancelled) setPredictions(response.data);
      } catch (loadError) {
        console.error("Failed to load predictions:", loadError);
        if (!cancelled) setError("Failed to load prediction data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPredictions();
    return () => {
      cancelled = true;
    };
  }, [filters.classGroupId, filters.subjectId]);

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

      {error && <div className="text-sm text-rose-600">{error}</div>}
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
