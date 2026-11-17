import cors from "cors";
import dashboardRoutes from "./routes/dashboard.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import academicRoutes from "./routes/academic.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";
import studentRoutes from "./routes/student.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.routes.js";
import testRoutes from "./routes/test.routes.js";
import { initAttendanceCron } from "./jobs/attendanceCron.js";
const app = express();

const PORT = Number(process.env.PORT) || 5000;
// Explicit CORS so browsers can complete the OPTIONS preflight for
// POST/PUT/DELETE with an Authorization header before auth middleware runs.
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "CampusIQ Backend is running 🚀"
  });
});

app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api", academicRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/enrollments", enrollmentRoutes);
initAttendanceCron();

app.listen(PORT, () => {
  console.log(`CampusIQ Backend running on http://localhost:${PORT}`);
});
