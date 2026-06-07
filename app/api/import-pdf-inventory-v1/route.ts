import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type Row = Record<string, any>;

type TaxonomyItem = {
  code: string;
  label: string;
  group: string;
  keywords: string[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const VERSION = "pdf-inventory-foundation-v1";

const PDF_TAXONOMY: TaxonomyItem[] = [
  {
    code: "SSM",
    label: "SSM",
    group: "Company identity",
    keywords: ["ssm", "suruhanjaya syarikat", "company profile", "company information", "superform", "section 17", "borang 9", "borang 24", "borang 49"],
  },
  {
    code: "CIDB_PPK",
    label: "CIDB / PPK",
    group: "Work qualification",
    keywords: ["ppk", "perakuan pendaftaran kontraktor", "cidb ppk", "sijil ppk"],
  },
  {
    code: "CIDB_SPKK",
    label: "CIDB / SPKK",
    group: "Work qualification",
    keywords: ["spkk", "sijil perolehan kerja kerajaan", "cidb spkk"],
  },
  {
    code: "CIDB_STB",
    label: "CIDB / STB",
    group: "Work qualification",
    keywords: ["stb", "taraf bumiputera", "sijil taraf bumiputera", "bumiputera"],
  },
  {
    code: "CIDB_SCORE",
    label: "CIDB SCORE",
    group: "Work qualification",
    keywords: ["score", "cidb score", "penarafan score"],
  },
  {
    code: "MOF_VENDOR",
    label: "MOF / vendor registration",
    group: "Vendor qualification",
    keywords: ["mof", "kementerian kewangan", "eperolehan", "e perolehan", "vendor", "kod bidang", "sijil aku janji"],
  },
  {
    code: "TCC_TAX",
    label: "TCC / tax",
    group: "Financial and statutory",
    keywords: ["tcc", "tax compliance", "tax clearance", "lhdn", "hasil", "cukai", "income tax"],
  },
  {
    code: "AUDIT_ANNUAL_REPORT",
    label: "Audit / annual report",
    group: "Financial and statutory",
    keywords: ["audit", "audited", "annual report", "financial statement", "penyata kewangan", "kunci kira", "profit loss", "balance sheet"],
  },
  {
    code: "BANK_STATEMENT_FACILITY",
    label: "Bank statement / facility",
    group: "Financial and statutory",
    keywords: ["bank", "bank statement", "penyata bank", "facility", "kemudahan kredit", "credit facility", "banker", "bank guarantee"],
  },
  {
    code: "KWSP_SOCSO_SIP",
    label: "KWSP / SOCSO / SIP",
    group: "Staff statutory",
    keywords: ["kwsp", "epf", "socso", "perkeso", "sip", "eis", "borang a", "caruman"],
  },
  {
    code: "DIRECTOR_SHAREHOLDER",
    label: "Director / shareholder",
    group: "Ownership and governance",
    keywords: ["director", "directors", "shareholder", "shareholders", "pemegang saham", "pengarah", "equity", "ekuiti", "ownership"],
  },
  {
    code: "STAFF_COMPETENCY_ACADEMIC",
    label: "Staff competency / academic certificates",
    group: "People capability",
    keywords: ["staff", "personel", "personnel", "competency", "academic", "degree", "diploma", "sijil akademik", "certificate", "resume", "cv", "technical personnel", "orang kompeten"],
  },
  {
    code: "PROJECT_EXPERIENCE_LA_CPC_GA",
    label: "LA / CPC / GA / project experience",
    group: "Experience proof",
    keywords: ["letter of award", "award letter", " la ", "cpc", "certificate of practical completion", "completion certificate", "ga", "performance report", "project experience", "pengalaman kerja", "work done", "project completion"],
  },
  {
    code: "RECEIPT_PAYMENT",
    label: "Receipts / proof of payment",
    group: "Payment proof",
    keywords: ["receipt", "resit", "payment", "proof of payment", "bayaran", "paid", "transaction"],
  },
];

function txt(value: any) {
  return String(value ?? "").trim();
}

function compactText(value: any) {
  return txt(value).replace(/[_\-.()/\\]+/g, " ").replace(/\s+/g, " ").trim();
}

function lower(value: any) {
  return compactText(value).toLowerCase();
}

function normalizeName(value: any) {
  return compactText(value)
    .toUpperCase()
    .replace(/\b(SDN|BHD|SDN BHD|BERHAD|PLT|ENTERPRISE|TRADING|CONSTRUCTION|RESOURCES|SERVICES)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFileName(name: string) {
  return compactText(name).replace(/\.pdf$/i, "").trim();
}

function hash(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function getValue(row: Row, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && txt(value) !== "") return txt(value);
  }
  return fallback;
}

function isPdfFile(file: Row) {
  const mimeType = lower(getValue(file, ["mimeType", "mime_type", "mimetype"]));
  const name = lower(getValue(file, ["name", "file_name", "filename", "title"]));
  return mimeType === "application/pdf" || name.endsWith(" pdf") || name.endsWith(".pdf") || mimeType.includes("pdf");
}

function extractDriveFileId(input: Row) {
  const explicit = getValue(input, ["id", "fileId", "file_id", "drive_file_id", "driveFileId"]);
  if (explicit && !explicit.includes("/")) return explicit;

  const candidates = [
    explicit,
    getValue(input, ["url", "webViewLink", "web_view_link", "drive_url", "alternateLink", "link"]),
    getValue(input, ["webContentLink", "web_content_link"]),
  ];

  for (const candidate of candidates) {
    const value = txt(candidate);
    const fileMatch = value.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return fileMatch[1];

    const idMatch = value.match(/[?&]id=([^&]+)/);
    if (idMatch?.[1]) return idMatch[1];
  }

  return "";
}

function driveUrl(file: Row) {
  const direct = getValue(file, ["webViewLink", "web_view_link", "drive_url", "url", "alternateLink", "link"]);
  if (direct) return direct;

  const fileId = extractDriveFileId(file);
  return fileId ? `https://drive.google.com/file/d/${fileId}/view` : "";
}

function hasKeyword(haystack: string, keyword: string) {
  const needle = lower(keyword);
  if (!needle) return false;

  if (needle.length <= 3 || needle.startsWith(" ") || needle.endsWith(" ")) {
    const escaped = needle.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i").test(haystack);
  }

  return haystack.includes(needle);
}

function classifyPdf(file: Row) {
  const name = cleanFileName(getValue(file, ["name", "file_name", "filename", "title"], "Untitled PDF"));
  const description = getValue(file, ["description", "fullText", "text", "ocr_text"]);
  const haystack = ` ${lower(name)} ${lower(description)} `;

  let best: TaxonomyItem | null = null;
  let bestScore = 0;
  const keywordHits: string[] = [];

  for (const item of PDF_TAXONOMY) {
    let score = 0;
    const hits: string[] = [];

    for (const keyword of item.keywords) {
      if (hasKeyword(haystack, keyword)) {
        hits.push(keyword.trim());
        score += keyword.length <= 4 ? 1 : 2;
      }
    }

    if (score > bestScore) {
      best = item;
      bestScore = score;
      keywordHits.splice(0, keywordHits.length, ...hits);
    }
  }

  if (!best) {
    return {
      document_category: "OTHER_UNCLASSIFIED",
      document_subcategory: "Other / unclassified PDF",
      classification_confidence: 0.2,
      classification_keywords: [],
    };
  }

  return {
    document_category: best.code,
    document_subcategory: best.label,
    classification_confidence: Math.min(0.95, 0.45 + bestScore * 0.12),
    classification_keywords: keywordHits,
  };
}

function extractCandidateCompanyName(file: Row) {
  let value = cleanFileName(getValue(file, ["name", "file_name", "filename", "title"]));

  const removePatterns = [
    /\b(SSM|CIDB|PPK|SPKK|STB|SCORE|MOF|TCC|TAX|AUDIT|ANNUAL REPORT|BANK STATEMENT|KWSP|SOCSO|PERKESO|SIP|RECEIPT|RESIT|PAYMENT|LA|CPC|GA|CERTIFICATE|SIJIL|PDF|LATEST|TERKINI|UPDATED|UPDATE|RENEWAL|RENEW)\b/gi,
    /\b(20\d{2}|19\d{2})\b/g,
  ];

  for (const pattern of removePatterns) value = value.replace(pattern, " ");

  return compactText(value);
}

function overlapScore(a: string, b: string) {
  const aWords = new Set(normalizeName(a).split(" ").filter((w) => w.length > 2));
  const bWords = new Set(normalizeName(b).split(" ").filter((w) => w.length > 2));
  if (!aWords.size || !bWords.size) return 0;

  let matched = 0;
  for (const word of aWords) {
    if (bWords.has(word)) matched++;
  }

  return matched / Math.max(aWords.size, bWords.size);
}

function matchCompany(file: Row, companies: Row[]) {
  const fileName = cleanFileName(getValue(file, ["name", "file_name", "filename", "title"]));
  const fileNorm = normalizeName(fileName);
  const candidate = extractCandidateCompanyName(file);
  const candidateNorm = normalizeName(candidate);

  let best: Row | null = null;
  let bestConfidence = 0;
  let method = "NO_MATCH";

  for (const company of companies) {
    const companyName = getValue(company, ["company_name", "name"]);
    const companyNorm = normalizeName(companyName);
    if (!companyNorm) continue;

    let confidence = 0;
    let currentMethod = "";

    if (fileNorm.includes(companyNorm)) {
      confidence = 0.96;
      currentMethod = "FILENAME_CONTAINS_COMPANY_NAME";
    } else if (candidateNorm && candidateNorm.includes(companyNorm)) {
      confidence = 0.9;
      currentMethod = "CANDIDATE_CONTAINS_COMPANY_NAME";
    } else if (candidateNorm && companyNorm.includes(candidateNorm) && candidateNorm.length >= 8) {
      confidence = 0.82;
      currentMethod = "COMPANY_NAME_CONTAINS_CANDIDATE";
    } else {
      const score = Math.max(overlapScore(fileName, companyName), overlapScore(candidate, companyName));
      if (score >= 0.7) {
        confidence = 0.62 + score * 0.2;
        currentMethod = "TOKEN_OVERLAP";
      }
    }

    if (confidence > bestConfidence) {
      best = company;
      bestConfidence = confidence;
      method = currentMethod;
    }
  }

  return {
    company: best,
    confidence: Number(bestConfidence.toFixed(2)),
    method,
    candidate_company_name: candidate,
  };
}

function parseFilesFromBody(body: any): Row[] {
  if (Array.isArray(body)) return body;

  const candidates = [
    body?.files,
    body?.driveFiles,
    body?.drive_files,
    body?.pdfs,
    body?.items,
    body?.data?.files,
    body?.data?.items,
    body?.result?.files,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function removeUndefined(row: Row) {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function columnFromError(error: any) {
  const message = txt(error?.message || error?.details || "");
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column "([^"]+)" of relation/i,
    /column "([^"]+)" does not exist/i,
    /record "new" has no field "([^"]+)"/i,
    /schema cache.+?'([^']+)'/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

