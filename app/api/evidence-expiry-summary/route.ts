import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

type AlertLevel = "EXPIRED" | "HARD_WARNING" | "WARNING" | "OK" | "NO_EXPIRY";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function txt(v: any) {
  return String(v ?? "").trim();
}

function daysToExpiry(value: any) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function alertLevel(row: Row): AlertLevel {
  const days = daysToExpiry(row.expiry_date);
  if (days === null) return "NO_EXPIRY";
  if (days < 0) return "EXPIRED";
  if (days <= 90) return "HARD_WARNING";
  if (days <= 180) return "WARNING";
  return "OK";
}

function levelRank(level: AlertLevel) {
  if (level === "EXPIRED") return 1;
  if (level === "HARD_WARNING") return 2;
  if (level === "NO_EXPIRY") return 3;
  if (level === "WARNING") return 4;
  return 5;
}

function alertMessage(row: Row, level: AlertLevel, days: number | null) {
  const category = txt(row.category_code) || "Evidence";

  if (level === "EXPIRED") {
    return `${category} expired ${Math.abs(days || 0)} days ago. Treat as blocker until renewed or superseded.`;
  }

  if (level === "HARD_WARNING") {
    return `${category} expires in ${days} days. Hard warning: renew/replace before final tender submission.`;
  }

  if (level === "WARNING") {
    return `${category} expires in ${days} days. Start renewal planning.`;
  }

  if (level === "NO_EXPIRY") {
    return `${category} has no expiry date recorded. Reviewer must verify whether expiry is not applicable or missing.`;
  }

  return `${category} expiry is currently acceptable.`;
}

async function readAllEvidence(limit = 50000) {
  const chunkSize = 1000;
  let from = 0;
  const rows: Row[] = [];

  while (rows.length < limit) {
    const to = from + chunkSize - 1;
    const { data, error } = await supabase
      .from("company_evidence_index")
      .select("*")
      .range(from, to);

    if (error) throw new Error(`company_evidence_index: ${error.message}`);

    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < chunkSize) break;
    from += chunkSize;
  }

  return rows.slice(0, limit);
}

export async function GET() {
  try {
    const evidenceRows = await readAllEvidence();

    const alerts = evidenceRows.map((row) => {
      const level = alertLevel(row);
      const days = daysToExpiry(row.expiry_date);

      return {
        company_id: row.company_id || null,
        company_code: row.company_code || null,
        company_name: row.company_name || null,
        category_code: row.category_code || null,
        document_title: row.document_title || null,
        document_no: row.document_no || null,
        evidence_url: row.evidence_url || row.file_url || null,
        expiry_date: row.expiry_date || null,
        days_to_expiry: days,
        alert_level: level,
        is_hard_warning: level === "HARD_WARNING",
        is_blocker: level === "EXPIRED",
        message: alertMessage(row, level, days),
      };
    });

    const summary = {
      totalEvidence: alerts.length,
      expired: alerts.filter((row) => row.alert_level === "EXPIRED").length,
      hardWarning90Days: alerts.filter((row) => row.alert_level === "HARD_WARNING").length,
      warning180Days: alerts.filter((row) => row.alert_level === "WARNING").length,
      noExpiryDate: alerts.filter((row) => row.alert_level === "NO_EXPIRY").length,
      ok: alerts.filter((row) => row.alert_level === "OK").length,
    };

    const critical = alerts
      .filter((row) => row.alert_level === "EXPIRED" || row.alert_level === "HARD_WARNING")
      .sort((a, b) => {
        const rank = levelRank(a.alert_level as AlertLevel) - levelRank(b.alert_level as AlertLevel);
        if (rank !== 0) return rank;
        return Number(a.days_to_expiry ?? 999999) - Number(b.days_to_expiry ?? 999999);
      })
      .slice(0, 100);

    return NextResponse.json({
      ok: true,
      version: "expiry-summary-v1",
      policy: {
        expired: "blocker",
        hardWarningDays: 90,
        warningDays: 180,
      },
      summary,
      critical,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        version: "expiry-summary-v1",
        error: error?.message || "Unknown expiry summary error",
      },
      { status: 500 }
    );
  }
}
