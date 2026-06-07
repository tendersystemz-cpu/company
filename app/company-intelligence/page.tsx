"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;

type Room = {
  code: string;
  title: string;
  purpose: string;
  required: string[];
};

const ROOMS: Room[] = [
  { code: "identity", title: "Company Identity", purpose: "Siapa syarikat ini", required: ["Company name", "SSM no", "CIDB no", "Address", "Contact"] },
  { code: "cidb", title: "CIDB Qualification", purpose: "Kelayakan kerja / gred / kod bidang", required: ["CIDB", "Grade", "PPK", "SPKK", "STB", "SCORE", "Kod bidang"] },
  { code: "mof", title: "MOF / Vendor", purpose: "Kelayakan vendor dan kod bidang MOF", required: ["MOF", "Vendor status", "MOF kod bidang"] },
  { code: "financial", title: "Financial", purpose: "Kekuatan kewangan dan sokongan bank", required: ["Paid-up capital", "Audit", "Bank", "TCC / Tax"] },
  { code: "people", title: "People / Competency", purpose: "Pengarah, pemegang saham, staf dan kompetensi", required: ["Directors", "Shareholders", "Technical staff", "KWSP / SOCSO / SIP"] },
  { code: "experience", title: "Project Experience", purpose: "Pengalaman projek dan bukti prestasi", required: ["LA", "CPC", "GA", "Similar work"] },
  { code: "risk", title: "Risk / Review", purpose: "Isu blacklist, konflik data, expiry dan semakan manusia", required: ["Blacklist check", "Conflict check", "Expiry check"] },
];

function text(v: any) {
  return String(v ?? "").trim();
}

