import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, MapPin, Pencil, Plus, Trash2, User, X } from "lucide-react";
import api from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface ClassGroupOption {
  id: number;
  name: string;
  year?: number | null;
  departmentId?: number | null;
  specializationId?: number | null;
  specialization?: { id?: number; name?: string | null } | null;
}

interface SubjectOption {
  id: number;
  code?: string | null;
  name: string;
  classGroupIds?: number[];
}

interface FacultyOption {
  id: number;
  name: string;
  email?: string | null;
}

interface TimetableBlock {
  id: number;
  classGroupId: number;
  subjectId: number;
  facultyId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string;
  classGroup?: { id: number; name: string; year?: number | null } | null;
  subject?: { id: number; code?: string | null; name?: string | null } | null;
  faculty?: { id: number; name?: string | null; email?: string | null } | null;
  lessonResources?: unknown[];
}

interface BlocksResponse {
  classGroupId: number;
  count: number;
  blocks: TimetableBlock[];
}

interface BlockPayload {
  classGroupId: number;
  subjectId: number;
  facultyId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string;
}

interface BlockForm {
  classGroupId: string;
  subjectId: string;
  facultyId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
}

interface SaveVariables {
  id?: number;
  payload: BlockPayload;
}

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
] as const;

const EMPTY_FORM: BlockForm = {
  classGroupId: "",
  subjectId: "",
  facultyId: "",
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "10:00",
  roomNumber: "",
};

