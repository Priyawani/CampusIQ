import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

interface Student {
  id: string;
  name: string;
  enrollmentNo: string;
}

interface PredictionResult {
  studentName: string;
  predictedGrade: string;
  confidenceScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  factors: string[];
}

function AIPredictions() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("campusiq_token");
    navigate("/");
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get("/students");
        // FIXED: Using the robust fetch logic that works perfectly on your Students page!
        if (Array.isArray(response.data)) {
          setStudents(response.data);
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          setStudents(response.data.data);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };
    fetchStudents();
  }, []);

  const handlePredict = async () => {
    if (!selectedStudentId) return alert("Please select a student first.");
    
    setLoading(true);
    setPrediction(null);
    try {
      console.log("Sending request to Node.js backend...");
      const response = await api.post("/ai/predict-performance", { studentId: selectedStudentId });
      
      console.log("Success! Data received from Python via Node:", response.data);
      setPrediction(response.data); 
      
    } catch (error) {
      console.error("Prediction failed:", error);
      alert("Failed to run prediction. Check browser console.");
    } finally {
      setLoading(false);
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
          <button className="nav-item" onClick={() => navigate("/subjects")}><span>◈</span> Subjects</button>
          <button className="nav-item active"><span>✦</span> AI Predictions</button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item"><span>⚙</span> Settings</button>
          <button className="nav-item" onClick={handleLogout}><span>↪</span> Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-transition">
          <header className="topbar">
            <div>
              <p className="breadcrumb">CampusIQ / Artificial Intelligence</p>
              <h1>Performance Prediction</h1>
            </div>
          </header>

          <section className="dashboard">
            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
              <div>
                <p className="eyebrow" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>CATBOOST MODEL</p>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Run Student Inference</h2>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', fontSize: '0.875rem' }}>Select Student to Analyze</label>
                  <select 
                    value={selectedStudentId} 
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', color: 'var(--text-main)' }}
                  >
                    <option value="">-- Choose a student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.enrollmentNo})</option>
                    ))}
                  </select>
                </div>
                <button 
                  className="primary-button" 
                  onClick={handlePredict}
                  disabled={loading}
                  style={{ padding: '0.75rem 2rem', height: '45px' }}
                >
                  {loading ? "Analyzing..." : "Predict Performance"}
                </button>
              </div>
            </div>

            {prediction && (
              <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', borderTop: `4px solid ${prediction.riskLevel === 'HIGH' ? '#ef4444' : '#10b981'}`, boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-main)' }}>Analysis Results for {prediction.studentName}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Predicted Grade</p>
                    <strong style={{ fontSize: '2rem', color: 'var(--text-main)' }}>{prediction.predictedGrade}</strong>
                  </div>
                  <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Confidence Score</p>
                    <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>{prediction.confidenceScore}%</strong>
                  </div>
                  <div style={{ padding: '1.5rem', background: prediction.riskLevel === 'HIGH' ? '#fef2f2' : '#ecfdf5', borderRadius: '8px', textAlign: 'center', border: `1px solid ${prediction.riskLevel === 'HIGH' ? '#fecaca' : '#a7f3d0'}` }}>
                    <p style={{ color: prediction.riskLevel === 'HIGH' ? '#991b1b' : '#065f46', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Risk Status</p>
                    <strong style={{ fontSize: '1.5rem', color: prediction.riskLevel === 'HIGH' ? '#dc2626' : '#059669' }}>
                      {prediction.riskLevel} RISK
                    </strong>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Key Determining Factors (SHAP Explanations):</h4>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    {prediction.factors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default AIPredictions;