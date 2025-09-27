import React from "react";
import Navbar from "../components/Navbar";

type SourceItem = {
  marker: string;
  fileName: string;
  preview: string;
  score: number;
};

export default function Home() {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [sources, setSources] = React.useState<SourceItem[]>([]);

  const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

  async function upload() {
    if (!file) return;
    setBusy(true);
    setStatus("Indexing document…");
    setAnswer("");
    setSources([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/api/rag/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setStatus(`Indexed ${json.chunks} chunks from “${json.fileName}”.`);
    } catch (err: any) {
      setStatus(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    setStatus("Retrieving and summarizing…");
    setAnswer("");
    setSources([]);
    try {
      const res = await fetch(`${API}/api/rag/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Ask failed");
      setAnswer(json.answer || "");
      setSources((json.sources || []) as SourceItem[]);
      setStatus("");
    } catch (err: any) {
      setAnswer("");
      setStatus(err?.message || "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    setQuestion("");
    setAnswer("");
    setSources([]);
    setStatus("");
    setFile(null);
  }

  return (
    <>
      <Navbar />
      <main className="container" style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1>Welcome to FHIR CHATBOT</h1>

        {/* RAG on Home */}
        <section className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h2>Upload & Ask</h2>

          {/* Upload */}
          <div style={{ marginTop: 8 }}>
            <h3 style={{ marginBottom: 6 }}>1) Upload a medical document (.pdf / .docx / .txt)</h3>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div style={{ display: "inline-flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button disabled={!file || busy} onClick={upload} style={btn}>
                {busy ? "Working…" : "Index document"}
              </button>
              {file && <span style={{ fontSize: 12, color: "#555" }}>Selected: {file.name}</span>}
            </div>
            {status && <p style={{ marginTop: 8 }}>{status}</p>}
          </div>

          {/* Ask */}
          <div style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 6 }}>2) Ask a question</h3>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Summarize diagnoses, medications, allergies, and key dates."
              rows={3}
              style={{ width: "100%", padding: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={ask} disabled={busy || !question.trim()} style={btn}>
                {busy ? "Working…" : "Ask"}
              </button>
              <button onClick={clearAll} disabled={busy} style={btnSecondary}>
                Clear
              </button>
            </div>
          </div>

          {/* Answer & Sources */}
          {answer && (
            <div style={{ marginTop: 14 }}>
              <h4>Answer</h4>
              <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 14px",
  fontWeight: 600,
  borderRadius: 6,
  border: "none",
  background: "#2c3e50",
  color: "#fff",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  ...btn,
  background: "#6b7280",
};
