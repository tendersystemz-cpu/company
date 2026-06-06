"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ApiTestPage() {
  const [status, setStatus] = useState("Testing Supabase connection...");
  const [data, setData] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .limit(5);

      if (error) {
        setStatus("Connection failed");
        setErrorMessage(error.message);
        return;
      }

      setStatus("Connection success");
      setData(data || []);
    }

    testConnection();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Tender Readiness — Supabase API Test</h1>

      <p>
        <strong>Status:</strong> {status}
      </p>

      {errorMessage && (
        <div style={{ marginTop: "20px", padding: "16px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px" }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      <pre style={{ marginTop: "20px", padding: "16px", background: "#111827", color: "#d1fae5", borderRadius: "8px", overflowX: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}