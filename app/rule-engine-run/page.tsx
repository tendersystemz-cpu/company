"use client";

import { useState } from "react";

export default function RuleEngineRunPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function runEvaluation() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/evaluate-readiness-v4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await response.json();
      setResult(json);
      if (!response.ok) {
        setError(json?.error || "Evaluation failed");
      }
    } catch (err: any) {
      setError(err?.message || "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontSize: 12, maxWidth: 960 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Compliance Rule Engine V1</h1>
      <p style={{ marginBottom: 16, color: "#555" }}>
        Tekan butang ini untuk menjalankan readiness evaluation v4 tanpa guna DevTools Console.
      </p>

      <button
        onClick={runEvaluation}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #111827",
          background: loading ? "#9ca3af" : "#111827",
          color: "white",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {loading ? "Running..." : "Run Compliance Evaluation V4"}
      </button>

      {error ? (
        <pre style={{ marginTop: 16, padding: 12, background: "#fee2e2", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      ) : null}

      {result ? (
        <pre style={{ marginTop: 16, padding: 12, background: "#f3f4f6", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
