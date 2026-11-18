import { useState } from "react";
import AdminDashboardView from "../components/AdminDashboardView";
import DepartmentSelector from "../components/DepartmentSelector";
import DeptAdminPredictionDashboard from "../components/DeptAdminPredictionDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";
import StudentDashboard360 from "./StudentDashboard360";
import { getUserRole } from "../utils/auth";
import { getSelectedDepartmentId } from "../utils/department";

function Dashboard() {
  const role = getUserRole();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(() =>
    getSelectedDepartmentId()
  );

  if (role === "FACULTY" && !selectedDepartmentId) {
    return <DepartmentSelector onSelect={setSelectedDepartmentId} />;
  }

  if (role === "SUPERADMIN") {
    return <SuperAdminDashboard />;
  }

  if (role === "DEPT_ADMIN") {
    return <DeptAdminPredictionDashboard />;
  }

  // 360 operational dashboard for Student/Faculty; admin roles keep existing admin view
  if (role === "STUDENT" || role === "FACULTY") {
    return <StudentDashboard360 />;
  }

  return <AdminDashboardView />;
}

export default Dashboard;
