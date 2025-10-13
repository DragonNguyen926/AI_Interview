import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export interface AuthedUser {
  id: string;
  email: string;
  role: "ADMIN" | "INTERVIEWER" | "CANDIDATE";
}
export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith("Bearer ")) return res.status(401).json({ error: "missing token" });
  const token = hdr.slice(7);
  try {
    req.user = jwt.verify(token, SECRET) as AuthedUser;
    next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}
