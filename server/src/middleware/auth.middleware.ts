import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/users";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

interface JwtPayload {
  id: string;
  role?: string;
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export const authorizeRoles = (...roles: string[]) => (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.role || (req.user.role !== "superadmin" && !roles.includes(req.user.role))) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
    });
  }

  next();
};

export const authorizeArea = (...areas: string[]) => async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user?.role === "admin" || req.user?.role === "superadmin") return next();
    if (req.user?.role !== "staff") return res.status(403).json({ message: "Staff access is required." });
    const user = await User.findById(req.user.id).select("department permissions status").lean();
    const legacyDepartmentAreas: Record<string, string[]> = {
      sales: ["sales", "sites"], production: ["production"], warehouse: ["inventory"],
      procurement: ["procurement", "inventory"], finance: ["finance", "reports"],
      marketing: ["sales", "reports", "sites"], hr: ["staff"],
      customer_service: ["sales", "sites"], sites: ["sites"],
      management: ["sales", "production", "inventory", "procurement", "finance", "staff", "reports", "sites"],
    };
    const assigned = user?.permissions?.length ? user.permissions : legacyDepartmentAreas[String(user?.department)] || [];
    if (!user || user.status !== "active" || !areas.some((area) => assigned.includes(area))) {
      return res.status(403).json({ message: "You do not have access to this workspace." });
    }
    next();
  } catch (error) {
    next(error);
  }
};
