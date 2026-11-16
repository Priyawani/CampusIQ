import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2 } from "lucide-react";
import api from "../services/api";
import {
  setSelectedDepartmentId,
  setSelectedDepartmentName,
} from "../utils/department";

interface Department {
  id: number;
  code: string;
  name: string;
}

interface DepartmentSelectorProps {
  onSelect: (departmentId: number) => void;
}

const COMPUTING_DEPARTMENTS = ["CSE", "IT"];

function DepartmentSelector({ onSelect }: DepartmentSelectorProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<Department[]> => {
      const response = await api.get("/students/departments");
      return Array.isArray(response.data) ? (response.data as Department[]) : [];
    },
  });

  const departments = (data ?? []).filter((department) =>
    COMPUTING_DEPARTMENTS.includes(department.code)
  );

  const handleSelect = (department: Department) => {
    setSelectedDepartmentId(department.id);
    setSelectedDepartmentName(`${department.name} (${department.code})`);
    onSelect(department.id);
  };

  return (
    <div className="p-8 max-w-5xl w-full mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-xs text-slate-500 font-medium mb-2">CampusIQ / School of Computing</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Select your department
        </h1>
        <p className="text-sm text-slate-500 mt-3">
          Choose the MIT School of Computing department you belong to. This selection controls
          which classes and students you can manage.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Loading departments...
        </div>
      ) : isError || departments.length === 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-red-600">Departments could not be loaded.</p>
          <p className="text-xs text-red-500 mt-2">
            Make sure the CSE and IT departments exist, then refresh the page.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {departments.map((department) => (
            <button
              key={department.id}
              type="button"
              onClick={() => handleSelect(department)}
              className="group text-left bg-white border border-slate-200 rounded-2xl p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-6">{department.code}</h2>
              <p className="text-sm text-slate-500 mt-1">{department.name}</p>
              <span className="inline-flex items-center mt-6 text-sm font-semibold text-indigo-600">
                Continue with {department.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DepartmentSelector;
