import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

interface Student {
  id: string;
  name: string;
  email: string;
  enrollmentNo: string;
  department: string;
}

function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", email: "", enrollmentNo: "", department: ""
  });

  const handleLogout = () => {
    localStorage.removeItem("campusiq_token");
    navigate("/");
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get("/students");
      if (Array.isArray(response.data)) {
        setStudents(response.data);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        setStudents(response.data.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: "", email: "", enrollmentNo: "", department: "" });
    setIsModalOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      name: student.name,
      email: student.email,
      enrollmentNo: student.enrollmentNo,
      department: student.department
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, formData); 
      } else {
        await api.post("/students", formData); 
      }
      setIsModalOpen(false);
      setFormData({ name: "", email: "", enrollmentNo: "", department: "" });
      setEditingId(null);
      fetchStudents(); 
    } catch (error) {
      console.error("Failed to save student:", error);
      alert("Error saving student. Check console.");
    }
  };

  return (
    <div className="app">
      {/* --- PROPERLY ENCLOSED SIDEBAR --- */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">C</div>
          <div>
            <h2>CampusIQ</h2>
            <span>Student Intelligence</span>
          </div>
        </div>

        {/* FIXED: Cleaned up duplicates so there is exactly one of each! */}
        <nav className="navigation">
          <button className="nav-item" onClick={() => navigate("/dashboard")}><span>⌂</span> Dashboard</button>
          <button className="nav-item active"><span>◉</span> Students</button>
          <button className="nav-item" onClick={() => navigate("/attendance")}><span>▣</span> Attendance</button>
          <button className="nav-item" onClick={() => navigate("/marks")}><span>◆</span> Marks</button>
          <button className="nav-item" onClick={() => navigate("/subjects")}><span>◈</span> Subjects</button>
          <button className="nav-item" onClick={() => navigate("/ai-predictions")}><span>✦</span> AI Predictions</button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item"><span>⚙</span> Settings</button>
          <button className="nav-item" onClick={handleLogout}><span>↪</span> Logout</button>
        </div>
      </aside>

      {/* --- PROPERLY ENCLOSED MAIN CONTENT --- */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">CampusIQ / Students</p>
            <h1>Student Directory</h1>
          </div>
        </header>

        <section className="dashboard">
          <div className="section-header">
            <div>
              <p className="eyebrow">DIRECTORY</p>
              <h2>Manage Students</h2>
            </div>
            <button className="primary-button" onClick={handleOpenAdd}>
              + Add Student
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enrollment No.</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>Loading students...</td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#6b7280" }}>
                      No students found. Click "Add Student" to create one.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id}>
                      <td><strong>{student.enrollmentNo}</strong></td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.department}</td>
                      <td>
                        <button className="action-button" onClick={() => handleEditClick(student)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? "Edit Student" : "Add New Student"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email (Login ID)</label>
                <input required type="email" value={formData.email} disabled={!!editingId} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Enrollment No.</label>
                <input required type="text" value={formData.enrollmentNo} onChange={e => setFormData({...formData, enrollmentNo: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input required type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button">{editingId ? "Update Student" : "Save Student"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;