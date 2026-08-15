import express, { Response } from "express";
import {
  authenticateToken,
  AuthRequest
} from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();


// Any authenticated user
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


// Only ADMIN users
router.get(
  "/admin",
  authenticateToken,
  authorizeRoles("ADMIN"),
  (req: AuthRequest, res: Response) => {
    res.json({
      message: "Welcome Admin!",
      user: req.user
    });
  }
);


// STUDENT and FACULTY
router.get(
  "/academic",
  authenticateToken,
  authorizeRoles("STUDENT", "FACULTY"),
  (req: AuthRequest, res: Response) => {
    res.json({
      message: "You can access academic resources",
      user: req.user
    });
  }
);

export default router;
