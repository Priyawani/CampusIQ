import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PerformanceAnalytics from "./PerformanceAnalytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CalendarCheck,
  Sparkles,
  Bot,
  Activity,
} from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  attendancePercentage: string;
  averagePerformance: string;
}

// Temporary mock data until /dashboard/stats returns time-series data
const attendanceTrend = [
  { month: "Jan", attendance: 92 },
  { month: "Feb", attendance: 88 },
  { month: "Mar", attendance: 90 },
  { month: "Apr", attendance: 85 },
  { month: "May", attendance: 89 },
  { month: "Jun", attendance: 93 },
];

function AdminDashboardView() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const response = await api.get("/dashboard/stats");
      return response.data as DashboardStats;
    },
  });

  return (
    <>
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
        <div>
          <p className="text-xs text-slate-500 font-medium">CampusIQ / Dashboard</p>
          <h1 className="text-lg font-bold text-slate-900">Dashboard Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
            PW
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-900 leading-tight">Priyadarshini Wani</p>
            <p className="text-[11px] text-slate-500">Administrator</p>
          </div>
        </div>
      </header>

      {/* Content Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-8 text-white shadow-md shadow-indigo-500/10 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Student Intelligence Platform
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back to CampusIQ 👋</h2>
            <p className="text-sm text-indigo-100 max-w-xl">
              Monitor live academic trends, track individual risk metrics, and trigger early interventions across all active departments.
            </p>
          </div>
          <Button
            onClick={() => navigate("/ai-predictions")}
            className="bg-white text-indigo-700 hover:bg-slate-100 font-semibold shadow-sm"
          >
            Run Batch Inference
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : (data?.totalStudents ?? 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active registered learners</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Attendance
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : (data?.attendancePercentage ?? "—")}</div>
              <p className="text-xs text-slate-500 mt-1">Campus aggregate rate</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Avg Performance
              </CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{isLoading ? "..." : (data?.averagePerformance ?? "—")}</div>
              <p className="text-xs text-slate-500 mt-1">Semester median GPA</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                AI Predictions
              </CardTitle>
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">CatBoost</div>
              <p className="text-xs text-slate-500 mt-1">Inference pipeline active</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Trends Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Trends
          </p>
          <h3 className="text-base font-bold text-slate-900 mb-4">Campus Attendance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceTrend} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="attendance" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Analytics — dynamic BI subject slicers */}
        <PerformanceAnalytics />

        {/* AI Intelligence Card */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Artificial Intelligence Engine
              </p>
              <h3 className="text-base font-bold text-slate-900">Student Risk & Performance Modeling</h3>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/ai-predictions")}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Open Predictor
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">
                    Model Status & Health
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xl">
                    FastAPI microservice connected. Pre-trained CatBoost weights active with SHAP explainability ready.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default AdminDashboardView;
