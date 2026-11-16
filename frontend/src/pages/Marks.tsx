import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { getUserRole } from "../utils/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

interface Student {
  id: string;
  name: string;
  enrollmentNo: string;
  department: string;
  rollNo?: string | null;
  className?: string | null;
}

interface Subject {
  id: string;
  code: string;
  name: string;
}

const EXAM_TYPES = ["INTERNAL", "MIDTERM", "END_SEMESTER", "ASSIGNMENT", "QUIZ"] as const;

const EXAM_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  MIDTERM: "Mid Term",
  END_SEMESTER: "Final",
  ASSIGNMENT: "Assignment",
  QUIZ: "Quiz",
};

function Marks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = getUserRole();
  const isFacultyView = role === "FACULTY" || role === "ADMIN";

  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExamType, setSelectedExamType] = useState<string>("MIDTERM");
  const [maxMarks, setMaxMarks] = useState("100");
  // Local entered scores: studentId -> score input value
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await api.get("/students");
      const payload = response.data;
      if (Array.isArray(payload)) return payload as Student[];
      if (Array.isArray(payload?.data)) return payload.data as Student[];
      return [] as Student[];
    },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await api.get("/subjects");
      const payload = response.data;
      if (Array.isArray(payload)) return payload as Subject[];
      if (Array.isArray(payload?.data)) return payload.data as Subject[];
      return [] as Subject[];
    },
  });

  const students = studentsData ?? [];
  const subjects = subjectsData ?? [];

  const classOptions = useMemo(
    () =>
      [
        ...new Set(
          (studentsData ?? []).map((s) => s.className).filter((c): c is string => !!c)
        ),
      ].sort(),
    [studentsData]
  );

  const visibleStudents = selectedClass
    ? students.filter((s) => s.className === selectedClass)
    : students;

  // Default to the first subject once loaded so the batch payload always has one.
  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(String(subjects[0].id));
    }
  }, [subjects, selectedSubjectId]);

  // Reset entered scores when the grading context changes.
  useEffect(() => {
    setScores({});
  }, [selectedSubjectId, selectedExamType]);

  const handleScoreChange = (studentId: string, value: string) => {
    setScores((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSaveAllMarks = async () => {
    if (!selectedSubjectId) {
      toast({
        title: "Select a subject",
        description: "Choose a subject before saving marks.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedExamType) {
      toast({
        title: "Select an exam type",
        description: "Choose an exam type before saving marks.",
        variant: "destructive",
      });
      return;
    }

    const parsedMaxMarks = parseFloat(maxMarks);
    if (Number.isNaN(parsedMaxMarks) || parsedMaxMarks <= 0) {
      toast({
        title: "Invalid max marks",
        description: "Enter a valid max marks value greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const records = Object.entries(scores)
      .filter(([, value]) => value !== "" && value !== undefined)
      .map(([studentId, value]) => ({
        studentId,
        score: parseFloat(value),
        maxMarks: parsedMaxMarks,
      }));

    if (records.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Enter at least one score before saving.",
        variant: "destructive",
      });
      return;
    }

    if (records.some((r) => Number.isNaN(r.score) || r.score < 0 || r.score > parsedMaxMarks)) {
      toast({
        title: "Invalid scores",
        description: `Scores must be numbers between 0 and ${parsedMaxMarks}.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post("/marks/batch", {
        subjectId: selectedSubjectId,
        examType: selectedExamType,
        records,
      });
      toast({
        title: "Marks saved",
        description: `Saved ${records.length} record(s) successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch (error) {
      console.error("Failed to save batch marks:", error);
      toast({
        title: "Error saving marks",
        description: "Check the browser console for details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isFacultyView) {
    return (
      <div className="p-8 max-w-7xl w-full mx-auto">
        <p className="text-sm text-slate-600">
          You do not have permission to access this resource.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-slate-500 font-medium">CampusIQ / Marks</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Academic Records</h1>
            <p className="text-sm text-slate-500 mt-1">Faculty View — Batch Grading</p>
          </div>
          <Button
            onClick={handleSaveAllMarks}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white"
          >
            {saving ? "Saving..." : "Save All Marks"}
          </Button>
        </header>

        <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-40"
              >
                <option value="">All Classes</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-52"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.code} — {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Exam Type
              </label>
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-40"
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EXAM_TYPE_LABELS[type] ?? type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Max Marks
              </label>
              <Input
                type="number"
                min="1"
                step="0.5"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="w-28"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {Object.values(scores).filter((v) => v !== "").length} of {visibleStudents.length} scored
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[70vh]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow className="h-8 hover:bg-slate-50">
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Sr. No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Enrollment No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Roll No</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Name</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={5} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">Loading students...</TableCell>
                </TableRow>
              ) : visibleStudents.length === 0 ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={5} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">No students found.</TableCell>
                </TableRow>
              ) : (
                visibleStudents.map((student, index) => (
                  <TableRow key={student.id} className="h-8 hover:bg-slate-50">
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{index + 1}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap"><span className="font-semibold text-slate-900">{student.enrollmentNo}</span></TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student.rollNo ?? "-"}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{student.name}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">
                      <Input
                        type="number"
                        min="0"
                        max={maxMarks}
                        step="0.5"
                        placeholder="—"
                        value={scores[student.id] ?? ""}
                        onChange={(e) => handleScoreChange(student.id, e.target.value)}
                        className="h-6 w-16 text-xs px-1 py-0"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

export default Marks;
