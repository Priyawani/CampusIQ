import { Link } from "react-router-dom";
import { CalendarCheck, GraduationCap, BookOpen } from "lucide-react";

function Academics() {
  const cards = [
    { to: "/attendance", title: "Attendance", desc: "Track and manage attendance records", icon: CalendarCheck, color: "text-teal-600" },
    { to: "/marks", title: "Marks", desc: "Enter and review assessments", icon: GraduationCap, color: "text-purple-600" },
    { to: "/subjects", title: "Subjects", desc: "Curriculum and subject mapping", icon: BookOpen, color: "text-blue-600" },
  ];
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Academics</h1>
      <p className="text-sm text-slate-600">Attendance & Marks management hub.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ to, title, desc, icon: Icon, color }) => (
          <Link key={to} to={to} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
            <Icon className={`h-6 w-6 ${color} mb-3`} />
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Academics;
