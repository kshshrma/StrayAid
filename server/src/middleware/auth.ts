import { Request, Response, NextFunction } from "express";
import { supabase } from "../services/supabase";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    req.userId = user.id;

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", req.userId)
      .single();

    if (error || !profile) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Profile not found",
      });
    }

    if (profile.role !== "admin" && profile.role !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admins or NGOs only",
      });
    }

    next();
  } catch (err) {
    console.error("Admin verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Admin authorization failed",
    });
  }
}