import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  BrainCircuit,
  LogOut,
  Settings,
} from "lucide-react";
import { clearAuth, getUserRole } from "../utils/auth";

const navItems = [
  { path: "/dashboard", label: "360 Dashboard", icon: LayoutDashboard, roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "STUDENT", "ADMIN"] },
  { path: "/students", label: "Students", icon: Users, roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { path: "/subjects", label: "Subjects", icon: BookOpen, roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { path: "/marks", label: "Marks", icon: ClipboardList, roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { path: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
  { path: "/ml-analysis", label: "ML Student Analysis", icon: BrainCircuit, roles: ["SUPERADMIN", "DEPT_ADMIN", "FACULTY", "ADMIN"] },
];

function Sidebar() {
  const role = getUserRole();
  const items = navItems.filter((i) => !role || i.roles.includes(role));

  return (
    <aside className="w-20 bg-slate-950 text-slate-300 flex flex-col items-center py-4 border-r border-slate-800 shrink-0">
      <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white mb-6 text-sm">MIT</div>
      <nav className="flex-1 flex flex-col gap-2">
        {items.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            title={label}
            className={({ isActive }) =>
              `h-11 w-11 rounded-lg flex items-center justify-center transition-colors ${
                isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>
      <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            `h-11 w-11 rounded-lg flex items-center justify-center ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`
          }
        >
          <Settings className="h-5 w-5" />
        </NavLink>
        <button
          title="Logout"
          onClick={() => { clearAuth(); window.location.href = "/"; }}
          className="h-11 w-11 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-950/30"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
