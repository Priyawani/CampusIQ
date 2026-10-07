import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

function Dashboard() {
  const navigate = useNavigate();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("campusiq_token");
    navigate("/");
  };

  useEffect(() => {
    const fetchStudentCount = async () => {
      try {
        const response = await api.get("/students");
        const students = response.data;

        if (Array.isArray(students)) {
          setStudentCount(students.length);
        } else if (Array.isArray(students.data)) {
          setStudentCount(students.data.length);
        } else {
          setStudentCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentCount();
  }, []);

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

        {/* Clean, single set of navigation links */}
        <nav className="navigation">
          <button className="nav-item active">
            <span>⌂</span> Dashboard
          </button>
          <button className="nav-item" onClick={() => navigate("/students")}>
            <span>◉</span> Students
          </button>
          <button className="nav-item" onClick={() => navigate("/attendance")}>
            <span>▣</span> Attendance
          </button>
          <button className="nav-item" onClick={() => navigate("/marks")}>
            <span>◆</span> Marks
          </button>
          <button className="nav-item" onClick={() => navigate("/subjects")}>
            <span>◈</span> Subjects
          </button>
          <button className="nav-item" onClick={() => navigate("/ai-predictions")}>
            <span>✦</span> AI Predictions
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <span>⚙</span> Settings
          </button>
          <button className="nav-item" onClick={handleLogout}>
            <span>↪</span> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-transition">
          <header className="topbar">
            <div>
              <p className="breadcrumb">CampusIQ / Dashboard</p>
              <h1>Dashboard</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#eef2ff', color: '#4f46e5', padding: '0.5rem', borderRadius: '50%', fontWeight: 'bold' }}>PW</div>
              <div style={{ fontSize: '0.875rem' }}>
                <strong>Priyadarshini Wani</strong><br/>
                <span style={{ color: '#6b7280' }}>Administrator</span>
              </div>
            </div>
          </header>

          <section className="dashboard">
            {/* Welcome Banner */}
            <div style={{ background: 'var(--primary-gradient)', color: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
              <p style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', opacity: 0.9 }}>Student Intelligence Platform</p>
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome to CampusIQ 👋</h2>
              <p style={{ opacity: 0.9 }}>Monitor academic performance, attendance and student insights from one place.</p>
            </div>

            {/* Metrics Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Students</p>
                <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{loadingStudents ? "..." : studentCount}</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.5rem' }}>Registered students</p>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Attendance</p>
                <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>—</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.5rem' }}>Overall attendance</p>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Average Performance</p>
                <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>—</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.5rem' }}>Academic average</p>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>AI Predictions</p>
                <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>AI</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.5rem' }}>Predict student performance</p>
              </div>
            </div>

            {/* AI Section */}
            <div className="section-header" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <p className="eyebrow" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>ARTIFICIAL INTELLIGENCE</p>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Student Performance Prediction</h2>
              </div>
              <button className="primary-button" onClick={() => navigate("/ai-predictions")}>
                Predict Performance
              </button>
            </div>

            <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '1.5rem' }}>🤖</div>
                <div>
                  <h4 style={{ margin: 0, marginBottom: '0.25rem', color: 'var(--text-main)' }}>AI-powered academic prediction</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>CampusIQ uses machine learning to estimate student academic performance and provide explainable insights.</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, marginBottom: '0.25rem' }}>Model Status</p>
                <strong style={{ color: '#10b981', fontSize: '0.875rem' }}>● Ready</strong>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;