"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type TenderRule = {
  id: string;
  rule_code: string;
  rule_name: string;
  authority: string | null;
  tender_type: string | null;
  target_grade: string | null;
  description: string | null;
  status: string | null;
};

type Requirement = {
  id: string;
  rule_id: string;
  evidence_code: string;
  evidence_name: string;
  evidence_layer: string | null;
  requirement_type: string;
  priority: number | null;
  expiry_check_required: boolean | null;
  failure_impact: string | null;
  advisory: string | null;
};

type TenderForm = {
  id: string;
  rule_id: string;
  form_code: string;
  form_name: string;
  purpose: string | null;
  source_layer: string | null;
  can_generate: boolean | null;
};

type Scoring = {
  id: string;
  rule_id: string;
  component_code: string;
  component_name: string;
  weight_percent: number | null;
  data_source: string | null;
  pass_note: string | null;
  advisory: string | null;
};

export default function TenderRulesPage() {
  const [rules, setRules] = useState<TenderRule[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [forms, setForms] = useState<TenderForm[]>([]);
  const [scoring, setScoring] = useState<Scoring[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const ruleResult = await supabase
      .from("tender_rules")
      .select("*")
      .order("rule_name", { ascending: true });

    const requirementResult = await supabase
      .from("tender_rule_requirements")
      .select("*")
      .order("priority", { ascending: true });

    const formResult = await supabase
      .from("tender_rule_forms")
      .select("*")
      .order("form_code", { ascending: true });

    const scoringResult = await supabase
      .from("tender_rule_scoring")
      .select("*")
      .order("component_code", { ascending: true });

    if (ruleResult.error || requirementResult.error || formResult.error || scoringResult.error) {
      setErrorMessage(
        ruleResult.error?.message ||
          requirementResult.error?.message ||
          formResult.error?.message ||
          scoringResult.error?.message ||
          "Failed to load tender rules"
      );
      setLoading(false);
      return;
    }

    const loadedRules = (ruleResult.data || []) as TenderRule[];

    setRules(loadedRules);
    setRequirements((requirementResult.data || []) as Requirement[]);
    setForms((formResult.data || []) as TenderForm[]);
    setScoring((scoringResult.data || []) as Scoring[]);

    if (!selectedRuleId && loadedRules.length > 0) {
      setSelectedRuleId(loadedRules[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) || rules[0];

  const selectedRequirements = useMemo(
    () => requirements.filter((item) => item.rule_id === selectedRule?.id),
    [requirements, selectedRule]
  );

  const selectedForms = useMemo(
    () => forms.filter((item) => item.rule_id === selectedRule?.id),
    [forms, selectedRule]
  );

  const selectedScoring = useMemo(
    () => scoring.filter((item) => item.rule_id === selectedRule?.id),
    [scoring, selectedRule]
  );

  const mandatoryCount = selectedRequirements.filter((item) =>
    item.requirement_type.toLowerCase().includes("mandatory")
  ).length;

  const supportingCount = selectedRequirements.filter((item) =>
    item.requirement_type.toLowerCase().includes("supporting")
  ).length;

  const expiryCount = selectedRequirements.filter((item) => item.expiry_check_required).length;

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Tender Rules + Evidence Requirement Register</div>
          <div className="module-subtitle">
            Rule engine asas untuk dokumen wajib, sokongan, pemarkahan dan nasihat tender
          </div>
        </div>

        <button onClick={loadData} className="compact-button-dark">
          Refresh
        </button>
      </div>

      <div style={toolbar}>
        <select
          value={selectedRuleId}
          onChange={(event) => setSelectedRuleId(event.target.value)}
          style={selectInput}
        >
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.rule_name}
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={notice}>Loading...</div>}

      {errorMessage && (
        <div style={errorBox}>
          <b>Error:</b> {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && selectedRule && (
        <>
          <section style={statsGrid}>
            <MiniStat label="Rules" value={rules.length} />
            <MiniStat label="Requirements" value={selectedRequirements.length} />
            <MiniStat label="Mandatory" value={mandatoryCount} />
            <MiniStat label="Supporting" value={supportingCount} />
            <MiniStat label="Expiry Check" value={expiryCount} />
            <MiniStat label="Forms" value={selectedForms.length} />
          </section>

          <section className="compact-card" style={{ marginBottom: "8px" }}>
            <b>{selectedRule.rule_name}</b>
            <br />
            Authority: {selectedRule.authority || "-"} / Type: {selectedRule.tender_type || "-"} / Grade:{" "}
            {selectedRule.target_grade || "-"}
            <br />
            <span className="muted">{selectedRule.description || "-"}</span>
          </section>

          <SectionTitle title="Evidence Requirements" />

          <div className="compact-table-wrap" style={{ marginBottom: "8px" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Layer</th>
                  <th>Type</th>
                  <th>Expiry</th>
                  <th>Failure Impact</th>
                  <th>Advisory</th>
                </tr>
              </thead>

              <tbody>
                {selectedRequirements.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.evidence_code}</b>
                      <br />
                      {item.evidence_name}
                    </td>
                    <td>{item.evidence_layer || "-"}</td>
                    <td>
                      <RequirementBadge type={item.requirement_type} />
                    </td>
                    <td>{item.expiry_check_required ? "Yes" : "No"}</td>
                    <td>{item.failure_impact || "-"}</td>
                    <td>{item.advisory || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionTitle title="Tender Forms / Templates" />

          <div className="compact-table-wrap" style={{ marginBottom: "8px" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Purpose</th>
                  <th>Source Layer</th>
                  <th>Can Generate</th>
                </tr>
              </thead>

              <tbody>
                {selectedForms.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.form_code}</b>
                      <br />
                      {item.form_name}
                    </td>
                    <td>{item.purpose || "-"}</td>
                    <td>{item.source_layer || "-"}</td>
                    <td>{item.can_generate ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionTitle title="Scoring Components" />

          <div className="compact-table-wrap">
            <table style={table}>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Weight</th>
                  <th>Data Source</th>
                  <th>Pass Note</th>
                  <th>Advisory</th>
                </tr>
              </thead>

              <tbody>
                {selectedScoring.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.component_code}</b>
                      <br />
                      {item.component_name}
                    </td>
                    <td>{item.weight_percent ?? "-"}%</td>
                    <td>{item.data_source || "-"}</td>
                    <td>{item.pass_note || "-"}</td>
                    <td>{item.advisory || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div style={sectionTitle}>{title}</div>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="compact-card">
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

function RequirementBadge({ type }: { type: string }) {
  const lower = type.toLowerCase();

  const style: CSSProperties = {
    display: "inline-block",
    padding: "3px 7px",
    borderRadius: "999px",
    fontWeight: 700,
    background: "#e5e7eb",
    color: "#374151",
  };

  if (lower.includes("mandatory")) {
    style.background = "#fee2e2";
    style.color = "#991b1b";
  }

  if (lower.includes("supporting")) {
    style.background = "#dbeafe";
    style.color = "#1d4ed8";
  }

  if (lower.includes("conditional")) {
    style.background = "#fef3c7";
    style.color = "#92400e";
  }

  return <span style={style}>{type}</span>;
}

const toolbar: CSSProperties = {
  marginBottom: "8px",
};

const selectInput: CSSProperties = {
  width: "360px",
  height: "28px",
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 120px)",
  gap: "8px",
  marginBottom: "8px",
};

const table: CSSProperties = {
  minWidth: "1180px",
};

const sectionTitle: CSSProperties = {
  margin: "8px 0",
  fontWeight: 800,
};

const notice: CSSProperties = {
  marginTop: "8px",
  padding: "8px",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};

const errorBox: CSSProperties = {
  marginTop: "8px",
  padding: "8px",
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: "8px",
};
