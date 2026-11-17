import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Marks from "./pages/Marks";
import Subjects from "./pages/Subjects";
import AIPredictions from "./pages/AIPredictions";
import Settings from "./pages/Settings";
import AnalyticsEngine from "./pages/AnalyticsEngine";
import MLStudentAnalysis from "./pages/MLStudentAnalysis";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { Toaster } from "@/components/ui/toaster";

const STAFF_ROLES = ["ADMIN", "FACULTY", "DEPT_ADMIN", "SUPERADMIN"];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<ProtectedRoute allowedRoles={["FACULTY", "DEPT_ADMIN", "SUPERADMIN"]}><AnalyticsEngine /></ProtectedRoute>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/students" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Students /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Attendance /></ProtectedRoute>} />
          <Route path="/marks" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Marks /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Subjects /></ProtectedRoute>} />
          <Route path="/ml-analysis" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><MLStudentAnalysis /></ProtectedRoute>} />
          <Route path="/ai-predictions" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><AIPredictions /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