async function insertOneFlexible(table: string, row: Row) {
  const payload = removeUndefined(row);
  const removedColumns: string[] = [];

  for (let attempt = 0; attempt < 40; attempt++) {
    const { data, error } = await supabase.from(table).insert(payload).select("*").single();

    if (!error) return { data: (data || {}) as Row, removedColumns };

    const missingColumn = columnFromError(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
      delete payload[missingColumn];
      removedColumns.push(missingColumn);
      continue;
    }

    throw new Error(`${table}: ${error.message}`);
  }

  throw new Error(`${table}: unable to adapt insert payload after repeated schema retries.`);
}

async function insertRowsFlexible(table: string, rows: Row[], chunkSize = 200) {
  let inserted = 0;
  const insertedRows: Row[] = [];
  const removedColumns = new Set<string>();

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    let chunk = rows.slice(offset, offset + chunkSize).map(removeUndefined);

    for (let attempt = 0; attempt < 40; attempt++) {
      const { data, error } = await supabase.from(table).insert(chunk).select("*");

      if (!error) {
        inserted += chunk.length;
        insertedRows.push(...((data || []) as Row[]));
        break;
      }

      const missingColumn = columnFromError(error);
      if (missingColumn) {
        chunk = chunk.map((row) => {
          const next = { ...row };
          delete next[missingColumn];
          return next;
        });
        removedColumns.add(missingColumn);
        continue;
      }

      throw new Error(`${table}: ${error.message}`);
    }
  }

  return { inserted, insertedRows, removedColumns: Array.from(removedColumns) };
}