function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function Timetable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requestedClassGroupId, setRequestedClassGroupId] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<TimetableBlock | null>(null);
  const [form, setForm] = useState<BlockForm>(EMPTY_FORM);

  const classGroupsQuery = useQuery({
    queryKey: ["timetable", "class-groups"],
    queryFn: async (): Promise<ClassGroupOption[]> => {
      const response = await api.get("/students/class-groups");
      return Array.isArray(response.data) ? (response.data as ClassGroupOption[]) : [];
    },
  });

  const subjectsQuery = useQuery({
    queryKey: ["timetable", "subjects"],
    queryFn: async (): Promise<SubjectOption[]> => {
      const response = await api.get("/subjects");
      return Array.isArray(response.data) ? (response.data as SubjectOption[]) : [];
    },
  });

  const facultyQuery = useQuery({
    queryKey: ["timetable", "faculty-options"],
    queryFn: async (): Promise<FacultyOption[]> => {
      const response = await api.get("/timetable/faculty-options");
      return Array.isArray(response.data) ? (response.data as FacultyOption[]) : [];
    },
  });

  const classGroups = useMemo(
    () => classGroupsQuery.data ?? [],
    [classGroupsQuery.data]
  );
  const selectedClassGroupId = requestedClassGroupId ?? classGroups[0]?.id ?? null;

  const blocksQuery = useQuery({
    queryKey: ["timetable", "blocks", selectedClassGroupId],
    queryFn: async (): Promise<BlocksResponse> => {
      const response = await api.get<BlocksResponse>("/timetable/blocks", {
        params: { classGroupId: selectedClassGroupId },
      });
      return response.data;
    },
    enabled: selectedClassGroupId !== null,
  });

  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const facultyOptions = useMemo(() => facultyQuery.data ?? [], [facultyQuery.data]);
  const blocks = useMemo(() => blocksQuery.data?.blocks ?? [], [blocksQuery.data?.blocks]);

  const classSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          selectedClassGroupId === null ||
          !subject.classGroupIds?.length ||
          subject.classGroupIds.includes(selectedClassGroupId)
      ),
    [subjects, selectedClassGroupId]
  );

  const blocksByDay = useMemo(
    () =>
      DAYS.map((day) => ({
        ...day,
        blocks: blocks
          .filter((block) => block.dayOfWeek === day.value)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      })),
    [blocks]
  );

  const selectedClassGroup = classGroups.find((group) => group.id === selectedClassGroupId) ?? null;

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }: SaveVariables) => {
      if (id) {
        await api.put(`/timetable/${id}`, payload);
      } else {
        await api.post("/timetable", payload);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["timetable", "blocks"] });
      toast({
        title: variables.id ? "Timetable slot updated" : "Timetable slot created",
        description: "The weekly schedule has been refreshed.",
      });
      setEditingBlock(null);
      setForm(EMPTY_FORM);
    },
    onError: (error) => {
      console.error("Failed to save timetable slot:", error);
      toast({
        title: "Could not save timetable slot",
        description: "Check the selected class, subject, faculty, and time range.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/timetable/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable", "blocks"] });
      toast({ title: "Timetable slot deleted" });
    },
    onError: (error) => {
      console.error("Failed to delete timetable slot:", error);
      toast({ title: "Could not delete timetable slot", variant: "destructive" });
    },
  });

  const openCreateModal = () => {
    if (selectedClassGroupId === null) {
      toast({
        title: "Select a class first",
        description: "Choose a division before adding a timetable slot.",
        variant: "destructive",
      });
      return;
    }
    setEditingBlock(null);
    setForm({
      ...EMPTY_FORM,
      classGroupId: String(selectedClassGroupId),
      subjectId: classSubjects[0] ? String(classSubjects[0].id) : "",
      facultyId: facultyOptions[0] ? String(facultyOptions[0].id) : "",
    });
  };

  const openEditModal = (block: TimetableBlock) => {
    setEditingBlock(block);
    setForm({
      classGroupId: String(block.classGroupId),
      subjectId: String(block.subjectId),
      facultyId: String(block.facultyId),
      dayOfWeek: String(block.dayOfWeek),
      startTime: block.startTime,
      endTime: block.endTime,
      roomNumber: block.roomNumber,
    });
  };

  const closeModal = () => {
    setEditingBlock(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const classGroupId = Number(form.classGroupId);
    const subjectId = Number(form.subjectId);
    const facultyId = Number(form.facultyId);
    const dayOfWeek = Number(form.dayOfWeek);

    if (
      !classGroupId ||
      !subjectId ||
      !facultyId ||
      !form.startTime ||
      !form.endTime ||
      !form.roomNumber.trim()
    ) {
      toast({
        title: "Missing timetable details",
        description: "Fill in class, subject, faculty, time, and room before saving.",
        variant: "destructive",
      });
      return;
    }

    if (form.startTime >= form.endTime) {
      toast({
        title: "Invalid time range",
        description: "The start time must be earlier than the end time.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      id: editingBlock?.id,
      payload: {
        classGroupId,
        subjectId,
        facultyId,
        dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        roomNumber: form.roomNumber.trim(),
      },
    });
  };

  const isLoading =
    classGroupsQuery.isLoading ||
    subjectsQuery.isLoading ||
    facultyQuery.isLoading ||
    blocksQuery.isLoading;

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">CampusIQ / Department Admin / Timetable</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Weekly Timetable</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, reassign, and remove lecture slots for any division in your department.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" /> Add Slot
        </Button>
      </header>

      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="min-w-64 flex-1">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Class / Division
          </label>
          <select
            value={selectedClassGroupId ?? ""}
            onChange={(event) =>
              setRequestedClassGroupId(event.target.value ? Number(event.target.value) : null)
            }
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>
              Select division
            </option>
            {classGroups.map((classGroup) => (
              <option key={classGroup.id} value={classGroup.id}>
                Year {classGroup.year ?? "—"} · {classGroup.name}
                {classGroup.specialization?.name ? ` · ${classGroup.specialization.name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Scheduled slots</p>
          <p className="text-2xl font-bold text-slate-900">{blocks.length}</p>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading timetable...
        </div>
      ) : blocksQuery.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Unable to load this division&apos;s timetable. Check your department access and try again.
        </div>
      ) : selectedClassGroupId === null ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Select a class to view its weekly schedule.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {blocksByDay.map((day) => (
            <section key={day.value} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">{day.label}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {day.blocks.length}
                </span>
              </header>
              <div className="space-y-3 p-3">
                {day.blocks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                    No lectures
                  </p>
                ) : (
                  day.blocks.map((block) => (
                    <article
                      key={block.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {block.subject?.name ?? "Untitled subject"}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-indigo-600">
                            {block.subject?.code ?? "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${block.subject?.name ?? "slot"}`}
                            onClick={() => openEditModal(block)}
                            className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-indigo-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${block.subject?.name ?? "slot"}`}
                            onClick={() => deleteMutation.mutate(block.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                        <p className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                          {formatTime(block.startTime)} – {formatTime(block.endTime)}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          Room {block.roomNumber}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {block.faculty?.name ?? "Unassigned"}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {form.classGroupId !== "" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingBlock ? "Edit timetable slot" : "Add timetable slot"}
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingBlock ? "Edit Timetable Slot" : "Add Timetable Slot"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedClassGroup?.name ?? "Select a division"} · Monday to Friday
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Class / Division
                </label>
                <select
                  required
                  value={form.classGroupId}
                  onChange={(event) => setForm({ ...form, classGroupId: event.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>
                    Select division
                  </option>
                  {classGroups.map((classGroup) => (
                    <option key={classGroup.id} value={classGroup.id}>
                      {classGroup.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Day
                </label>
                <select
                  required
                  value={form.dayOfWeek}
                  onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Subject
                </label>
                <select
                  required
                  value={form.subjectId}
                  onChange={(event) => setForm({ ...form, subjectId: event.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>
                    Select subject
                  </option>
                  {classSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code ? `${subject.code} · ` : ""}
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Faculty
                </label>
                <select
                  required
                  value={form.facultyId}
                  onChange={(event) => setForm({ ...form, facultyId: event.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>
                    Select faculty
                  </option>
                  {facultyOptions.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Start Time
                </label>
                <Input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  End Time
                </label>
                <Input
                  required
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Room Number
                </label>
                <Input
                  required
                  value={form.roomNumber}
                  onChange={(event) => setForm({ ...form, roomNumber: event.target.value })}
                  placeholder="e.g., A-204"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {saveMutation.isPending
                    ? "Saving..."
                    : editingBlock
                      ? "Save Changes"
                      : "Create Slot"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Timetable;
