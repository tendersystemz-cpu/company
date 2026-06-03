import { createSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase/server';
import { badgeTone, displayAmount } from '@/lib/ui';

type TenderSummaryRow = {
  tender_id: string;
  tender_title: string;
  employer_or_client: string | null;
  tender_category: string | null;
  contract_amount: number | null;
  bidder_id: string;
  bidder_name: string;
  tender_price: number | null;
  stage_1_result: string | null;
  stage_2_result: string | null;
  final_decision: string | null;
  evidence_attention_count: number | null;
};

async function getRows() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return { rows: [] as TenderSummaryRow[], error: null, configured: false };
  }

  const { data, error } = await supabase
    .from('tender_bidder_stage_summary')
    .select('*')
    .order('tender_title', { ascending: true })
    .limit(20);

  return {
    rows: (data ?? []) as TenderSummaryRow[],
    error,
    configured: true
  };
}

export default async function HomePage() {
  const { rows, error, configured } = await getRows();
  const tenderCount = new Set(rows.map((row) => row.tender_id)).size;
  const bidderCount = rows.length;
  const pendingEvidenceCount = rows.reduce((sum, row) => sum + Number(row.evidence_attention_count ?? 0), 0);

  return (
    <div>
      <header className="pageHeader">
        <div>
          <div className="eyebrow">Tender Intelligence Dashboard</div>
          <h1>Compliance first. Capability second. Recommendation with evidence.</h1>
          <p>
            Minimal shell for Tender Systemz. This page reads from the Supabase view{' '}
            <span className="code">tender_bidder_stage_summary</span> after migrations are applied.
          </p>
        </div>
      </header>

      {!configured ? (
        <section className="emptyState">
          <h2>Supabase environment is not configured yet</h2>
          <p>Add these values before running the connected dashboard:</p>
          <p>
            <span className="code">NEXT_PUBLIC_SUPABASE_URL</span>{' '}
            <span className="code">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
          </p>
          <p>Then apply migration 001 and 002 in Supabase SQL Editor.</p>
        </section>
      ) : error ? (
        <section className="emptyState">
          <h2>Dashboard view is not ready</h2>
          <p>{error.message}</p>
          <p>Apply migrations 001 and 002, then run the smoke test guide.</p>
        </section>
      ) : (
        <>
          <section className="grid cols3">
            <div className="card">
              <div className="label">Tenders in view</div>
              <div className="metric">{tenderCount}</div>
            </div>
            <div className="card">
              <div className="label">Bidders in view</div>
              <div className="metric">{bidderCount}</div>
            </div>
            <div className="card">
              <div className="label">Evidence attention</div>
              <div className="metric">{pendingEvidenceCount}</div>
            </div>
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h2>Tender bidder summary</h2>
            {rows.length === 0 ? (
              <p>No tender evaluation data yet. Run the smoke test or sync a tender workbook.</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tender</th>
                      <th>Bidder</th>
                      <th>Price</th>
                      <th>Stage 1</th>
                      <th>Stage 2</th>
                      <th>Final</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.bidder_id}>
                        <td>
                          <strong>{row.tender_title}</strong>
                          <br />
                          <span className="label">{row.employer_or_client ?? '-'} · {row.tender_category ?? '-'}</span>
                        </td>
                        <td>{row.bidder_name}</td>
                        <td>{displayAmount(row.tender_price)}</td>
                        <td><span className={`badge ${badgeTone(row.stage_1_result)}`}>{row.stage_1_result ?? 'Not started'}</span></td>
                        <td><span className={`badge ${badgeTone(row.stage_2_result)}`}>{row.stage_2_result ?? 'Not started'}</span></td>
                        <td><span className={`badge ${badgeTone(row.final_decision)}`}>{row.final_decision ?? 'No decision'}</span></td>
                        <td>{row.evidence_attention_count ?? 0} item(s)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
