import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

interface Student {
  id: string;
  name: string;
  enrollmentNo: string;
  department: string;
}

function Attendance() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleLogout = () => {
    localStorage.removeItem("campusiq_token");
    navigate("/");
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get("/students");
        setStudents(Array.isArray(response.data) ? response.data : response.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const markAttendance = async (studentId: string, status: "PRESENT" | "ABSENT") => {
    try {
      // We will build this backend route next!
      await api.post("/attendance", {
        studentId,
        date: selectedDate,
        status
      });
      alert(`Marked ${status} successfully!`);
    } catch (error) {
      console.error("Failed to mark attendance:", error);
      alert("Error marking attendance. We need to update the backend route!");
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">C</div>
          <div>
            <h2>CampusIQ</h2>
            <span>Student Intelligence</span>
          </div>
        </div>

        <nav className="navigation">
          <button className="nav-item" onClick={() => navigate("/dashboard")}><span>⌂</span> Dashboard</button>
          <button className="nav-item" onClick={() => navigate("/students")}><span>◉</span> Students</button>
          <button className="nav-item active"><span>▣</span> Attendance</button>
          <button className="nav-item" onClick={() => navigate("/marks")}>
            <span>◆</span> Marks
          </button>

          <button className="nav-item" onClick={() => navigate("/subjects")}>
         <span>◈</span> Subjects
       </button>
          <button className="nav-item"><span>◆</span> Marks</button>
          <button className="nav-item"><span>◈</span> Subjects</button>
          <button className="nav-item"><span>✦</span> AI Predictions</button>
        </nav>

        <button className="nav-item" onClick={() => navigate("/ai-predictions")}>
         <span>✦</span> AI Predictions
       </button>

        <div className="sidebar-bottom">
          <button className="nav-item"><span>⚙</span> Settings</button>
          <button className="nav-item" onClick={handleLogout}><span>↪</span> Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">CampusIQ / Attendance</p>
            <h1>Daily Attendance</h1>
          </div>
        </header>

        <section className="dashboard">
          <div className="section-header">
            <div>
              <p className="eyebrow">TRACKING</p>
              <h2>Mark Attendance</h2>
            </div>
            <div>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enrollment No.</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: "center" }}>Loading students...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center" }}>No students found.</td></tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id}>
                      <td><strong>{student.enrollmentNo}</strong></td>
                      <td>{student.name}</td>
                      <td>{student.department}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="action-button" 
                            style={{ backgroundColor: '#def7ec', color: '#03543f', borderColor: '#31c48d' }}
                            onClick={() => markAttendance(student.id, "PRESENT")}
                          >
                            Present
                          </button>
                          <button 
                            className="action-button" 
                            style={{ backgroundColor: '#fde8e8', color: '#9b1c1c', borderColor: '#f8b4b4' }}
                            onClick={() => markAttendance(student.id, "ABSENT")}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Attendance;