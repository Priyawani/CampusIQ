import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, BarChart, Bar,
} from "recharts";
import { Button } from "@/components/ui/button";

const gpaTrend = [
  { sem: "Sem 1", cse: 7.8, it: 7.5, aia: 7.9 },
  { sem: "Sem 2", cse: 8.0, it: 7.7, aia: 8.1 },
  { sem: "Sem 3", cse: 8.1, it: 7.9, aia: 8.3 },
  { sem: "Sem 4", cse: 8.3, it: 8.0, aia: 8.4 },
  { sem: "Sem 5", cse: 8.4, it: 8.2, aia: 8.5 },
];

const scatterData = [
  { attendance: 92, performance: 88 }, { attendance: 75, performance: 70 }, { attendance: 85, performance: 82 },
  { attendance: 60, performance: 55 }, { attendance: 98, performance: 94 }, { attendance: 70, performance: 68 },
  { attendance: 88, performance: 90 }, { attendance: 80, performance: 76 },
];

const passFail = [
  { dept: "CSE", pass: 420, fail: 30 },
  { dept: "IT", pass: 210, fail: 18 },
  { dept: "AIA", pass: 180, fail: 12 },
];

function exportCSV() {
  const rows = [["Semester", "CSE", "IT", "AIA"], ...gpaTrend.map((r) => [r.sem, r.cse, r.it, r.aia])];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "analytics-report.csv";
  a.click();
}

function AnalyticsEngine() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-700 mr-2">Global Filters</span>
        <select className="border rounded px-2 py-1 text-sm"><option>All Departments</option><option>CSE</option><option>IT</option></select>
        <select className="border rounded px-2 py-1 text-sm"><option>All Years</option><option>1</option><option>2</option><option>3</option><option>4</option></select>
        <select className="border rounded px-2 py-1 text-sm"><option>All Classes</option><option>SOC</option><option>AIA</option></select>
        <select className="border rounded px-2 py-1 text-sm"><option>All Semesters</option><option>Sem 1-2</option><option>Sem 3-4</option></select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>Export to CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Download PDF Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">GPA Trends Across Semesters</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={gpaTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sem" /><YAxis domain={[6, 10]} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="cse" stroke="#4f46e5" />
              <Line type="monotone" dataKey="it" stroke="#0ea5e9" />
              <Line type="monotone" dataKey="aia" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Attendance vs. Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="number" dataKey="attendance" name="Attendance" unit="%" />
              <YAxis type="number" dataKey="performance" name="Performance" unit="%" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter name="Students" data={scatterData} fill="#7c3aed" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 xl:col-span-2">
          <h3 className="font-semibold mb-2">Departmental Pass/Fail Ratios</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={passFail}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dept" /><YAxis />
              <Tooltip /><Legend />
              <Bar dataKey="pass" stackId="a" fill="#14b8a6" />
              <Bar dataKey="fail" stackId="a" fill="#f43f5e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsEngine;
