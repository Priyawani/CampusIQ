import { useEffect, useState } from "react";
import api from "../services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  useEffect(() => {
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
      }
    };
    fetchStudents();
  }, []);

  const handlePredict = async () => {    if (!selectedStudentId) {
      toast({
        title: "No student selected",
        description: "Please select a student first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPrediction(null);
    try {
      console.log("Sending request to Node.js backend...");
      
      // 1. Manually grab the token from local storage
      const token = localStorage.getItem("campusiq_token");

      // 2. Explicitly force the Authorization header into this request
      const response = await api.post(
        "/ai/predict-performance", 
        { studentId: selectedStudentId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log("Success! Data received from Python via Node:", response.data);
      setPrediction(response.data);

    } catch (error) {
      console.error("Prediction failed:", error);
      toast({
        title: "Prediction Failed",
        description: "Check the browser console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Map string-only SHAP explanations into chart data with mock impact
  // weights (top-listed factors weigh more; sign follows the direction word)
  const factorChartData = (prediction?.factors ?? []).map((factor, idx, arr) => {
    const direction = factor.toLowerCase().includes("negative") ? -1 : 1;
    const feature = factor.includes(" had a ") ? factor.split(" had a ")[0] : factor;
    return {
      feature,
      impact: direction * ((arr.length - idx) * 10 + 20),
    };
  });

  return (
    <>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-slate-500 font-medium">CampusIQ / Artificial Intelligence</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Performance Prediction</h1>
          </div>
        </header>

        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex-1 mr-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Student to Analyze</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">-- Choose a student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.enrollmentNo})</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handlePredict}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 text-white self-end"
          >
            {loading ? "Analyzing..." : "Predict Performance"}
          </Button>
        </div>

        {prediction && (
          <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-4 ${prediction.riskLevel === 'HIGH' ? 'border-t-rose-500' : 'border-t-emerald-500'}`}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Analysis Results for {prediction.studentName}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-slate-500 text-sm mb-2">Predicted Grade</p>
                  <strong className="text-3xl font-bold text-slate-900">{prediction.predictedGrade}</strong>
                </div>
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-slate-500 text-sm mb-2">Confidence Score</p>
                  <strong className="text-3xl font-bold text-indigo-600">{prediction.confidenceScore}%</strong>
                </div>
                <div className={`p-6 rounded-xl border text-center ${prediction.riskLevel === 'HIGH' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-sm mb-2 ${prediction.riskLevel === 'HIGH' ? 'text-rose-800' : 'text-emerald-800'}`}>Risk Status</p>
                  <strong className={`text-2xl font-bold ${prediction.riskLevel === 'HIGH' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {prediction.riskLevel} RISK
                  </strong>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Key Determining Factors (SHAP Explanations):</h4>
                <p className="text-xs text-slate-500 mb-4">Bars to the right push the grade up; bars to the left drag it down. Weights are illustrative until the backend returns numeric SHAP values.</p>
                <ResponsiveContainer width="100%" height={Math.max(220, factorChartData.length * 44)}>
                  <BarChart data={factorChartData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 24 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis type="category" dataKey="feature" width={170} tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="impact" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AIPredictions;