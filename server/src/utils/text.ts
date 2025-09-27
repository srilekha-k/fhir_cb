import fs from "fs/promises";
import mammoth from "mammoth";

async function safePdfParse(buf: Buffer): Promise<string> {
  try {
    const mod: any = await import("pdf-parse");
    const pdf = mod.default ?? mod;
    const out = await pdf(buf);
    return out?.text || "";
  } catch (err) {
    console.error("PDF parse failed (fallback to raw):", err);
    return buf.toString("utf8");
  }
}

export async function extractTextFromFile(tmpPath: string, originalName?: string): Promise<string> {
  const lower = (originalName || tmpPath).toLowerCase();
  const buf = await fs.readFile(tmpPath);

  if (lower.endsWith(".pdf")) return safePdfParse(buf);

  if (lower.endsWith(".docx")) {
    try {
      const out = await mammoth.extractRawText({ buffer: buf });
      return out.value || "";
    } catch (e) {
      console.error("DOCX parse failed:", e);
      return buf.toString("utf8");
    }
  }

  // .txt or fallback
  return buf.toString("utf8");
}

/** Safe chunker: guarantees 0 <= overlap < size and makes progress each loop */
export function chunkText(text: string, chunkChars = 1000, overlap = 150): string[] {
  const size = Math.max(200, chunkChars);
  const ov = Math.min(Math.max(0, overlap), size - 1);

  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; ) {
    const end = Math.min(i + size, clean.length);
    chunks.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = end - ov;
  }
  return chunks;
}
