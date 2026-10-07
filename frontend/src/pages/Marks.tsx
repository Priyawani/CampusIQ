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

function Marks() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    examType: "MIDTERM",
    marksObtained: "",
    maxMarks: "100"
  });

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

  const handleOpenModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ examType: "MIDTERM", marksObtained: "", maxMarks: "100" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    try {
      await api.post("/marks", {
        studentId: selectedStudent.id,
        examType: formData.examType,
        marksObtained: parseFloat(formData.marksObtained),
        maxMarks: parseFloat(formData.maxMarks)
      });
      alert(`Marks saved successfully for ${selectedStudent.name}!`);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save marks:", error);
      alert("Error saving marks. Check console.");
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

        <nav className="navigation">
          <button className="nav-item" onClick={() => navigate("/dashboard")}><span>⌂</span> Dashboard</button>
          <button className="nav-item" onClick={() => navigate("/students")}><span>◉</span> Students</button>
          <button className="nav-item" onClick={() => navigate("/attendance")}><span>▣</span> Attendance</button>
          <button className="nav-item active"><span>◆</span> Marks</button>
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
            <p className="breadcrumb">CampusIQ / Marks</p>
            <h1>Academic Records</h1>
          </div>
        </header>

        <section className="dashboard">
          <div className="section-header">
            <div>
              <p className="eyebrow">GRADING</p>
              <h2>Enter Student Marks</h2>
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
                        {/* Cleaned up action button styling */}
                        <button 
                          className="primary-button" 
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }} 
                          onClick={() => handleOpenModal(student)}
                        >
                          + Add Marks
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

      {/* Enter Marks Modal */}
      {isModalOpen && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Enter Marks</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Student: <strong>{selectedStudent.name}</strong> ({selectedStudent.enrollmentNo})
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Exam Type</label>
                <select 
                  value={formData.examType} 
                  onChange={e => setFormData({...formData, examType: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '0.25rem' }}
                >
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="INTERNAL">Internal Exam</option>
                  <option value="MIDTERM">Midterm</option>
                  <option value="END_SEMESTER">End Semester</option>
                </select>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Marks Obtained</label>
                <input required type="number" step="0.1" value={formData.marksObtained} onChange={e => setFormData({...formData, marksObtained: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Max Marks</label>
                <input required type="number" step="0.1" value={formData.maxMarks} onChange={e => setFormData({...formData, maxMarks: e.target.value})} />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button">Save Marks</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Marks;