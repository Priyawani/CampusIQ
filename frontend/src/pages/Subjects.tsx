import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  department: string;
}

function Subjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "", name: "", credits: "3", department: ""
  });

  const handleLogout = () => {
    localStorage.removeItem("campusiq_token");
    navigate("/");
  };

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
      await api.post("/subjects", formData);
      setIsModalOpen(false);
      setFormData({ code: "", name: "", credits: "3", department: "" });
      fetchSubjects(); // Refresh the table
    } catch (error) {
      console.error("Failed to save subject:", error);
      alert("Error saving subject. Check console.");
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
          <button className="nav-item" onClick={() => navigate("/attendance")}><span>▣</span> Attendance</button>
          <button className="nav-item" onClick={() => navigate("/marks")}><span>◆</span> Marks</button>
          <button className="nav-item active"><span>◈</span> Subjects</button>
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
            <p className="breadcrumb">CampusIQ / Subjects</p>
            <h1>Course Catalog</h1>
          </div>
        </header>

        <section className="dashboard">
          <div className="section-header">
            <div>
              <p className="eyebrow">CURRICULUM</p>
              <h2>Manage Subjects</h2>
            </div>
            <button className="primary-button" onClick={() => setIsModalOpen(true)}>
              + Add Subject
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Name</th>
                  <th>Credits</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: "center" }}>Loading subjects...</td></tr>
                ) : subjects.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#6b7280" }}>No subjects found. Click "Add Subject" to create one.</td></tr>
                ) : (
                  subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td><strong>{subject.code}</strong></td>
                      <td>{subject.name}</td>
                      <td>{subject.credits}</td>
                      <td>{subject.department}</td>
                      <td><button className="action-button">Edit</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Add Subject Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Subject</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Subject Code</label>
                <input required type="text" placeholder="e.g., CS101" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Subject Name</label>
                <input required type="text" placeholder="e.g., Data Structures" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Credits</label>
                <input required type="number" min="1" max="6" value={formData.credits} onChange={e => setFormData({...formData, credits: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input required type="text" placeholder="e.g., CSE" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subjects;