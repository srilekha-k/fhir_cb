import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedMany(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: inputs,
  });
  return res.data.map((d: any) => d.embedding as number[]);
}

export async function embedOne(input: string): Promise<number[]> {
  const [vec] = await embedMany([input]);
  return vec;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y; na += x * x; nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}
