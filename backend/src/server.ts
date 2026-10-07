import cors from "cors";
import aiRoutes from "./routes/ai.routes";
import marksRoutes from "./routes/marks.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";
import studentRoutes from "./routes/student.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.routes.js";
import testRoutes from "./routes/test.routes.js";
const app = express();

const PORT = 5000;
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "CampusIQ Backend is running 🚀"
  });
});

app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/marks", marksRoutes);
app.listen(PORT, () => {
  console.log(`CampusIQ Backend running on http://localhost:${PORT}`);
});
