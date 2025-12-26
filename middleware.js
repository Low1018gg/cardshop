import jwt from "jsonwebtoken";
import { must } from "./utils.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const secret = must(process.env.JWT_SECRET, "JWT_SECRET");
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
