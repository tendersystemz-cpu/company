import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const SYNC_SOURCE = "sync:readiness-evaluation-v3";

function txt(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  return txt(v).toLowerCase();
}

function pick(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && txt(value) !== "") {
      return txt(value);
    }
  }

  return fallback;
}

function companyName(row: Row) {
  return pick(row, ["company_name", "company", "nama_syarikat", "name", "syarikat"], "Unknown Company");
}

function companyCode(row: Row) {
  return pick(row, ["company_code", "code", "tr_code", "kod_syarikat"], "");
}

function companyId(row: Row) {
  return pick(row, ["id", "company_id"], "") || null;
}

function sameCompany(row: Row, company: Row) {
  const rowCode = companyCode(row);
  const coCode = companyCode(company);

  if (rowCode && coCode && n(rowCode) === n(coCode)) return true;

  const rowName = companyName(row);
  const coName = companyName(company);

  if (rowName && coName && n(rowName) === n(coName)) return true;

  const rowCompanyId = pick(row, ["company_id"]);
  const coId = companyId(company);

  if (rowCompanyId && coId && n(rowCompanyId) === n(coId)) return true;

  return false;
}

async function readAllRows(table: string, limit = 50000) {
  const chunkSize = 1000;
  let from = 0;
  const rows: Row[] = [];

  while (rows.length < limit) {
    const to = from + chunkSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, to);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const chunk = data || [];
    rows.push(...chunk);

    if (chunk.length < chunkSize) break;

    from += chunkSize;
  }

  return rows.slice(0, limit);
}

