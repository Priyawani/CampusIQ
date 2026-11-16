import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SELECTED_DEPARTMENT_KEY, setSelectedDepartmentId } from "../utils/department";

const DEPARTMENT_OPTIONS = [
  { value: "CSE", label: "Computer Science and Engineering (CSE)" },
  { value: "IT", label: "Information Technology (IT)" },
];

interface Department {
  id: number;
  code: string;
  name: string;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("campusiq_token", response.data.token);
      if (response.data.user?.role) {
        localStorage.setItem("campusiq_role", response.data.user.role);
      }

      const department = DEPARTMENT_OPTIONS.find(
        (option) => option.value === selectedDepartment
      );
      localStorage.setItem(
        SELECTED_DEPARTMENT_KEY,
        department?.label ?? selectedDepartment
      );

      try {
        const departmentsResponse = await api.get("/students/departments");
        const departments = Array.isArray(departmentsResponse.data)
          ? (departmentsResponse.data as Department[])
          : [];
        const matchedDepartment = departments.find(
          (item) => item.code === selectedDepartment
        );
        if (matchedDepartment) {
          setSelectedDepartmentId(matchedDepartment.id);
        }
      } catch {
        // The dashboard will prompt for a department if it cannot be resolved.
      }

      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm">
              C
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome to CampusIQ
          </CardTitle>
          <CardDescription className="text-slate-500">
            Enter your admin credentials to access the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 text-center font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="name@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="department"
                className="block text-sm font-medium text-slate-700"
              >
                Select Department
              </label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="" disabled>
                  Select Department
                </option>
                {DEPARTMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium transition-colors"
            >
              Sign In
            </Button>
            <p className="text-sm text-slate-500 text-center">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Register here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;