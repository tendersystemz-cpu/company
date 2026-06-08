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
  { code: "mof", title: "MOF / Vendor", purpose: "MOF/vendor/kod bidang jika tender memerlukan", required: ["MOF", "Vendor status", "MOF kod bidang"] },
  { code: "financial", title: "Financial", purpose: "Audit, bank, TCC dan kapasiti kewangan", required: ["Paid-up capital", "Audit", "Bank", "TCC / Tax"] },
  { code: "people", title: "People / Competency", purpose: "Pengarah, pemegang saham, staf dan kompetensi", required: ["Directors", "Shareholders", "Technical staff", "KWSP / SOCSO / SIP"] },
  { code: "experience", title: "Project Experience", purpose: "LA, CPC, GA dan pengalaman kerja seumpama", required: ["LA", "CPC", "GA", "Similar work"] },
  { code: "risk", title: "Risk / Review", purpose: "Blacklist, konflik, expiry dan isu prestasi", required: ["Blacklist check", "Conflict check", "Expiry check"] },
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusStyle(status: string) {
  const s = norm(status);
  if (s.includes("PASS") || s.includes("VERIFIED")) return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (s.includes("REVIEW") || s.includes("CONFLICT") || s.includes("SIM")) return { background: "#fef3c7", color: "#92400e", border: "1px solid #fbbf24" };
  if (s.includes("FAIL") || s.includes("MISSING") || s.includes("EXPIRED")) return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
  return { background: "#e0f2fe", color: "#075985", border: "1px solid #7dd3fc" };
}

function Chip({ children, status }: { children: React.ReactNode; status: string }) {
  return <span style={{ display: "inline-flex", borderRadius: 999, padding: "3px 7px", fontWeight: 800, whiteSpace: "nowrap", ...statusStyle(status) }}>{children}</span>;
}

function Bar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return <div style={{ height: 7, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 4 }}><div style={{ width: `${v}%`, height: "100%", background: "#111827" }} /></div>;
}

function companyValue(company: Row, keys: string[]) {
  const direct = Object.entries(company || {}).find(([k, v]) => fieldMatch(k, keys) && hasAny(v));
  if (direct) return text(direct[1]);
  const raw = company.raw_metadata || {};
  const rawHit = Object.entries(raw).find(([k, v]) => fieldMatch(k, keys) && hasAny(v));
  return rawHit ? text(rawHit[1]) : "";
}

function roomClaimValue(claims: Row[], room: string, keys: string[]) {
  const hit = claims.find((c) => text(c.room_code) === room && fieldMatch(c.field_label || c.field_code, keys) && hasAny(c.claimed_value));
  return hit ? text(hit.claimed_value) : "";
}

function evidenceForRoom(docs: Row[], roomCode: string) {
  const room = norm(roomCode);
  return docs.filter((doc) => {
    const cat = norm(doc.document_category || doc.file_name || "");
    if (room === "identity") return /SSM|PROFILE|REGISTRATION/.test(cat);
    if (room === "cidb") return /CIDB|PPK|SPKK|STB|SCORE/.test(cat);
    if (room === "mof") return /MOF|VENDOR/.test(cat);
    if (room === "financial") return /AUDIT|BANK|TCC|TAX|CUKAI|FINANCIAL/.test(cat);
    if (room === "people") return /KWSP|SOCSO|SIP|STAFF|CERT|DIRECTOR|SHARE/.test(cat);
    if (room === "experience") return /LA|CPC|GA|PROJECT|EXPERIENCE|AWARD/.test(cat);
    if (room === "risk") return /BLACKLIST|DISCIPLINARY|REVIEW|RISK/.test(cat);
    return false;
  });
}

