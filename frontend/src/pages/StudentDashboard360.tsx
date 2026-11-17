import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Users, BookOpen, ClipboardList, CalendarCheck, BrainCircuit, LayoutDashboard } from "lucide-react";
import FilterHierarchy, { type HierarchyFilters } from "../components/FilterHierarchy";
import { getUserRole } from "../utils/auth";

const adminModules = [
  { to: "/students", title: "Students", desc: "Directory & enrollment (SOC 1–24, AIA/Core/Cyber)", icon: Users, color: "bg-indigo-600", roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { to: "/subjects", title: "Subjects", desc: "Curriculum & course catalog", icon: BookOpen, color: "bg-blue-600", roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { to: "/marks", title: "Marks", desc: "Continuous assessment entry", icon: ClipboardList, color: "bg-purple-600", roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { to: "/attendance", title: "Attendance", desc: "Daily tracking, monthly XLSX, parent alerts", icon: CalendarCheck, color: "bg-teal-600", roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { to: "/ml-analysis", title: "ML Student Analysis", desc: "CatBoost risk predictions (Tableau view)", icon: BrainCircuit, color: "bg-rose-600", roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
];

const studentModules = [
  { to: "/marks", title: "Marks", desc: "View academic performance", icon: ClipboardList, color: "bg-purple-600" },
  { to: "/attendance", title: "Attendance", desc: "Presence overview", icon: CalendarCheck, color: "bg-teal-600" },
  { to: "/ml-analysis", title: "ML Student Analysis", desc: "AI insights & progress", icon: BrainCircuit, color: "bg-rose-600" },
  { to: "/subjects", title: "Subjects", desc: "Registered courses", icon: BookOpen, color: "bg-blue-600" },
];

function StudentDashboard360() {
  const role = getUserRole() ?? "GUEST";
  const [filters, setFilters] = useState<HierarchyFilters>({
    year: "",
    classGroupId: "",
    specializationId: "",
    subjectId: "",
  });
  const handleFiltersChange = useCallback((next: HierarchyFilters) => {
    setFilters(next);
  }, []);
  const cards = role === "STUDENT" ? studentModules : adminModules.filter((m) => m.roles.includes(role));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><LayoutDashboard className="h-5 w-5 text-indigo-600"/> 360° Role-Based Dashboard</h1>
          <p className="text-sm text-slate-500">MIT ADT University · CSE & IT · Enterprise ERP (TCS iON model)</p>
        </div>
        <div className="text-xs bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-slate-700">
          {role === "FACULTY" && "Scoped: Assigned SOC/AIA/Core/Cyber classes only"}
          {role === "DEPT_ADMIN" && "Scoped: Department administration (CSE/IT)"}
          {role === "SUPERADMIN" && "Scoped: University-wide (Root Tenant)"}
          {role === "STUDENT" && "Scoped: Personal academic self-service"}
          {!["FACULTY","DEPT_ADMIN","SUPERADMIN","STUDENT"].includes(role) && `Scoped: ${role}`}
        </div>
      </div>

      <FilterHierarchy value={filters} onChange={handleFiltersChange} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(({ to, title, desc, icon: Icon, color }) => (
          <Link key={title} to={to} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
            <div className={`${color} h-2 w-full`} />
            <div className="p-5">
              <div className={`h-10 w-10 rounded-lg ${color} text-white flex items-center justify-center mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-bold text-slate-900">{title}</div>
              <div className="text-xs text-slate-500 mt-1 leading-snug">{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm lg:col-span-2">
          <div className="bg-sky-50 border border-sky-100 rounded p-3 mb-3">
            <div className="font-semibold text-sky-900">Institutional Hierarchy · MIT ADT University (Root)</div>
            <div className="text-sm text-sky-800">Departments: Computer Science and Engineering (CSE), Information Technology (IT)</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="border border-slate-200 rounded p-3"><div className="text-slate-500 text-xs">FY & SY (Common)</div><div className="font-bold">SOC - 1 … SOC - 24</div><div className="text-xs text-slate-500">Nullable specialization</div></div>
            <div className="border border-slate-200 rounded p-3"><div className="text-slate-500 text-xs">TY/BE · AIA</div><div className="font-bold">AIA - 1 … AIA - 6</div><div className="text-xs text-slate-500">AI & Analytics</div></div>
            <div className="border border-slate-200 rounded p-3"><div className="text-slate-500 text-xs">TY/BE · Core</div><div className="font-bold">Core - 1 … Core - 6</div><div className="text-xs text-slate-500">Core</div></div>
            <div className="border border-slate-200 rounded p-3"><div className="text-slate-500 text-xs">TY/BE · Cyber</div><div className="font-bold">Cyber - 1 … Cyber - 6</div><div className="text-xs text-slate-500">Cyber Security & Forensics</div></div>
          </div>
          {role === "FACULTY" && (
            <div className="mt-3 text-xs text-indigo-800 bg-indigo-50 border border-indigo-100 rounded p-2">
              Assigned view (mock): SOC - 3 (FY, CSE), SOC - 11 (SY, CSE), AIA - 2 (TY, CSE – AI & Analytics)
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
          <div className="space-y-2 text-sm">
            <Link to="/students" className="block border rounded px-3 py-2 hover:bg-slate-50">Student Directory (MIT ADT)</Link>
            <Link to="/attendance" className="block border rounded px-3 py-2 hover:bg-slate-50">Daily Attendance · Export Monthly (xlsx) · Notify Parents</Link>
            <Link to="/marks" className="block border rounded px-3 py-2 hover:bg-slate-50">Continuous Assessment (Marks)</Link>
            <Link to="/ml-analysis" className="block border border-rose-200 text-rose-700 rounded px-3 py-2 hover:bg-rose-50">CatBoost At-Risk Students</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard360;
