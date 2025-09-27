import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

// your existing auth route compiled to .js
import authRoutes from "./routes/auth.js";

// RAG routes (TypeScript). If you run compiled JS from dist, change to: "./routes/ragRoutes.js"
import ragRoutes from "./routes/ragRoutes";

const app = express();

// small JSON limit; RAG uploads use multipart via multer
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/rag", ragRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

async function bootstrap() {
  const mongo = process.env.MONGO_URI;
  if (!mongo) { console.error("Missing MONGO_URI"); process.exit(1); }
  await mongoose.connect(mongo);
  console.log("Connected to MongoDB");

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}

bootstrap().catch((e) => { console.error("Failed to start server", e); process.exit(1); });
