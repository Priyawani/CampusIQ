import express, { Request, Response } from "express";
import authRoutes from "./routes/auth.routes.js";
import testRoutes from "./routes/test.routes.js";
const app = express();

const PORT = 5000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "CampusIQ Backend is running 🚀"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);

app.listen(PORT, () => {
  console.log(`CampusIQ Backend running on http://localhost:${PORT}`);
});
