import fs from "fs/promises";
import path from "path";

export type RagChunk = {
  id: string;
  fileName: string;
  chunk: string;
  embedding: number[];
};

const INDEX_PATH = process.env.RAG_INDEX_PATH || path.join(process.cwd(), "data/rag/index.json");

export async function loadIndex(): Promise<RagChunk[]> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveIndex(rows: RagChunk[]): Promise<void> {
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await fs.writeFile(INDEX_PATH, JSON.stringify(rows, null, 2), "utf8");
}
