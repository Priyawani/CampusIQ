import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarCheck,
  GraduationCap,
  BookOpen,
} from "lucide-react";

// Temporary mock data until a personal-stats backend endpoint exists.
// TODO: replace with a useQuery call (e.g. ['myDashboard']) once available.
const studentName = "Student";

const personalMetrics = [
  {
    title: "My Attendance",
    value: "87%",
    subtitle: "Last 30 days",
    icon: CalendarCheck,
  },
  {
    title: "Current GPA",
    value: "8.6",
    subtitle: "Semester average",
    icon: GraduationCap,
  },
  {
    title: "Upcoming Assignments",
    value: "3",
    subtitle: "Due this week",
    icon: BookOpen,
  },
];

const recentScores = [
  { name: "Quiz 1", score: 78 },
  { name: "Quiz 2", score: 85 },
  { name: "Assignment 1", score: 92 },
  { name: "Midterm", score: 81 },
  { name: "Quiz 3", score: 88 },
  { name: "Assignment 2", score: 95 },
];

function StudentDashboardView() {
  return (
    <>
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
        <div>
          <p className="text-xs text-slate-500 font-medium">CampusIQ / Dashboard</p>
          <h1 className="text-lg font-bold text-slate-900">My Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
            S
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{studentName}</p>
            <p className="text-[11px] text-slate-500">Student</p>
          </div>
        </div>
      </header>

      {/* Content Body */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-8 text-white shadow-md shadow-indigo-500/10">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Student Portal
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, {studentName} 👋</h2>
            <p className="text-sm text-indigo-100 max-w-xl">
              Here is your personal academic snapshot. Keep up the momentum.
            </p>
          </div>
        </div>

        {/* Personal Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {personalMetrics.map(({ title, value, subtitle, icon: Icon }) => (
            <Card key={title} className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Scores Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Performance
          </p>
          <h3 className="text-base font-bold text-slate-900 mb-4">My Recent Quiz & Assignment Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recentScores} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="score" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

export default StudentDashboardView;
