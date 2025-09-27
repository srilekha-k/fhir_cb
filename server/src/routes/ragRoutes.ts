import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";
import OpenAI from "openai";

import { extractTextFromFile, chunkText } from "../utils/text";
import { embedMany, embedOne, cosine } from "../utils/embeddings";
import { loadIndex, saveIndex, RagChunk } from "../rag/store";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Upload limits to avoid OOM on huge files
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
    files: 1,
  },
});

async function embedInBatches(chunks: string[], batchSize = 32): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    const vecs = await embedMany(slice);
    out.push(...vecs);
    // yield to event loop; helps GC under watch mode
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}

const router = Router();

/** ---------------------------
 *  POST /api/rag/upload
 *  form-data: file
 *  -------------------------- */
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1) Extract text (with safe fallbacks inside extractTextFromFile)
    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    if (!text || !text.trim()) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: "Could not extract text from file" });
    }

    // 2) Chunk safely (guarantees progress; avoids runaway overlap)
    const chunks = chunkText(text, 1000, 150);

    // 3) Embed in batches to keep memory stable
    const embeddings = await embedInBatches(chunks, 32);

    // 4) Persist to JSON index (demo-scale)
    const index = await loadIndex();
    const rows: RagChunk[] = chunks.map((chunk, i) => ({
      id: uuid(),
      fileName: req.file!.originalname,
      chunk,
      embedding: embeddings[i],
    }));
    await saveIndex([...index, ...rows]);

    // 5) Cleanup temp upload file
    await fs.unlink(req.file.path).catch(() => {});

    // 6) Release large arrays (clear in place; no const reassignment)
    chunks.length = 0;
    embeddings.length = 0;

    res.json({ ok: true, fileName: req.file.originalname, chunks: rows.length });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Upload failed" });
  }
});

/** --------------------------------------------------------
 *  POST /api/rag/ask
 *  body: { question: string, topK?: number, allowGeneral?: boolean }
 *  RAG + general medical knowledge (clearly labeled & safe)
 *  ------------------------------------------------------- */
router.post("/ask", async (req: Request, res: Response) => {
  try {
    const { question, topK = 5, allowGeneral = true } = req.body || {};
    if (!question) return res.status(400).json({ error: "Missing question" });

    // 1) Embed the question (OpenAI embeddings)
    const qVec = await embedOne(question);

    // 2) Load your local vector index (uploaded docs)
    const index = await loadIndex();
    if (index.length === 0) {
      return res.status(400).json({ error: "No documents indexed yet" });
    }

    // 3) Vector similarity search locally (RAG)
    const scored = index
      .map((row) => ({ row, score: cosine(qVec, row.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(topK, 10)));

    // 4) Build concise context to stay within token limits
    const context = scored
      .map((s, i) => `[[${i + 1}]] ${s.row.chunk}`)
      .join("\n\n")
      .slice(0, 12000); // keep prompt size reasonable

    // 5) System rules: docs are primary; general knowledge allowed if not conflicting
    const rules = [
      "You are a medical assistant. Answer succinctly and factually in 4–8 sentences.",
      "Use the DOCUMENT CONTEXT as the primary source of truth for patient-specific facts.",
      allowGeneral
        ? "You MAY add general medical knowledge for background (guidelines, definitions) ONLY if it does not conflict with the documents."
        : "Do NOT use any knowledge outside the DOCUMENT CONTEXT.",
      "If information is missing in the documents, state that clearly.",
      "Cite statements grounded in the documents with bracketed markers [1], [2], etc.",
      "If you add background knowledge, include a short section titled 'General medical context (non-document)' with 1–3 bullet points.",
      "Never invent patient-specific facts (e.g., diagnoses, doses, allergies) that are not present in the documents.",
    ].join("\n");

    const prompt = `DOCUMENT CONTEXT:
${context}

USER QUESTION:
${question}

RESPONSE FORMAT:
- Start with a concise answer in 4–8 sentences.
- Include bracketed citations like [1], [2] for any claims sourced from the documents.
- If you add general knowledge, append a short section titled "General medical context (non-document)" with 1–3 bullets.
- If unsure or insufficient evidence in the docs, say so.`;

    // 6) Ask OpenAI to synthesize answer
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: rules },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      // max_tokens: 450, // optional hard cap
    });

    const answer = completion.choices[0]?.message?.content?.trim() || "";

    const sources = scored.map((s, i) => ({
      marker: `[${i + 1}]`,
      fileName: s.row.fileName,
      preview: s.row.chunk.slice(0, 180) + (s.row.chunk.length > 180 ? "…" : ""),
      score: Number(s.score.toFixed(3)),
    }));

    res.json({ answer, sources, usedGeneralKnowledge: Boolean(allowGeneral) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Ask failed" });
  }
});

export default router;
