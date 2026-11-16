import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { getSelectedDepartmentId } from "../utils/department";

interface StudentUser {
  name?: string | null;
  email?: string | null;
}

interface StudentClassGroup {
  id?: number;
  name?: string | null;
  year?: number | null;
  departmentId?: number | null;
  specializationId?: number | null;
  specialization?: { id?: number; name?: string | null } | null;
}

interface StudentDepartment {
  id?: number;
  name?: string | null;
  code?: string | null;
}

interface Student {
  id: string;
  enrollmentNo?: string | null;
  rollNo?: string | null;
  contactNo?: string | null;
  parentEmail?: string | null;
  parentMobile?: string | null;
  classGroupId?: number | null;
  user?: StudentUser | null;
  classGroup?: StudentClassGroup | null;
  department?: StudentDepartment | null;
}

function normalizeStudent(raw: unknown): Student {
  const student = (raw ?? {}) as Record<string, unknown>;
  const nestedUser =
    student.user && typeof student.user === "object" ? (student.user as StudentUser) : undefined;
  const nestedClassGroup =
    student.classGroup && typeof student.classGroup === "object"
      ? (student.classGroup as StudentClassGroup)
      : undefined;
  const nestedDepartment =
    student.department && typeof student.department === "object"
      ? (student.department as StudentDepartment)
      : undefined;

  const user = nestedUser ?? {
    name: typeof student.name === "string" ? student.name : undefined,
    email: typeof student.email === "string" ? student.email : undefined,
  };

  const classGroup =
    nestedClassGroup ??
    (typeof student.className === "string" && student.className
      ? { name: student.className }
      : null);

  const department =
    nestedDepartment ??
    (typeof student.department === "string" && student.department
      ? { name: student.department }
      : null);

  return {
    id: String(student.id ?? ""),
    enrollmentNo: typeof student.enrollmentNo === "string" ? student.enrollmentNo : null,
    rollNo: typeof student.rollNo === "string" ? student.rollNo : null,
    contactNo: typeof student.contactNo === "string" ? student.contactNo : null,
    parentEmail: typeof student.parentEmail === "string" ? student.parentEmail : null,
    parentMobile: typeof student.parentMobile === "string" ? student.parentMobile : null,
    classGroupId: typeof student.classGroupId === "number" ? student.classGroupId : null,
    user,
    classGroup,
    department,
  };
}

interface Department {
  id: number;
  code: string;
  name: string;
}

interface ClassGroup {
  id: number;
  name: string;
  year: number;
  departmentId: number;
  specializationId: number | null;
}

interface Specialization {
  id: number;
  name: string;
  departmentId: number;
}

const YEARS = [1, 2, 3, 4];
const EMPTY_CLASS_GROUPS: ClassGroup[] = [];

