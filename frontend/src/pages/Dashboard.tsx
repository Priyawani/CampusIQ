import { useState } from "react";
import AdminDashboardView from "../components/AdminDashboardView";
import DepartmentSelector from "../components/DepartmentSelector";
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

  // 360 operational dashboard for Student/Faculty; admin roles keep existing admin view
  if (role === "STUDENT" || role === "FACULTY") {
    return <StudentDashboard360 />;
  }

  return <AdminDashboardView />;
}

export default Dashboard;