function factsForRoom(company: Row, claims: Row[], docs: Row[], room: Room) {
  const roomDocs = evidenceForRoom(docs, room.code);
  const out: { label: string; value: string; source: string; status: string }[] = [];

  function add(label: string, value: string, source: string) {
    const hasValue = hasAny(value);
    const status = !hasValue ? "MISSING" : roomDocs.length ? "CLAIMED+PDF" : "CLAIMED";
    out.push({ label, value: hasValue ? value : "-", source, status });
  }

  if (room.code === "identity") {
    add("Company name", text(company.company_name), "Company/DataMaster");
    add("SSM no", companyValue(company, ["ssm", "registration"]), "Company/DataMaster");
    add("CIDB no", companyValue(company, ["cidb"]), "Company/DataMaster");
    add("Address", companyValue(company, ["address", "alamat"]), "Company/DataMaster");
    add("Contact", companyValue(company, ["email", "phone", "telefon"]), "Company/DataMaster");
  } else if (room.code === "cidb") {
    add("Grade", companyValue(company, ["grade", "gred"]), "Company/DataMaster");
    add("PPK", roomClaimValue(claims, "cidb", ["ppk"]), "Sheet claim");
    add("SPKK", roomClaimValue(claims, "cidb", ["spkk"]), "Sheet claim");
    add("STB", roomClaimValue(claims, "cidb", ["stb"]), "Sheet claim");
    add("SCORE", roomClaimValue(claims, "cidb", ["score"]), "Sheet claim");
    add("Kod bidang", roomClaimValue(claims, "cidb", ["kod", "bidang"]), "Sheet claim");
  } else if (room.code === "mof") {
    add("MOF", roomClaimValue(claims, "mof", ["mof"]), "Sheet claim");
    add("Vendor status", roomClaimValue(claims, "mof", ["vendor", "bumiputera"]), "Sheet claim");
    add("MOF kod bidang", roomClaimValue(claims, "mof", ["kod", "bidang"]), "Sheet claim");
  } else if (room.code === "financial") {
    add("Paid-up capital", roomClaimValue(claims, "financial", ["paid", "modal"]), "Sheet claim");
    add("Audit", roomClaimValue(claims, "financial", ["audit"]), "Sheet claim");
    add("Bank", roomClaimValue(claims, "financial", ["bank"]), "Sheet claim");
    add("TCC / Tax", roomClaimValue(claims, "financial", ["tcc", "tax", "cukai"]), "Sheet claim");
  } else if (room.code === "people") {
    add("Directors", roomClaimValue(claims, "people", ["director", "pengarah"]), "Sheet claim");
    add("Shareholders", roomClaimValue(claims, "people", ["share", "saham"]), "Sheet claim");
    add("Technical staff", roomClaimValue(claims, "people", ["staff", "technical", "kompeten"]), "Sheet claim");
    add("KWSP / SOCSO / SIP", roomClaimValue(claims, "people", ["kwsp", "socso", "perkeso", "sip"]), "Sheet claim");
  } else if (room.code === "experience") {
    add("LA", roomClaimValue(claims, "experience", ["la", "award"]), "Sheet claim");
    add("CPC", roomClaimValue(claims, "experience", ["cpc"]), "Sheet claim");
    add("GA", roomClaimValue(claims, "experience", ["ga", "performance"]), "Sheet claim");
    add("Similar work", roomClaimValue(claims, "experience", ["similar", "pengalaman", "project", "projek"]), "Sheet claim");
  } else {
    add("Blacklist check", companyValue(company, ["blacklist"]), "Company/DataMaster");
    add("Conflict check", roomDocs.length ? `${roomDocs.length} PDF evidence/review linked` : "", "PDF vault");
    add("Expiry check", roomClaimValue(claims, "risk", ["expiry", "expired", "tamat"]), "Sheet claim");
  }

  return out;
}

