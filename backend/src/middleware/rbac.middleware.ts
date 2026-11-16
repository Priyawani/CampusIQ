import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";

/**
 * Role-Based Access Control middleware.
 *
 * Takes an array of allowed roles and returns 403 Forbidden when the
 * `req.user.role` from the verified JWT doesn't match. Must be used
 * after `authenticateToken` so that `req.user` is populated.
 *
 * @example
 * router.post("/predict-performance", authenticateToken, authorizeRoles("ADMIN", "FACULTY"), handler);
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[rbac] 403 ${req.method} ${req.path} — Role "${req.user.role}" not in [${allowedRoles.join(", ")}]`);
      return res.status(403).json({
        message: "You do not have permission to access this resource"
      });
    }

    next();
  };
};
