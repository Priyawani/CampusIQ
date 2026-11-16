import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Profile {
  id: number;
  email: string;
  role: string;
  name: string | null;
  phone: string | null;
  bio: string | null;
  student?: {
    rollNumber: string;
    firstName: string;
    lastName: string;
    department: { code: string; name: string };
  } | null;
}

function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    phone: "",
    bio: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await api.get("/auth/me");
      return response.data as Profile;
    },
  });

  // Pre-fill the form once the profile loads
  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name ?? "",
        email: data.email ?? "",
        department: data.student?.department.code ?? "",
        phone: data.phone ?? "",
        bio: data.bio ?? "",
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const response = await api.put("/auth/me", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setMessage({ type: "success", text: "Profile updated successfully." });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      setMessage({ type: "error", text: "Failed to update profile. Check your input and try again." });
      toast({
        title: "Update failed",
        description: "Check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    updateMutation.mutate(formData);
  };

  const set = (name: keyof typeof formData) => ({
    name,
    value: formData[name],
    onChange: handleChange,
  });

  return (
    <>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-slate-500 font-medium">CampusIQ / Settings</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Account Settings</h1>
          </div>
        </header>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {isLoading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading profile...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
              {message && (
                <div
                  className={
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 text-sm p-3 rounded-md border border-emerald-200 text-center font-medium"
                      : "bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 text-center font-medium"
                  }
                >
                  {message.text}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  {...set("name")}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="name@institution.edu"
                  {...set("email")}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment No</label>
                <input
                  type="text"
                  value={data?.student?.rollNumber ?? ""}
                  readOnly
                  disabled
                  placeholder="—"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g., CSE"
                  {...set("department")}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 ..."
                  {...set("phone")}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                <textarea
                  rows={4}
                  placeholder="A short bio..."
                  {...set("bio")}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                />
              </div>
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default Settings;
