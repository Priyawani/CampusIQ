import { useEffect, useState } from "react";
import api from "../services/api";
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

interface Subject {
  id: string;
  code: string;
  abbreviation?: string | null;
  name: string;
  credits: number;
  department: string;
}

const ABBREVIATION_STOP_WORDS = new Set(["and", "of", "the", "for", "in", "on", "a", "an", "&"]);

function toAbbreviation(name: string): string {
  const abbreviation = name
    .split(/\s+/)
    .filter((word) => word.length > 0 && !ABBREVIATION_STOP_WORDS.has(word.toLowerCase()))
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return abbreviation || "-";
}

function Subjects() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    courseCode: "", abbreviation: "", name: "", credits: "3"
  });

  const fetchSubjects = async () => {
    try {
      const response = await api.get("/subjects");
      setSubjects(Array.isArray(response.data) ? response.data : response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/subjects", {
        courseCode: formData.courseCode,
        abbreviation: formData.abbreviation,
        name: formData.name,
        credits: Number(formData.credits),
      });
      setIsModalOpen(false);
      setFormData({ courseCode: "", abbreviation: "", name: "", credits: "3" });
      fetchSubjects(); // Refresh the table
      toast({
        title: "Subject saved",
        description: "The new course has been added to the catalog.",
      });
    } catch (error) {
      console.error("Failed to save subject:", error);
      toast({
        title: "Error saving subject",
        description: "Check the browser console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-slate-500 font-medium">CampusIQ / Subjects</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Course Catalog</h1>
          </div>
        </header>

        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Curriculum</p>
            <p className="text-sm font-semibold text-slate-900">Manage Subjects</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white">
            + Add Subject
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[70vh]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow className="h-8 hover:bg-slate-50">
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Course Code</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Subject Abbreviation</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Subject Name</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-bold text-slate-700 whitespace-nowrap">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={4} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">Loading subjects...</TableCell>
                </TableRow>
              ) : subjects.length === 0 ? (
                <TableRow className="h-8 hover:bg-slate-50">
                  <TableCell colSpan={4} className="h-8 px-2 py-1 text-xs whitespace-nowrap text-center">No subjects found. Click "Add Subject" to create one.</TableCell>
                </TableRow>
              ) : (
                subjects.map((subject) => (
                  <TableRow key={subject.id} className="h-8 hover:bg-slate-50">
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap"><span className="font-semibold text-slate-900">{subject.code}</span></TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{subject.abbreviation ?? toAbbreviation(subject.name)}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{subject.name}</TableCell>
                    <TableCell className="h-8 px-2 py-1 text-xs whitespace-nowrap">{subject.credits}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-slate-900">Add New Subject</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">Create a new course in the catalog.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Course Code</label>
                  <Input required type="text" placeholder="e.g., CS101" value={formData.courseCode} onChange={e => setFormData({...formData, courseCode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Abbreviation</label>
                  <Input required type="text" placeholder="e.g., DSA" value={formData.abbreviation} onChange={e => setFormData({...formData, abbreviation: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                  <Input required type="text" placeholder="e.g., Data Structures and Algorithms" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Credits</label>
                  <Input required type="number" min="1" max="6" value={formData.credits} onChange={e => setFormData({...formData, credits: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white">Save Subject</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Subjects;
