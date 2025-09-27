import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

// ✅ include .js extensions for compiled files
import authRoutes from "./routes/auth.js";
import ragRoutes from "./routes/ragRoutes.js";

const app = express();

// --- middleware (order matters)
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// ✅ robust CORS allow-list
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
// e.g. CORS_ORIGIN="https://your-frontend.vercel.app,http://localhost:5173"

app.use(
  cors({
    origin(origin, cb) {
      // allow server-to-server/no-origin tools
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// optional: explicit preflight handler
app.options("*", cors());

// tiny logger to confirm POST actually arrives
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/rag", ragRoutes);

// health + friendly root
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) =>
  res.type("text/plain").send("FHIR Chatbot API running. Try /health.")
);

async function bootstrap() {
  const mongo = process.env.MONGO_URI;
  if (!mongo) { console.error("Missing MONGO_URI"); process.exit(1); }
  await mongoose.connect(mongo);
  console.log("Connected to MongoDB");

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}
bootstrap().catch((e) => { console.error("Failed to start server", e); process.exit(1); });
