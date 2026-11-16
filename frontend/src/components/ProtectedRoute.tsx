import { Navigate } from "react-router-dom";
import { getUserRole } from "../utils/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("campusiq_token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles) {
    const role = getUserRole();

    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
