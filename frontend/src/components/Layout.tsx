import { Outlet } from "react-router-dom";
import { Bell, UserCircle } from "lucide-react";
import Sidebar from "./Sidebar";
import { getUserRole } from "../utils/auth";

function Layout() {
  const role = getUserRole();
  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900 tracking-tight">MIT ADT University</span>
            <span className="text-xs text-slate-500 border-l border-slate-300 pl-3">CampusIQ ERP</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <Bell className="h-5 w-5 cursor-pointer hover:text-slate-700" />
            <div className="flex items-center gap-2 text-sm">
              <UserCircle className="h-6 w-6 text-slate-600" />
              <div className="leading-tight">
                <div className="text-slate-800 font-medium">User Profile</div>
                <div className="text-[11px] text-indigo-700 font-semibold">{role ?? "GUEST"}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
