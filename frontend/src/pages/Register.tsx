import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        ...(enrollmentNo.trim() ? { enrollmentNo: enrollmentNo.trim() } : {}),
        role,
      });
      toast({
        title: "Registration successful",
        description: "Please log in with your new account.",
      });
      navigate("/");
    } catch (err) {
      setError("Registration failed. Email or enrollment number may already exist.");
      toast({
        title: "Registration Failed",
        description: "Email or enrollment number may already exist.",
        variant: "destructive",
      });
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
            Create your CampusIQ account
          </CardTitle>
          <CardDescription className="text-slate-500">
            Pick a role to test the RBAC architecture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 text-center font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                required
              />
            </div>
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
                type="text"
                placeholder="Enrollment number (optional)"
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value)}
                className="h-11"
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
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium transition-colors"
            >
              Register
            </Button>
            <p className="text-sm text-slate-500 text-center">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Log in here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Register;