function Students() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDepartmentId] = useState<number | null>(() => getSelectedDepartmentId());
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSpecializationId, setSelectedSpecializationId] = useState<number | null>(null);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    enrollmentNo: "",
    department: "",
    departmentId: "",
    classGroupId: "",
    rollNo: "",
    contactNo: "",
    parentEmail: "",
    parentMobile: "",
  });

  const { data: studentsData, isLoading, isError, error } = useQuery({
    queryKey: ["students", "directory", selectedClassGroupId],
    queryFn: async (): Promise<Student[]> => {
      if (selectedClassGroupId === null) return [];
      const response = await api.get("/students", {
        params: { classGroupId: selectedClassGroupId },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload.map(normalizeStudent);
      if (Array.isArray(payload?.data)) return payload.data.map(normalizeStudent);
      return [] as Student[];
    },
    enabled: selectedClassGroupId !== null,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const response = await api.get("/students/departments");
      return response.data as Department[];
    },
  });

  const classGroupSpecializationParam =
    selectedYear !== null && selectedYear <= 2
      ? "null"
      : selectedSpecializationId ?? undefined;

  const { data: classGroupsData } = useQuery({
    queryKey: [
      "classGroups",
      selectedDepartmentId,
      selectedYear,
      classGroupSpecializationParam,
    ],
    queryFn: async (): Promise<ClassGroup[]> => {
      if (selectedDepartmentId === null || selectedYear === null) return [];
      const response = await api.get("/students/class-groups", {
        params: {
          departmentId: selectedDepartmentId,
          year: selectedYear,
          specializationId: classGroupSpecializationParam,
        },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload as ClassGroup[];
      if (Array.isArray(payload?.data)) return payload.data as ClassGroup[];
      return [];
    },
    enabled:
      selectedDepartmentId !== null &&
      selectedYear !== null &&
      (selectedYear <= 2 || selectedSpecializationId !== null),
  });

  const { data: specializationsData } = useQuery({
    queryKey: ["specializations", selectedDepartmentId],
    queryFn: async (): Promise<Specialization[]> => {
      const response = await api.get("/students/specializations", {
        params: { departmentId: selectedDepartmentId },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload as Specialization[];
      if (Array.isArray(payload?.data)) return payload.data as Specialization[];
      return [];
    },
    enabled: selectedDepartmentId !== null,
  });

  const formDepartmentId = formData.departmentId ? Number(formData.departmentId) : null;
  const { data: formClassGroupsData } = useQuery({
    queryKey: ["classGroups", formDepartmentId],
    queryFn: async (): Promise<ClassGroup[]> => {
      const response = await api.get("/students/class-groups", {
        params: { departmentId: formDepartmentId },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload as ClassGroup[];
      if (Array.isArray(payload?.data)) return payload.data as ClassGroup[];
      return [];
    },
    enabled: formDepartmentId !== null,
  });

  const students = studentsData ?? [];
  const departments = departmentsData ?? [];
  const classGroups = classGroupsData ?? EMPTY_CLASS_GROUPS;
  const specializations = specializationsData ?? [];
  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId) ?? null;

  const availableClassGroups = useMemo(
    () =>
      classGroups
        .filter((classGroup) => {
          if (selectedYear === null || classGroup.year !== selectedYear) return false;
          if (selectedYear <= 2) return classGroup.specializationId == null;
          return (
            selectedSpecializationId !== null &&
            classGroup.specializationId === selectedSpecializationId
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [classGroups, selectedYear, selectedSpecializationId]
  );

  const handleYearChange = (value: string) => {
    const year = value ? Number(value) : null;
    setSelectedYear(year);
    setSelectedSpecializationId(null);
    setSelectedClassGroupId(null);
  };

  const handleSpecializationChange = (value: string) => {
    setSelectedSpecializationId(value ? Number(value) : null);
    setSelectedClassGroupId(null);
  };

  const handleClassGroupChange = (value: string) => {
    setSelectedClassGroupId(value ? Number(value) : null);
  };

  if (isError) {
    return (
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-red-600 font-bold text-lg mb-2">Error Loading Students</div>
          <div className="text-red-500 font-mono text-sm break-all">
            {error instanceof Error ? error.message : String(error)}
          </div>
          <p className="text-slate-500 text-sm mt-4">Check your backend terminal for the exact Prisma error.</p>
        </div>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      enrollmentNo: "",
      department: "",
      departmentId: "",
      classGroupId: "",
      rollNo: "",
      contactNo: "",
      parentEmail: "",
      parentMobile: "",
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      name: student.user?.name ?? "",
      email: student.user?.email ?? "",
      enrollmentNo: student.enrollmentNo ?? "",
      department: student.department?.code ?? student.department?.name ?? "",
      departmentId: student.department?.id != null ? String(student.department.id) : "",
      classGroupId: student.classGroupId ? String(student.classGroupId) : "",
      rollNo: student.rollNo ?? "",
      contactNo: student.contactNo ?? "",
      parentEmail: student.parentEmail ?? "",
      parentMobile: student.parentMobile ?? "",
    });
    setIsModalOpen(true);
  };

  const handleDepartmentChange = (deptId: unknown) => {
    const id = String(deptId);
    setFormData((prev) => ({
      ...prev,
      departmentId: id,
      department: departments.find((d) => String(d.id) === id)?.code ?? "",
      classGroupId: "",
    }));
  };

  const filteredClassGroups = (formClassGroupsData ?? EMPTY_CLASS_GROUPS)
    .filter((classGroup) => classGroup.departmentId === formDepartmentId)
    .sort(
      (a, b) =>
        a.year - b.year ||
        a.name.localeCompare(b.name, undefined, { numeric: true })
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      enrollmentNo: formData.enrollmentNo,
      department: formData.department,
      classGroupId: formData.classGroupId ? Number(formData.classGroupId) : null,
      rollNo: formData.rollNo.trim() === "" ? null : formData.rollNo,
      contactNo: formData.contactNo.trim() === "" ? null : formData.contactNo,
      parentEmail: formData.parentEmail.trim() === "" ? null : formData.parentEmail,
      parentMobile: formData.parentMobile.trim() === "" ? null : formData.parentMobile,
    };
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, payload);
      } else {
        await api.post("/students", payload);
      }
      const wasEditing = Boolean(editingId);
      setIsModalOpen(false);
      setFormData({
        name: "",
        email: "",
        enrollmentNo: "",
        department: "",
        departmentId: "",
        classGroupId: "",
        rollNo: "",
        contactNo: "",
        parentEmail: "",
        parentMobile: "",
      });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({
        title: wasEditing ? "Student updated" : "Student added",
        description: wasEditing
          ? "The student details have been updated."
          : "The new student has been added to the directory.",
      });
    } catch (error: unknown) {
      console.error("Failed to save student:", error);
      const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
      toast({
        title: "Error",
        description: axiosError.response?.data?.error || axiosError.response?.data?.message || "Failed to create student",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter((student) => {
    if (selectedClassGroupId !== null && student.classGroupId !== selectedClassGroupId) {
      return false;
    }
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      (student.user?.name ?? "").toLowerCase().includes(query) ||
      (student.user?.email ?? "").toLowerCase().includes(query) ||
      (student.enrollmentNo ?? "").toLowerCase().includes(query) ||
      (student.department?.name ?? "").toLowerCase().includes(query) ||
      (student.classGroup?.name ?? "").toLowerCase().includes(query) ||
      (student.rollNo ?? "").toLowerCase().includes(query) ||
      (student.contactNo ?? "").toLowerCase().includes(query) ||
      (student.parentEmail ?? "").toLowerCase().includes(query) ||
      (student.parentMobile ?? "").toLowerCase().includes(query)
    );
  });

  if (students && !Array.isArray(students)) return <div className="p-4 text-red-500">Data format error: Expected an array.</div>;

  return (
    <>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-slate-500 font-medium">CampusIQ / Students</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Student Directory</h1>
          </div>
        </header>

        <div className="flex flex-wrap justify-between items-end gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full max-w-xs px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Department
              </label>
              <div className="h-10 px-3 flex items-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 min-w-28">
                {selectedDepartment?.code ?? "Not selected"}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Year
              </label>
              <select
                value={selectedYear ?? ""}
                onChange={(e) => handleYearChange(e.target.value)}
                className="h-10 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-32"
              >
                <option value="">All Years</option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>
            </div>
            {selectedYear !== null && selectedYear >= 3 && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Specialization
                </label>
                <select
                  value={selectedSpecializationId ?? ""}
                  onChange={(e) => handleSpecializationChange(e.target.value)}
                  className="h-10 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-48"
                >
                  <option value="">Select specialization</option>
                  {specializations.map((specialization) => (
                    <option key={specialization.id} value={specialization.id}>
                      {specialization.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedYear !== null &&
              (selectedYear <= 2 || selectedSpecializationId !== null) && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Class
                  </label>
                  <select
                    value={selectedClassGroupId ?? ""}
                    onChange={(e) => handleClassGroupChange(e.target.value)}
                    className="h-10 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-40"
                  >
                    <option value="" disabled>
                      Select Class
                    </option>
                    {availableClassGroups.map((classGroup) => (
                      <option key={classGroup.id} value={classGroup.id}>
                        {classGroup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </div>
          <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white">
            + Add Student
          </Button>
        </div>
        {!selectedDepartmentId && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            Select CSE or IT from the Dashboard to enable department, year, and class filters.
          </p>
        )}

        {selectedClassGroupId === null ? (
          <div className="p-8 text-center text-gray-500">
            Please select a specific class (e.g., SOC - 1, AIA - 9) to view students.
          </div>
        ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[70vh]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow className="h-8 hover:bg-slate-50">
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Sr. No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Enrollment No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Roll No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Name</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Email ID</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Contact No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Parent Mail ID</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Parent Mobile No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={9} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">Loading students...</TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={9} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">
                    No students found. Click "Add Student" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents?.map((student: any, index: number) => (
                  <TableRow
                    key={student.id || index}
                    onClick={() => handleEditClick(student)}
                    title="Click to edit student details"
                    className="h-8 hover:bg-slate-50 cursor-pointer"
                  >
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{index + 1}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.enrollmentNo || "-"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.rollNo || "-"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.user?.name || student?.name || "Unknown"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.user?.email || student?.email || "-"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.contactNo || "-"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.parentEmail || "-"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.parentMobile || "-"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student?.classGroup?.name || "Unassigned"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit Student" : "Add New Student"}</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">{editingId ? "Update the student details below." : "Fill in the details for the new student."}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <Input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email (Login ID)</label>
                  <Input required type="email" value={formData.email} disabled={!!editingId} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment No.</label>
                  <Input required type="text" value={formData.enrollmentNo} onChange={(e) => setFormData({ ...formData, enrollmentNo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll No</label>
                  <Input type="text" placeholder="e.g., 21" value={formData.rollNo} onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class Group</label>
                  <Select
                    value={formData.classGroupId || "unassigned"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        classGroupId: value === "unassigned" ? "" : String(value),
                      })
                    }
                    disabled={!formData.departmentId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          formData.departmentId ? "Select Class Group" : "Select Department first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {filteredClassGroups.map((cg) => (
                        <SelectItem key={cg.id} value={String(cg.id)}>
                          Year {cg.year} - {cg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact No</label>
                  <Input type="tel" placeholder="e.g., 9876543210" value={formData.contactNo} onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent Mail ID</label>
                  <Input type="email" placeholder="e.g., parent@example.com" value={formData.parentEmail} onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent Mobile No</label>
                  <Input type="tel" placeholder="e.g., 9876543210" value={formData.parentMobile} onChange={(e) => setFormData({ ...formData, parentMobile: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white">{editingId ? "Update Student" : "Save Student"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Students;