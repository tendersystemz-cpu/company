import { NextResponse } from "next/server";

function txt(v: any) {
  return String(v ?? "").trim();
}

function getSpreadsheetId(url: string) {
  const match = url.match(/\/spreadsheets\/d\/([^/]+)/);
  return match?.[1] || "";
}

function getGid(url: string) {
  const fromQuery = url.match(/[?&#]gid=([0-9]+)/);
  return fromQuery?.[1] || "";
}

function buildCandidateUrls(rawUrl: string) {
  const url = txt(rawUrl);
  const id = getSpreadsheetId(url);
  const gid = getGid(url);

  if (!id) return [url];

  const candidates: string[] = [];

  if (url.includes("format=csv") || url.includes("output=csv") || url.endsWith(".csv")) {
    candidates.push(url);
  }

  if (gid) {
    candidates.push(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`);
    candidates.push(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`);
  }

  candidates.push(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`);
  candidates.push(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`);

  return Array.from(new Set(candidates));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sourceUrl = txt(body.url);

    if (!sourceUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing Google Sheet URL." },
        { status: 400 }
      );
    }

    const candidates = buildCandidateUrls(sourceUrl);
    const attempts: any[] = [];

    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate, {
          method: "GET",
          cache: "no-store",
          headers: {
            accept: "text/csv,text/plain,*/*",
          },
        });

        const text = await res.text();

        attempts.push({
          url: candidate,
          status: res.status,
          ok: res.ok,
          preview: text.slice(0, 120),
        });

        if (res.ok && text && !text.toLowerCase().includes("<html")) {
          return NextResponse.json({
            ok: true,
            csv: text,
            usedUrl: candidate,
            attempts,
          });
        }
      } catch (err: any) {
        attempts.push({
          url: candidate,
          ok: false,
          error: err?.message || "fetch failed",
        });
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to fetch CSV. Copy the exact sheet tab URL with gid, or set Google Sheet to Anyone with link can view / Publish to web as CSV.",
        attempts,
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown fetch-sheet-csv error.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/fetch-sheet-csv",
    method: "POST",
  });
}