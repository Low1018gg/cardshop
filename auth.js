import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { must } from "./utils.js";

const prisma = new PrismaClient();
export const authRouter = express.Router();

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { email, password: hash, role: "MERCHANT" } });
    return res.json({ id: user.id, email: user.email });
  } catch (e) {
    return res.status(400).json({ error: "Email exists?" });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const secret = must(process.env.JWT_SECRET, "JWT_SECRET");
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, secret, { expiresIn: "7d" });

  res.json({ token });
});