function norm(v: any) {
  return text(v).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function hasAny(value: any) {
  return text(value).length > 0;
}

function fieldMatch(label: string, keys: string[]) {
  const l = norm(label);
  return keys.some((k) => l.includes(norm(k)) || norm(k).includes(l));
}

function pct(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function badgeStyle(status: string) {
  const s = norm(status);
  if (s.includes("VERIFIED")) return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (s.includes("CONFLICT") || s.includes("REVIEW")) return { background: "#fef3c7", color: "#92400e", border: "1px solid #fbbf24" };
  if (s.includes("MISSING") || s.includes("EXPIRED")) return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
  return { background: "#e0f2fe", color: "#075985", border: "1px solid #7dd3fc" };
}

function Chip({ children, status }: { children: React.ReactNode; status: string }) {
  return <span style={{ display: "inline-flex", borderRadius: 999, padding: "3px 7px", fontWeight: 800, whiteSpace: "nowrap", ...badgeStyle(status) }}>{children}</span>;
}

function Bar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return <div style={{ height: 7, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 4 }}><div style={{ width: `${v}%`, height: "100%", background: "#111827" }} /></div>;
}

function roomClaimValue(claims: Row[], room: string, keys: string[]) {
  const hit = claims.find((c) => text(c.room_code) === room && fieldMatch(c.field_label || c.field_code, keys) && hasAny(c.claimed_value));
  return hit ? text(hit.claimed_value) : "";
}

function companyValue(company: Row, keys: string[]) {
  const direct = Object.entries(company || {}).find(([k, v]) => fieldMatch(k, keys) && hasAny(v));
  if (direct) return text(direct[1]);
  const raw = company.raw_metadata || {};
  const rawHit = Object.entries(raw).find(([k, v]) => fieldMatch(k, keys) && hasAny(v));
  return rawHit ? text(rawHit[1]) : "";
}

function factsForRoom(company: Row, claims: Row[], docs: Row[], room: Room) {
  const out: { label: string; value: string; source: string; status: string }[] = [];

  function add(label: string, value: string, source: string, status: string) {
    out.push({ label, value: value || "-", source, status: value ? status : "MISSING" });
  }

  if (room.code === "identity") {
    add("Company name", text(company.company_name), "Company table", "CLAIMED");
    add("SSM no", companyValue(company, ["ssm", "registration"]), "Company / Sheet", "CLAIMED");
    add("CIDB no", companyValue(company, ["cidb"]), "Company / Sheet", "CLAIMED");
    add("Address", companyValue(company, ["address", "alamat"]), "Company / Sheet", "CLAIMED");
    add("Contact", companyValue(company, ["email", "phone", "telefon"]), "Company / Sheet", "CLAIMED");
  } else if (room.code === "cidb") {
    add("Grade", companyValue(company, ["grade", "gred"]), "Company / Sheet", "CLAIMED");
    add("PPK", roomClaimValue(claims, "cidb", ["ppk"]), "Sheet claim", "UNVERIFIED");
    add("SPKK", roomClaimValue(claims, "cidb", ["spkk"]), "Sheet claim", "UNVERIFIED");
    add("STB", roomClaimValue(claims, "cidb", ["stb"]), "Sheet claim", "UNVERIFIED");
    add("SCORE", roomClaimValue(claims, "cidb", ["score"]), "Sheet claim", "UNVERIFIED");
    add("Kod bidang", roomClaimValue(claims, "cidb", ["kod", "bidang"]), "Sheet claim", "UNVERIFIED");
  } else if (room.code === "mof") {
    add("MOF", roomClaimValue(claims, "mof", ["mof"]), "Sheet claim", "UNVERIFIED");
    add("Vendor status", roomClaimValue(claims, "mof", ["vendor", "bumiputera"]), "Sheet claim", "UNVERIFIED");
    add("MOF kod bidang", roomClaimValue(claims, "mof", ["kod", "bidang"]), "Sheet claim", "UNVERIFIED");
  } else if (room.code === "financial") {
    add("Paid-up capital", roomClaimValue(claims, "financial", ["paid", "modal"]), "Sheet claim", "UNVERIFIED");
    add("Audit", roomClaimValue(claims, "financial", ["audit"]), "Sheet claim", "UNVERIFIED");
    add("Bank", roomClaimValue(claims, "financial", ["bank"]), "Sheet claim", "UNVERIFIED");
    add("TCC / Tax", roomClaimValue(claims, "financial", ["tcc", "tax", "cukai"]), "Sheet claim", "UNVERIFIED");
  } else if (room.code === "people") {
    add("Directors", roomClaimValue(claims, "people", ["director", "pengarah"]), "Sheet claim", "UNVERIFIED");
    add("Shareholders", roomClaimValue(claims, "people", ["share", "saham"]), "Sheet claim", "UNVERIFIED");
    add("Technical staff", roomClaimValue(claims, "people", ["staff", "technical", "kompeten"]), "Sheet claim", "UNVERIFIED");
    add("KWSP / SOCSO / SIP", roomClaimValue(claims, "people", ["kwsp", "socso", "perkeso", "sip"]), "Sheet claim", "UNVERIFIED");
  } else if (room.code === "experience") {
    add("LA", roomClaimValue(claims, "experience", ["la", "award"]), "Sheet claim", "UNVERIFIED");
    add("CPC", roomClaimValue(claims, "experience", ["cpc"]), "Sheet claim", "UNVERIFIED");
    add("GA", roomClaimValue(claims, "experience", ["ga", "performance"]), "Sheet claim", "UNVERIFIED");
    add("Similar work", roomClaimValue(claims, "experience", ["similar", "pengalaman", "project", "projek"]), "Sheet claim", "UNVERIFIED");
  } else {
    add("Blacklist check", companyValue(company, ["blacklist"]), "Company / Sheet", companyValue(company, ["blacklist"]) ? "REVIEW" : "MISSING");
    add("Conflict check", docs.length ? `${docs.length} PDF evidence linked` : "", "PDF vault", docs.length ? "PARTIAL" : "MISSING");
    add("Expiry check", roomClaimValue(claims, "risk", ["expiry", "expired", "tamat"]), "Sheet claim", "UNVERIFIED");
  }

  return out;
}

export default function CompanyIntelligencePage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [claims, setClaims] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Row[]>([]);
  const [preq, setPreq] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  async function loadData() {
    const nextWarnings: string[] = [];
    const c = await supabase.from("companies").select("*").order("company_name", { ascending: true }).limit(5000);
    if (c.error) { setWarnings([c.error.message]); return; }

    const claimReq = await supabase.from("google_sheet_infodata_claims").select("*").limit(100000);
    if (claimReq.error) nextWarnings.push(`Sheet claims unavailable: ${claimReq.error.message}`);

    const pdfReq = await supabase.from("pdf_document_inventory").select("*").limit(100000);
    if (pdfReq.error) nextWarnings.push(`PDF vault unavailable: ${pdfReq.error.message}`);

    const preqReq = await supabase.from("company_preq_evaluation_summary").select("*").limit(100000);
    if (preqReq.error) nextWarnings.push(`Pre-Q summary unavailable: ${preqReq.error.message}`);

    setCompanies(c.data || []);
    setClaims(claimReq.data || []);
    setDocs(pdfReq.data || []);
    setPreq(preqReq.data || []);
    setWarnings(nextWarnings);
    if (!selectedId && c.data?.[0]?.id) setSelectedId(c.data[0].id);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = norm(search);
    return companies.filter((c) => !q || norm([c.company_code, c.company_name, c.registration_no, c.ssm_no, c.cidb_no, c.grade, c.state].join(" ")).includes(q));
  }, [companies, search]);

  useEffect(() => {
    if (selectedId && filtered.some((c) => c.id === selectedId)) return;
    setSelectedId(filtered[0]?.id || "");
  }, [filtered, selectedId]);

  const company = filtered.find((c) => c.id === selectedId) || filtered[0];
  const companyKey = norm(company?.company_name);
  const companyCode = norm(company?.company_code);
  const selectedClaims = claims.filter((c) => norm(c.company_name) === companyKey || norm(c.company_code) === companyCode);
  const selectedDocs = docs.filter((d) => norm(d.matched_company_name || d.detected_company_name) === companyKey || norm(d.matched_company_code) === companyCode);
  const selectedPreq = preq.find((p) => norm(p.company_name) === companyKey || norm(p.company_code) === companyCode);

  const roomData = ROOMS.map((room) => {
    const facts = company ? factsForRoom(company, selectedClaims, selectedDocs, room) : [];
    const done = facts.filter((f) => f.value !== "-").length;
    const percent = pct(done, facts.length || room.required.length);
    return { room, facts, percent, missing: facts.filter((f) => f.value === "-").map((f) => f.label) };
  });

  const overall = roomData.length ? Math.round(roomData.reduce((sum, r) => sum + r.percent, 0) / roomData.length) : 0;
  const evidencePercent = selectedDocs.length ? Math.min(100, selectedDocs.length * 10) : 0;
  const simulationScore = Math.round(overall * 0.65 + evidencePercent * 0.2 + (selectedPreq ? 15 : 0));
  const advisory = [
    ...(selectedClaims.length ? [] : ["Import Google Sheet infodata or match claims for this company."]),
    ...(selectedDocs.length ? [] : ["Attach/link PDF evidence before treating this company as verified." ]),
    ...roomData.filter((r) => r.percent < 70).map((r) => `${r.room.title}: complete ${r.missing.slice(0, 3).join(", ") || "missing fields"}.`),
  ].slice(0, 10);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">One Company Intelligence View</div>
          <div className="module-subtitle">Satu syarikat dahulu: claimed sheet data + PDF evidence + scoring simulation + advisory</div>
        </div>
        <button className="compact-button-dark" onClick={loadData}>Refresh</button>
      </div>

      {warnings.length > 0 && <div style={{ background: "#fff7ed", padding: 8, borderRadius: 8, marginBottom: 8 }}>{warnings.map((w, i) => <div key={i}>• {w}</div>)}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 8 }}>
        <section className="compact-card">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company / SSM / CIDB / grade" style={{ marginBottom: 8 }} />
          <div className="compact-table-wrap" style={{ maxHeight: 760, overflow: "auto" }}>
            <table>
              <thead><tr><th>Company</th><th>Grade</th></tr></thead>
              <tbody>{filtered.map((c) => <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: "pointer", outline: c.id === company?.id ? "2px solid #2563eb" : "none" }}><td><strong>{c.company_code || "-"}</strong><div>{c.company_name}</div></td><td>{c.grade || "-"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section style={{ display: "grid", gap: 8, alignContent: "start" }}>
          {!company && <div className="compact-card">No company selected.</div>}
          {company && <>
            <div className="compact-dark-card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 150px", gap: 8, alignItems: "center" }}>
                <div><div style={{ color: "#cbd5e1", fontWeight: 800 }}>ONE COMPANY INTELLIGENCE PROFILE</div><h2 style={{ color: "white", margin: "4px 0" }}>{company.company_name}</h2><div style={{ color: "#cbd5e1" }}>{company.company_code || "-"} | SSM {companyValue(company, ["ssm", "registration"]) || "-"} | CIDB {companyValue(company, ["cidb"]) || "-"}</div></div>
                <div><div style={{ color: "#cbd5e1" }}>Infodata</div><strong>{overall}%</strong><Bar value={overall} /></div>
                <div><div style={{ color: "#cbd5e1" }}>Evidence</div><strong>{selectedDocs.length}</strong><div style={{ color: "#cbd5e1" }}>PDF linked</div></div>
                <div><div style={{ color: "#cbd5e1" }}>Score Sim</div><strong>{simulationScore}/100</strong><Bar value={simulationScore} /></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <div className="compact-card"><div className="muted">Sheet Claims</div><strong>{selectedClaims.length}</strong></div>
              <div className="compact-card"><div className="muted">Pre-Q</div><strong>{selectedPreq?.decision || selectedPreq?.preq_status || "-"}</strong></div>
              <div className="compact-card"><div className="muted">Grade</div><strong>{company.grade || "-"}</strong></div>
              <div className="compact-card"><div className="muted">State</div><strong>{company.state || "-"}</strong></div>
            </div>

            <div className="compact-card">
              <strong>Company CV Rooms</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                {roomData.map(({ room, facts, percent, missing }) => <div key={room.code} className="compact-card" style={{ padding: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{room.title}</strong><strong>{percent}%</strong></div><div className="muted">{room.purpose}</div><Bar value={percent} /><div style={{ display: "grid", gap: 4, marginTop: 6 }}>{facts.map((f) => <div key={`${room.code}-${f.label}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 95px", gap: 6 }}><span className="muted">{f.label}</span><span>{f.value}</span><Chip status={f.status}>{f.status}</Chip></div>)}</div>{missing.length > 0 && <div className="muted" style={{ marginTop: 5 }}>Missing: {missing.join(", ")}</div>}</div>)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="compact-card"><strong>PDF Evidence Linked</strong><div style={{ display: "grid", gap: 4, marginTop: 8 }}>{selectedDocs.length === 0 && <div className="muted">No PDF linked yet.</div>}{selectedDocs.slice(0, 12).map((d, i) => <div key={d.id || i}>• {d.document_category || "PDF"}: {d.file_name || d.drive_file_id || "evidence"}</div>)}</div></div>
              <div className="compact-card"><strong>Advisory / Next Action</strong><div style={{ display: "grid", gap: 4, marginTop: 8 }}>{advisory.map((a, i) => <div key={i}>• {a}</div>)}</div></div>
            </div>
          </>}
        </section>
      </div>
    </main>
  );
}
