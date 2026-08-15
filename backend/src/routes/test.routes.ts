import express, { Response } from "express";
import {
  authenticateToken,
  AuthRequest
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/profile",
  authenticateToken,
  (req: AuthRequest, res: Response) => {
    res.json({
      message: "You accessed a protected route successfully!",
      user: req.user
    });
  }
);

export default router;
