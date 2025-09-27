import { Router, Request, Response } from "express";
import { User } from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = Router();

function required(value?: string) {
  return value !== undefined && value !== null && `${value}`.trim().length > 0;
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!required(email) || !required(password)) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already in use." });

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const user = await User.create({ email, passwordHash });

    return res.status(201).json({ message: "User registered", user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!required(email) || !required(password)) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials." });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials." });

    const token = jwt.sign({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
    return res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(payload.sub).select("_id email createdAt");
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