function buildKbkSimulation(roomMap: Record<string, number>, evidenceConfidence: number) {
  const technicalRows = [
    { label: "Mandatory registration suitability", max: 20, mark: Math.round(((roomMap.identity + roomMap.cidb) / 2) * 0.20), note: "Identity/CIDB base; still subject to mandatory tender gate." },
    { label: "Similar cleaning/facility experience", max: 25, mark: Math.round(roomMap.experience * 0.25), note: "LA/CPC/GA or similar project evidence." },
    { label: "Manpower / staff competency", max: 20, mark: Math.round(roomMap.people * 0.20), note: "Staff, competency cert, KWSP/SOCSO/SIP." },
    { label: "Methodology / service plan", max: 15, mark: 0, note: "No tender-specific method statement yet." },
    { label: "Equipment / resources", max: 10, mark: 0, note: "No equipment/resources schedule yet." },
    { label: "Risk / past performance", max: 10, mark: Math.round(roomMap.risk * 0.10), note: "Conflict, disciplinary, blacklist and expiry review." },
  ];
  const financialRows = [
    { label: "Tender price competitiveness", max: 50, mark: 0, note: "Cannot calculate until tender price exists." },
    { label: "Financial evidence / capacity", max: 30, mark: Math.round(roomMap.financial * 0.30), note: "Audit, bank, paid-up capital and financial proof." },
    { label: "Statutory/tax/payment confidence", max: 20, mark: Math.round(evidenceConfidence * 0.20), note: "TCC/tax/bank/PDF confidence proxy." },
  ];
  const technical = clamp(technicalRows.reduce((sum, row) => sum + row.mark, 0));
  const financial = clamp(financialRows.reduce((sum, row) => sum + row.mark, 0));
  const weighted = Math.round(technical * 0.5 + financial * 0.5);
  const technicalPass = technical >= 75;
  const financialPass = financial >= 70;
  const decision = technicalPass && financialPass ? "PASS_SIMULATION" : "FAIL_SIMULATION";
  return { technicalRows, financialRows, technical, financial, weighted, technicalPass, financialPass, decision };
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
    const roomDocs = evidenceForRoom(selectedDocs, room.code);
    return { room, facts, percent, roomDocs, missing: facts.filter((f) => f.value === "-").map((f) => f.label) };
  });

  const roomMap = Object.fromEntries(roomData.map((r) => [r.room.code, r.percent])) as Record<string, number>;
  const dataCompleteness = roomData.length ? Math.round(roomData.reduce((sum, r) => sum + r.percent, 0) / roomData.length) : 0;
  const evidenceConfidence = roomData.length ? Math.round(roomData.reduce((sum, r) => sum + Math.min(100, r.roomDocs.length * 35), 0) / roomData.length) : 0;
  const kbk = buildKbkSimulation(roomMap, evidenceConfidence);
  const currentStrategy = kbk.decision === "PASS_SIMULATION" ? "CAN_PROCEED_WITH_REVIEW" : evidenceConfidence < 40 ? "POLISH_FIRST" : "HOLD_FOR_REVIEW";
  const advisory = [
    "Tender score shown here is simulation only. Final score must follow actual tender document and verified PDF evidence.",
    ...(selectedClaims.length ? [] : ["Import Google Sheet infodata or match claims for this company."]),
    ...(selectedDocs.length ? [] : ["Attach/link PDF evidence before treating this company as verified."]),
    ...roomData.filter((r) => r.percent < 70).map((r) => `${r.room.title}: complete ${r.missing.slice(0, 3).join(", ") || "missing fields"}.`),
  ].slice(0, 10);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">One Company Intelligence View</div>
          <div className="module-subtitle">Satu syarikat dahulu: infodata rooms + evidence confidence + guideline-style simulation</div>
        </div>
        <button className="compact-button-dark" onClick={loadData}>Refresh</button>
      </div>

      {warnings.length > 0 && <div style={{ background: "#fff7ed", padding: 8, borderRadius: 8, marginBottom: 8 }}>{warnings.map((w, i) => <div key={i}>• {w}</div>)}</div>}
      <div style={{ background: "#fef3c7", color: "#92400e", padding: 8, borderRadius: 8, marginBottom: 8, fontWeight: 800 }}>SIMULATION ONLY — NOT FINAL TENDER EVALUATION. Final scoring must follow the actual tender document and verified PDF evidence.</div>

      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 8 }}>
        <section className="compact-card">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company / SSM / CIDB / grade" style={{ marginBottom: 8 }} />
          <div className="compact-table-wrap" style={{ maxHeight: 760, overflow: "auto" }}>
            <table><thead><tr><th>Company</th><th>Grade</th></tr></thead><tbody>{filtered.map((c) => <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: "pointer", outline: c.id === company?.id ? "2px solid #2563eb" : "none" }}><td><strong>{c.company_code || "-"}</strong><div>{c.company_name}</div></td><td>{c.grade || "-"}</td></tr>)}</tbody></table>
          </div>
        </section>

        <section style={{ display: "grid", gap: 8, alignContent: "start" }}>
          {!company && <div className="compact-card">No company selected.</div>}
          {company && <>
            <div className="compact-dark-card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 150px 150px", gap: 8, alignItems: "center" }}>
                <div><div style={{ color: "#cbd5e1", fontWeight: 800 }}>ONE COMPANY INTELLIGENCE PROFILE</div><h2 style={{ color: "white", margin: "4px 0" }}>{company.company_name}</h2><div style={{ color: "#cbd5e1" }}>{company.company_code || "-"} | SSM {companyValue(company, ["ssm", "registration"]) || "-"} | CIDB {companyValue(company, ["cidb"]) || "-"}</div></div>
                <div><div style={{ color: "#cbd5e1" }}>Data Complete</div><strong>{dataCompleteness}%</strong><Bar value={dataCompleteness} /></div>
                <div><div style={{ color: "#cbd5e1" }}>Evidence Confidence</div><strong>{evidenceConfidence}%</strong><Bar value={evidenceConfidence} /></div>
                <div><div style={{ color: "#cbd5e1" }}>Strategy</div><strong>{currentStrategy}</strong></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              <div className="compact-card"><div className="muted">Sheet Claims</div><strong>{selectedClaims.length}</strong></div>
              <div className="compact-card"><div className="muted">PDF Evidence</div><strong>{selectedDocs.length}</strong></div>
              <div className="compact-card"><div className="muted">Pre-Q</div><strong>{selectedPreq?.decision || selectedPreq?.preq_status || "-"}</strong></div>
              <div className="compact-card"><div className="muted">Grade</div><strong>{company.grade || "-"}</strong></div>
              <div className="compact-card"><div className="muted">State</div><strong>{company.state || "-"}</strong></div>
            </div>

            <div className="compact-card">
              <strong>KBK-Style Tender Scoring Simulation</strong>
              <div className="muted">Technical threshold 75%, financial threshold 70%, technical 50% + financial 50%. Use only until actual tender scoring schema is loaded.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                <div className="compact-card"><strong>Technical</strong><h2>{kbk.technical}/100</h2><Bar value={kbk.technical} /><Chip status={kbk.technicalPass ? "PASS" : "FAIL"}>{kbk.technicalPass ? "PASS 75%" : "FAIL 75%"}</Chip></div>
                <div className="compact-card"><strong>Financial</strong><h2>{kbk.financial}/100</h2><Bar value={kbk.financial} /><Chip status={kbk.financialPass ? "PASS" : "FAIL"}>{kbk.financialPass ? "PASS 70%" : "FAIL 70%"}</Chip></div>
                <div className="compact-card"><strong>Weighted Overall</strong><h2>{kbk.weighted}/100</h2><Bar value={kbk.weighted} /><Chip status={kbk.decision}>{kbk.decision}</Chip></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div className="compact-table-wrap"><table><thead><tr><th>Technical Item</th><th>Mark</th><th>Note</th></tr></thead><tbody>{kbk.technicalRows.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.mark}/{r.max}</td><td>{r.note}</td></tr>)}</tbody></table></div>
                <div className="compact-table-wrap"><table><thead><tr><th>Financial Item</th><th>Mark</th><th>Note</th></tr></thead><tbody>{kbk.financialRows.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.mark}/{r.max}</td><td>{r.note}</td></tr>)}</tbody></table></div>
              </div>
            </div>

            <div className="compact-card">
              <strong>Company CV Rooms</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                {roomData.map(({ room, facts, percent, missing, roomDocs }) => <div key={room.code} className="compact-card" style={{ padding: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{room.title}</strong><strong>{percent}%</strong></div><div className="muted">{room.purpose}</div><Bar value={percent} /><div className="muted">PDF evidence matched to room: {roomDocs.length}</div><div style={{ display: "grid", gap: 4, marginTop: 6 }}>{facts.map((f) => <div key={`${room.code}-${f.label}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 105px", gap: 6 }}><span className="muted">{f.label}</span><span>{f.value}</span><Chip status={f.status}>{f.status}</Chip></div>)}</div>{missing.length > 0 && <div className="muted" style={{ marginTop: 5 }}>Missing: {missing.join(", ")}</div>}</div>)}
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