function daysToExpiry(value: unknown) {
  const dateValue = txt(value);
  if (!dateValue) return null;

  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function isRejected(row: Row) {
  const status = n(pick(row, ["status"]));
  const verification = n(pick(row, ["verification_status"]));

  return (
    status === "rejected" ||
    status === "missing" ||
    status === "superseded" ||
    verification === "rejected" ||
    verification === "mismatch"
  );
}

function isExpired(row: Row) {
  const status = n(pick(row, ["status"]));
  if (status === "expired") return true;

  const days = daysToExpiry(pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat"]));
  return days !== null && days < 0;
}

function isExpiring(row: Row) {
  const status = n(pick(row, ["status"]));
  if (status === "expiring") return true;

  const days = daysToExpiry(pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat"]));
  return days !== null && days >= 0 && days <= 90;
}

function isAvailable(row: Row) {
  if (isRejected(row)) return false;
  if (isExpired(row)) return false;

  const status = n(pick(row, ["status"]));
  const verification = n(pick(row, ["verification_status"]));

  if (verification === "verified") return true;

  return (
    status === "available" ||
    status === "verified" ||
    status === "pending" ||
    status === "expiring"
  );
}

function scorePart(available: number, total: number, weight: number) {
  if (!total) return 0;
  return (available / total) * weight;
}

function clampScore(value: number) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function categoryState(categoryCode: string, evidenceRows: Row[]) {
  const rows = evidenceRows.filter((row) => txt(row.category_code) === categoryCode);

  if (!rows.length) {
    return {
      category_code: categoryCode,
      available: false,
      expired: false,
      expiring: false,
      bestRow: null as Row | null,
      rows,
    };
  }

  const availableRows = rows.filter(isAvailable);
  const validNonExpiringRows = availableRows.filter((row) => !isExpiring(row));
  const expiringRows = availableRows.filter(isExpiring);
  const expiredRows = rows.filter(isExpired);

  if (validNonExpiringRows.length > 0) {
    return {
      category_code: categoryCode,
      available: true,
      expired: false,
      expiring: false,
      bestRow: validNonExpiringRows[0],
      rows,
    };
  }

  if (expiringRows.length > 0) {
    return {
      category_code: categoryCode,
      available: true,
      expired: false,
      expiring: true,
      bestRow: expiringRows[0],
      rows,
    };
  }

  if (expiredRows.length > 0) {
    return {
      category_code: categoryCode,
      available: false,
      expired: true,
      expiring: false,
      bestRow: expiredRows[0],
      rows,
    };
  }

  return {
    category_code: categoryCode,
    available: false,
    expired: false,
    expiring: false,
    bestRow: rows[0],
    rows,
  };
}

function buildNextActions(params: {
  missingMandatory: Row[];
  expiredStates: Row[];
  expiringStates: Row[];
  supportingMissing: Row[];
}) {
  const actions: Row[] = [];

  for (const cat of params.missingMandatory.slice(0, 20)) {
    actions.push({
      severity: "critical",
      type: "missing_mandatory",
      category_code: cat.category_code,
      title: `Lengkapkan dokumen wajib: ${cat.category_name || cat.category_code}`,
      action: cat.advisory_if_missing || "Upload/link official evidence before marking the company verified.",
    });
  }

  for (const state of params.expiredStates.slice(0, 20)) {
    actions.push({
      severity: "critical",
      type: "expired",
      category_code: state.category_code,
      title: `Renew dokumen expired: ${state.category_code}`,
      action: "Renew dokumen atau upload bukti sah yang baru.",
    });
  }

  for (const state of params.expiringStates.slice(0, 20)) {
    const bestRow = state.bestRow as Row | null | undefined;
    const days = daysToExpiry(bestRow?.expiry_date);
    actions.push({
      severity: "high",
      type: "expiring",
      category_code: state.category_code,
      title: `Semak expiry: ${state.category_code}`,
      action: `Dokumen akan tamat ${days ?? "-"} hari. Renew or verify a newer source document.`,
    });
  }

  for (const cat of params.supportingMissing.slice(0, 10)) {
    actions.push({
      severity: "medium",
      type: "missing_supporting",
      category_code: cat.category_code,
      title: `Tambah dokumen sokongan: ${cat.category_name || cat.category_code}`,
      action: cat.advisory_if_missing || "Add supporting evidence to reduce current compliance uncertainty.",
    });
  }

  return actions;
}

async function insertChunks(table: string, rows: Row[]) {
  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const { error } = await supabase.from(table).insert(chunk);

    if (error) {
      throw new Error(`Insert ${table} failed at chunk ${i / chunkSize + 1}: ${error.message}`);
    }

    inserted += chunk.length;
  }

  return inserted;
}

export async function POST() {
  try {
    const companies = await readAllRows("companies", 50000);
    const categoriesRaw = await readAllRows("evidence_category_master", 5000);
    const evidenceRows = await readAllRows("company_evidence_index", 50000);

    const categories = categoriesRaw.filter((cat) => cat.is_active !== false);

    const mandatoryCats = categories.filter((cat) => cat.requirement_level === "mandatory");
    const supportingCats = categories.filter((cat) => cat.requirement_level === "supporting");
    const conditionalCats = categories.filter((cat) => cat.requirement_level === "conditional");

    const allCategoryCodes = categories.map((cat) => txt(cat.category_code)).filter(Boolean);

    const snapshots: Row[] = [];

    for (const company of companies) {
      const relatedEvidence = evidenceRows.filter((row) => sameCompany(row, company));

      const states = allCategoryCodes.map((code) => categoryState(code, relatedEvidence));

      const stateMap = new Map<string, ReturnType<typeof categoryState>>();
      for (const state of states) {
        stateMap.set(state.category_code, state);
      }

      const mandatoryAvailable = mandatoryCats.filter((cat) => stateMap.get(txt(cat.category_code))?.available);
      const mandatoryMissing = mandatoryCats.filter((cat) => !stateMap.get(txt(cat.category_code))?.available);

      const supportingAvailable = supportingCats.filter((cat) => stateMap.get(txt(cat.category_code))?.available);
      const supportingMissing = supportingCats.filter((cat) => !stateMap.get(txt(cat.category_code))?.available);

      const conditionalAvailable = conditionalCats.filter((cat) => stateMap.get(txt(cat.category_code))?.available);

      const expiredStates = states.filter((state) => state.expired);
      const expiringStates = states.filter((state) => state.expiring);

      const expiredCategories = expiredStates.map((state) => state.category_code);
      const expiringCategories = expiringStates.map((state) => state.category_code);

      const expiredMandatoryExists = mandatoryCats.some((cat) => stateMap.get(txt(cat.category_code))?.expired);

      const mandatoryScore = scorePart(mandatoryAvailable.length, mandatoryCats.length, 60);
      const supportingScore = scorePart(supportingAvailable.length, supportingCats.length, 25);
      const conditionalScore = scorePart(conditionalAvailable.length, conditionalCats.length, 10);

      const expiryPenalty = expiredStates.length * 5 + expiringStates.length * 1.5;

      const readinessScore = clampScore(
        mandatoryScore + supportingScore + conditionalScore + 5 - expiryPenalty
      );

      let readinessStatus: "Ready" | "Conditional" | "Not Ready" | "Need Review" = "Need Review";
      let advisorySummary = "";

      if (!categories.length || !companyName(company)) {
        readinessStatus = "Need Review";
        advisorySummary = "Company data or evidence categories are incomplete. Review imported source data before verification.";
      } else if (mandatoryMissing.length > 0 || expiredMandatoryExists) {
        readinessStatus = "Not Ready";
        advisorySummary = "Mandatory evidence is missing or expired. Resolve source documents before current state can be treated as verified.";
      } else if (expiringStates.length > 0 || expiredStates.length > 0 || supportingMissing.length > 0) {
        readinessStatus = "Conditional";
        advisorySummary = "Current state is partially supported. Resolve supporting evidence and expiry risk to reduce ALARP uncertainty.";
      } else {
        readinessStatus = "Ready";
        advisorySummary = "Current company state is verified against available minimum compliance evidence.";
      }

      const nextActions = buildNextActions({
        missingMandatory: mandatoryMissing,
        expiredStates,
        expiringStates,
        supportingMissing,
      });

      snapshots.push({
        company_id: companyId(company),
        company_code: companyCode(company),
        company_name: companyName(company),
        readiness_status: readinessStatus,
        readiness_score: readinessScore,
        mandatory_total: mandatoryCats.length,
        mandatory_available: mandatoryAvailable.length,
        mandatory_missing: mandatoryMissing.length,
        supporting_total: supportingCats.length,
        supporting_available: supportingAvailable.length,
        supporting_missing: supportingMissing.length,
        conditional_total: conditionalCats.length,
        conditional_available: conditionalAvailable.length,
        expired_count: expiredStates.length,
        expiring_count: expiringStates.length,
        missing_categories: mandatoryMissing.map((cat) => cat.category_code),
        expired_categories: expiredCategories,
        expiring_categories: expiringCategories,
        advisory_summary: advisorySummary,
        next_actions: nextActions,
        source_table: SYNC_SOURCE,
      });
    }

    await supabase
      .from("company_readiness_snapshots")
      .delete()
      .in("source_table", [
        "manual",
        "sync:readiness-evaluation-v1",
        "sync:readiness-evaluation-v2",
        "sync:readiness-evaluation-v3",
      ]);

    const inserted = await insertChunks("company_readiness_snapshots", snapshots);

    await supabase.from("sync_run_logs").insert({
      sync_name: "readiness-evaluation-sync-v3",
      status: "success",
      total_companies: companies.length,
      total_source_evidence: evidenceRows.length,
      total_generated_index: inserted,
      total_missing_mandatory: snapshots.reduce((sum, row) => sum + Number(row.mandatory_missing || 0), 0),
      message: `Category-level evaluation. Evidence rows: ${evidenceRows.length}.`,
    });

    const summary = {
      ready: snapshots.filter((row) => row.readiness_status === "Ready").length,
      conditional: snapshots.filter((row) => row.readiness_status === "Conditional").length,
      notReady: snapshots.filter((row) => row.readiness_status === "Not Ready").length,
      needReview: snapshots.filter((row) => row.readiness_status === "Need Review").length,
    };

    return NextResponse.json({
      ok: true,
      version: "v3",
      companyTable: "companies",
      evidenceTable: "company_evidence_index",
      categoryTable: "evidence_category_master",
      totalCompanies: companies.length,
      totalEvidenceRows: evidenceRows.length,
      totalSnapshots: inserted,
      summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown evaluation error";

    await supabase.from("sync_run_logs").insert({
      sync_name: "readiness-evaluation-sync-v3",
      status: "failed",
      message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/evaluate-readiness",
    method: "POST",
    version: "v3",
  });
}