function buildCategorySummary(rows: Row[]) {
  return rows.reduce<Row>((acc, row) => {
    const key = row.document_category || "OTHER_UNCLASSIFIED";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildReviewRows(rows: Row[], insertedDocs: Row[]) {
  const out: Row[] = [];

  rows.forEach((row, index) => {
    const inserted = insertedDocs[index] || {};
    const lowCompany = Number(row.match_confidence || 0) < 0.65;
    const lowCategory = Number(row.classification_confidence || 0) < 0.6;

    if (!lowCompany && !lowCategory) return;

    out.push({
      pdf_document_id: inserted.id || null,
      batch_id: row.batch_id || null,
      drive_file_id: row.drive_file_id || null,
      file_name: row.file_name || null,
      company_id: row.matched_company_id || null,
      company_code: row.matched_company_code || null,
      field_name: lowCompany ? "company_match" : "document_category",
      sheet_value: lowCompany ? row.candidate_company_name || null : null,
      pdf_value: lowCompany ? row.matched_company_name || null : row.document_category || null,
      result_status: lowCompany ? "LOW_CONFIDENCE_COMPANY_MATCH" : "LOW_CONFIDENCE_CLASSIFICATION",
      confidence_score: lowCompany ? row.match_confidence : row.classification_confidence,
      remarks: lowCompany
        ? "PDF file could not be confidently matched to a company. Human review required."
        : "PDF file category is low-confidence. Human review required.",
      raw_metadata: {
        classification_keywords: row.classification_keywords,
        match_method: row.match_method,
      },
      created_at: new Date().toISOString(),
    });
  });

  return out;
}

export async function POST(request: Request) {
  const warnings: string[] = [];

  try {
    const body = await request.json();
    const allFiles = parseFilesFromBody(body);
    const pdfFiles = allFiles.filter(isPdfFile);

    if (!allFiles.length) {
      return NextResponse.json(
        {
          ok: false,
          version: VERSION,
          error: "No files array detected. Send { files: [...] } using Google Drive file metadata.",
        },
        { status: 400 }
      );
    }

    if (!pdfFiles.length) {
      return NextResponse.json(
        {
          ok: false,
          version: VERSION,
          error: "File list received, but no PDF file was detected.",
          received_files: allFiles.length,
        },
        { status: 400 }
      );
    }

    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("id, company_code, company_name")
      .limit(50000);

    if (companyError) throw new Error(`companies: ${companyError.message}`);

    const now = new Date().toISOString();
    const sourceRootUrl = txt(body.source_root_url || body.sourceRootUrl || body.folder_url || body.folderUrl || body.url);
    const importName = txt(body.import_name || body.importName || `PDF INVENTORY IMPORT ${now.slice(0, 10)}`);

    const batchPayload = {
      import_name: importName,
      batch_name: importName,
      source_system: txt(body.source_system || body.sourceSystem || "GOOGLE_DRIVE"),
      source_root_url: sourceRootUrl || null,
      source_url: sourceRootUrl || null,
      total_files: allFiles.length,
      total_pdf_files: pdfFiles.length,
      imported_files: 0,
      skipped_files: allFiles.length - pdfFiles.length,
      status: "RUNNING",
      metadata: {
        version: VERSION,
        taxonomy: PDF_TAXONOMY.map(({ code, label, group }) => ({ code, label, group })),
        received_file_count: allFiles.length,
        pdf_file_count: pdfFiles.length,
      },
      created_by: "Tender Systemz PDF Inventory Import V1",
      created_at: now,
    };

    const batchInsert = await insertOneFlexible("pdf_inventory_batches", batchPayload);
    if (batchInsert.removedColumns.length) {
      warnings.push(`Batch insert skipped unknown columns: ${batchInsert.removedColumns.join(", ")}`);
    }

    const batch = batchInsert.data;
    const batchId = batch.id || null;

    const documentRows = pdfFiles.map((file) => {
      const fileName = cleanFileName(getValue(file, ["name", "file_name", "filename", "title"], "Untitled PDF"));
      const fileId = extractDriveFileId(file);
      const classification = classifyPdf(file);
      const matched = matchCompany(file, (companies || []) as Row[]);
      const matchedCompany = matched.company;

      return {
        batch_id: batchId,
        import_batch_id: batchId,
        source_system: batchPayload.source_system,
        source_ref: fileId || hash(file),
        drive_file_id: fileId || null,
        source_file_id: fileId || null,
        drive_url: driveUrl(file) || null,
        file_url: driveUrl(file) || null,
        file_name: fileName,
        original_file_name: getValue(file, ["name", "file_name", "filename", "title"], fileName),
        mime_type: getValue(file, ["mimeType", "mime_type", "mimetype"], "application/pdf"),
        file_extension: "pdf",
        file_size: getValue(file, ["size", "file_size"], "") || null,
        created_time: getValue(file, ["createdTime", "created_time", "created_at"], "") || null,
        modified_time: getValue(file, ["modifiedTime", "modified_time", "updated_at"], "") || null,
        md5_checksum: getValue(file, ["md5Checksum", "md5_checksum"], "") || null,
        document_category: classification.document_category,
        document_subcategory: classification.document_subcategory,
        classification_confidence: classification.classification_confidence,
        classification_keywords: classification.classification_keywords,
        detected_company_name: matched.candidate_company_name || null,
        normalized_company_name: normalizeName(matched.candidate_company_name),
        matched_company_id: matchedCompany?.id || null,
        matched_company_code: matchedCompany?.company_code || null,
        matched_company_name: matchedCompany?.company_name || null,
        match_confidence: matched.confidence,
        match_method: matched.method,
        evidence_status: "INVENTORIED",
        extraction_status: "NOT_EXTRACTED",
        review_status: matched.confidence >= 0.65 && classification.classification_confidence >= 0.6 ? "AUTO_CLASSIFIED" : "NEEDS_REVIEW",
        source_hash: hash(file),
        raw_metadata: file,
        imported_at: now,
        created_at: now,
      };
    });

    const insertedDocs = await insertRowsFlexible("pdf_document_inventory", documentRows, 150);
    if (insertedDocs.removedColumns.length) {
      warnings.push(`Document insert skipped unknown columns: ${insertedDocs.removedColumns.join(", ")}`);
    }

    const reviewRows = buildReviewRows(documentRows, insertedDocs.insertedRows);
    let reviewInserted = 0;

    if (reviewRows.length) {
      try {
        const reviewResult = await insertRowsFlexible("pdf_sheet_crosscheck_results", reviewRows, 150);
        reviewInserted = reviewResult.inserted;
        if (reviewResult.removedColumns.length) {
          warnings.push(`Review insert skipped unknown columns: ${reviewResult.removedColumns.join(", ")}`);
        }
      } catch (error: any) {
        warnings.push(`Review rows were not inserted: ${error?.message || "unknown error"}`);
      }
    }

    try {
      await supabase
        .from("pdf_inventory_batches")
        .update({
          imported_files: insertedDocs.inserted,
          review_items: reviewRows.length,
          status: "SUCCESS",
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);
    } catch (error: any) {
      warnings.push(`Batch completion update skipped: ${error?.message || "unknown error"}`);
    }

    const matchedCount = documentRows.filter((row) => Number(row.match_confidence || 0) >= 0.65).length;
    const lowConfidenceCount = documentRows.filter(
      (row) => Number(row.match_confidence || 0) < 0.65 || Number(row.classification_confidence || 0) < 0.6
    ).length;

    return NextResponse.json({
      ok: true,
      version: VERSION,
      batch_id: batchId,
      received_files: allFiles.length,
      pdf_files: pdfFiles.length,
      imported_documents: insertedDocs.inserted,
      skipped_non_pdf: allFiles.length - pdfFiles.length,
      matched_to_company: matchedCount,
      low_confidence_or_review: lowConfidenceCount,
      review_rows_inserted: reviewInserted,
      category_summary: buildCategorySummary(documentRows),
      warnings,
      message: "PDF inventory imported. PDF evidence remains source-of-truth; sheet/manual values remain claimed data until cross-check is completed.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        version: VERSION,
        error: error?.message || "Unknown PDF inventory import error",
        warnings,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/import-pdf-inventory-v1",
    method: "POST",
    version: VERSION,
    accepted_payload: {
      import_name: "PDF INVENTORY IMPORT",
      source_root_url: "Google Drive folder URL",
      files: [
        {
          id: "google-drive-file-id",
          name: "ABC SDN BHD - CIDB PPK.pdf",
          mimeType: "application/pdf",
          webViewLink: "https://drive.google.com/file/d/.../view",
          createdTime: "2026-06-01T00:00:00.000Z",
          modifiedTime: "2026-06-01T00:00:00.000Z",
          size: "123456",
        },
      ],
    },
    taxonomy: PDF_TAXONOMY.map(({ code, label, group, keywords }) => ({ code, label, group, keywords })),
  });
}
