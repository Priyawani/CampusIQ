import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    departmentId: number | null;
    assignedClasses: number[];
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log(`[auth] 401 ${req.method} ${req.path} — Missing token in header (no Authorization header)`);
      return res.status(401).json({
        message: "Authorization header is required"
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      console.log(`[auth] 401 ${req.method} ${req.path} — Invalid authorization format (expected "Bearer <token>")`);
      return res.status(401).json({
        message: "Invalid authorization format"
      });
    }

    const token = parts[1];

    if (!token || token === "null" || token === "undefined") {
      console.log(`[auth] 401 ${req.method} ${req.path} — Missing token in header (empty token; frontend sent "${token}")`);
      return res.status(401).json({
        message: "Authorization header is required"
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "number" ||
      typeof decoded.role !== "string"
    ) {
      console.log(`[auth] 401 ${req.method} ${req.path} — Invalid token payload (expected numeric userId and string role)`);
      return res.status(401).json({
        message: "Invalid token payload"
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      departmentId:
        typeof decoded.departmentId === "number" ? decoded.departmentId : null,
      assignedClasses: Array.isArray(decoded.assignedClasses)
        ? decoded.assignedClasses.filter(
            (id: unknown): id is number => typeof id === "number"
          )
        : []
    };

    next();

  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.log(`[auth] 401 ${req.method} ${req.path} — JWT verification failed (${reason})`);
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};
