import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface Subject {
  id: string | number;
  code: string;
  name: string;
}

interface SubjectAnalyticsPoint {
  examType: string;
  label: string;
  averageScore: number;
  count: number;
}

interface SubjectAnalyticsResponse {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  data: SubjectAnalyticsPoint[];
}

interface ChartDatum {
  name: string;
  examType: string;
  averageScore: number;
  count: number;
}

type GraphType = "bar" | "line" | "area";

const GRAPH_TYPE_OPTIONS: { value: GraphType; label: string }[] = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "area", label: "Area Chart" },
];

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload !== null &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function PerformanceAnalytics() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [graphType, setGraphType] = useState<GraphType>("bar");

  const { data: subjectsData, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await api.get("/subjects");
      return normalizeList<Subject>(response.data);
    },
  });

  const subjects = subjectsData ?? [];

  useEffect(() => {
    if (!selectedSubjectId && subjectsData && subjectsData.length > 0) {
      setSelectedSubjectId(String(subjectsData[0].id));
    }
  }, [subjectsData, selectedSubjectId]);

  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    isError,
  } = useQuery({
    queryKey: ["subjectPerformance", selectedSubjectId],
    queryFn: async () => {
      const response = await api.get<SubjectAnalyticsResponse>(
        `/marks/subject/${selectedSubjectId}`
      );
      const points = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      const chartData: ChartDatum[] = points.map((point) => ({
        name: point.label ?? point.examType,
        examType: point.examType,
        averageScore: point.averageScore,
        count: point.count,
      }));
      return {
        meta: {
          subjectCode: response.data?.subjectCode ?? "",
          subjectName: response.data?.subjectName ?? "",
        },
        chartData,
      };
    },
    enabled: selectedSubjectId !== "",
  });

  const chartData = analyticsData?.chartData ?? [];
  const hasData = chartData.some((d) => d.count > 0);

  const renderChart = () => {
    const axisProps = {
      tick: { fontSize: 12 },
      stroke: "#64748b",
    } as const;

    switch (graphType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 0, left: -12 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip formatter={(value) => [`${value}%`, "Avg Score"]} />
              <Line
                type="monotone"
                dataKey="averageScore"
                name="Avg Score (%)"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 0, left: -12 }}
            >
              <defs>
                <linearGradient id="subjectAvgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip formatter={(value) => [`${value}%`, "Avg Score"]} />
              <Area
                type="monotone"
                dataKey="averageScore"
                name="Avg Score (%)"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#subjectAvgGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "bar":
      default:
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 0, left: -12 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip formatter={(value) => [`${value}%`, "Avg Score"]} />
              <Bar
                dataKey="averageScore"
                name="Avg Score (%)"
                fill="#4f46e5"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Performance Analytics
              </CardTitle>
              <CardDescription>
                {analyticsData?.meta.subjectCode
                  ? `${analyticsData.meta.subjectCode} — ${analyticsData.meta.subjectName}`
                  : "Slice subject performance by exam type"}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Select Subject
              </label>
              <Select
                value={selectedSubjectId}
                onValueChange={(value) => setSelectedSubjectId(value as string)}
                disabled={isSubjectsLoading || subjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem
                      key={String(subject.id)}
                      value={String(subject.id)}
                    >
                      {subject.code} — {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Graph Type
              </label>
              <Select
                value={graphType}
                onValueChange={(value) => setGraphType(value as GraphType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select graph type" />
                </SelectTrigger>
                <SelectContent>
                  {GRAPH_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyticsLoading ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-slate-500">
            Loading subject performance…
          </div>
        ) : isError ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-rose-600">
            Failed to load performance data for this subject.
          </div>
        ) : !selectedSubjectId ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-slate-500">
            Select a subject to view performance analytics.
          </div>
        ) : !hasData ? (
          <div className="flex h-[350px] items-center justify-center text-sm text-slate-500">
            No marks recorded for this subject yet.
          </div>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  );
}

export default PerformanceAnalytics;
