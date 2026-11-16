import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell,
} from "recharts";
import { AlertTriangle, BrainCircuit, TrendingDown, Users } from "lucide-react";

// Realistic MIT ADT mock data (SOC/AIA/Core/Cyber divisions)
const riskDistribution = [
  { name: "Low Risk", value: 62, color: "#10b981" },
  { name: "Medium Risk", value: 24, color: "#f59e0b" },
  { name: "High Risk (At-Risk)", value: 14, color: "#f43f5e" },
];

const attendanceVsMarks = [
  { name: "Aarav Kulkarni", attendance: 92, marks: 88, risk: "LOW" },
  { name: "Isha Deshmukh", attendance: 78, marks: 74, risk: "MEDIUM" },
  { name: "Rohan Patil", attendance: 61, marks: 52, risk: "HIGH" },
  { name: "Sneha Jadhav", attendance: 85, marks: 81, risk: "LOW" },
  { name: "Aditya Shinde", attendance: 54, marks: 48, risk: "HIGH" },
  { name: "Priya More", attendance: 96, marks: 91, risk: "LOW" },
  { name: "Kunal Pawar", attendance: 72, marks: 66, risk: "MEDIUM" },
  { name: "Meera Joshi", attendance: 58, marks: 55, risk: "HIGH" },
  { name: "Sahil Bhosale", attendance: 88, marks: 84, risk: "LOW" },
  { name: "Tanvi Kale", attendance: 69, marks: 63, risk: "MEDIUM" },
];

const deptRisk = [
  { dept: "CSE - SOC", low: 45, medium: 12, high: 5 },
  { dept: "CSE - AIA", low: 38, medium: 8, high: 4 },
  { dept: "CSE - Core", low: 30, medium: 10, high: 6 },
  { dept: "CSE - Cyber", low: 22, medium: 7, high: 3 },
  { dept: "IT - SOC", low: 40, medium: 11, high: 6 },
  { dept: "IT - AIA", low: 28, medium: 6, high: 2 },
];

const atRiskStudents = [
  { id: "MIT-CSE-23-0142", name: "Rohan Patil", class: "AIA - 2 (TY)", attendance: "61%", avgMarks: "52%", risk: "HIGH", driver: "Low attendance & failing internals" },
  { id: "MIT-CSE-23-0087", name: "Aditya Shinde", class: "Core - 1 (TY)", attendance: "54%", avgMarks: "48%", risk: "HIGH", driver: "Chronic absences, low GPA trend" },
  { id: "MIT-IT-22-0031", name: "Meera Joshi", class: "Cyber - 1 (BE)", attendance: "58%", avgMarks: "55%", risk: "HIGH", driver: "Attendance below threshold" },
  { id: "MIT-CSE-24-0210", name: "Isha Deshmukh", class: "SOC - 7 (SY)", attendance: "78%", avgMarks: "74%", risk: "MEDIUM", driver: "Declining midterm scores" },
  { id: "MIT-IT-24-0115", name: "Kunal Pawar", class: "SOC - 14 (FY)", attendance: "72%", avgMarks: "66%", risk: "MEDIUM", driver: "Borderline aggregate marks" },
];

const scatterColor = (risk: string) => risk === "HIGH" ? "#f43f5e" : risk === "MEDIUM" ? "#f59e0b" : "#10b981";

function MLStudentAnalysis() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">CampusIQ / ML Student Analysis</p>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-indigo-600" /> CatBoost Student Risk Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">Tableau-style BI view · Aggregate attendance & marks · MIT ADT University</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> CatBoost Model: Operational
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"><div className="text-xs text-slate-500 flex items-center gap-1"><Users className="h-4 w-4"/> Students Analyzed</div><div className="text-2xl font-bold text-slate-900 mt-1">1,248</div><div className="text-xs text-slate-500">CSE & IT cohorts</div></div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"><div className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4"/> High Risk</div><div className="text-2xl font-bold text-rose-600 mt-1">14%</div><div className="text-xs text-slate-500">Immediate intervention</div></div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"><div className="text-xs text-amber-600 flex items-center gap-1"><TrendingDown className="h-4 w-4"/> Medium Risk</div><div className="text-2xl font-bold text-amber-600 mt-1">24%</div><div className="text-xs text-slate-500">Monitor closely</div></div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"><div className="text-xs text-emerald-600">Low Risk</div><div className="text-2xl font-bold text-emerald-600 mt-1">62%</div><div className="text-xs text-slate-500">On track</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-2">Risk Distribution (CatBoost)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" nameKey="name" outerRadius={90} label>
                {riskDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm xl:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-2">Attendance vs Aggregate Marks (Risk Overlay)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="attendance" name="Attendance" unit="%" domain={[40, 100]} />
              <YAxis type="number" dataKey="marks" name="Avg Marks" unit="%" domain={[40, 100]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: any, n: any, p: any) => [v, n === "attendance" ? "Attendance %" : n === "marks" ? "Avg Marks %" : n]} />
              <Scatter name="Students" data={attendanceVsMarks} fill="#6366f1">
                {attendanceVsMarks.map((e, i) => <Cell key={i} fill={scatterColor(e.risk)} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-1">Red = High Risk, Amber = Medium, Green = Low (CatBoost predictions over live aggregates)</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-2">Departmental Risk by Division (SOC / AIA / Core / Cyber)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={deptRisk}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dept" tick={{ fontSize: 12 }} /><YAxis />
            <Tooltip /><Legend />
            <Bar dataKey="low" stackId="a" name="Low Risk" fill="#10b981" />
            <Bar dataKey="medium" stackId="a" name="Medium Risk" fill="#f59e0b" />
            <Bar dataKey="high" stackId="a" name="High Risk (At-Risk)" fill="#f43f5e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600"/> At-Risk Students (Action Required)</h3>
          <span className="text-xs text-slate-500">Highlighted by CatBoost on attendance + marks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Enrollment No</th>
                <th className="text-left px-4 py-2 font-semibold">Name</th>
                <th className="text-left px-4 py-2 font-semibold">Class</th>
                <th className="text-left px-4 py-2 font-semibold">Attendance</th>
                <th className="text-left px-4 py-2 font-semibold">Avg Marks</th>
                <th className="text-left px-4 py-2 font-semibold">Risk</th>
                <th className="text-left px-4 py-2 font-semibold">Primary Driver</th>
              </tr>
            </thead>
            <tbody>
              {atRiskStudents.map((s) => (
                <tr key={s.id} className={`border-t border-slate-100 ${s.risk === "HIGH" ? "bg-rose-50/60" : "bg-amber-50/40"}`}>
                  <td className="px-4 py-2 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-2">{s.class}</td>
                  <td className="px-4 py-2">{s.attendance}</td>
                  <td className="px-4 py-2">{s.avgMarks}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${s.risk === "HIGH" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"}`}>{s.risk}</span></td>
                  <td className="px-4 py-2 text-slate-600">{s.driver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MLStudentAnalysis;
