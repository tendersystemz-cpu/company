import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badgeTone, displayAmount } from '@/lib/ui';

type Stage1Row = {
  tender_id: string;
  bidder_id: string;
  bidder_name: string;
  tender_price: number | null;
  stage_1_result: string | null;
  fatal_failure_count: number | null;
  pending_review_count: number | null;
  conditional_pass_count: number | null;
  risk_level: string | null;
  summary_reason: string | null;
  next_action: string | null;
};

async function getRows() {
  const supabase = createSupabaseServerClient();

  if (!supabase) return { rows: [] as Stage1Row[], error: null, configured: false };

  const { data, error } = await supabase
    .from('tender_stage_1_board')
    .select('*')
    .order('tender_price', { ascending: true })
    .limit(50);

  return { rows: (data ?? []) as Stage1Row[], error, configured: true };
}

export default async function Stage1Page() {
  const { rows, error, configured } = await getRows();

  return (
    <div>
      <header className="pageHeader">
        <div>
          <div className="eyebrow">Stage 1</div>
          <h1>Preliminary tender evaluation board</h1>
          <p>
            Formal completeness, document sufficiency, minimum capital, current work performance, and early pass/fail reasoning.
          </p>
        </div>
      </header>

      {!configured || error ? (
        <section className="emptyState">
          <h2>{!configured ? 'Supabase is not configured' : 'Stage 1 view is not ready'}</h2>
          <p>{error?.message ?? 'Set Supabase environment variables and apply migrations.'}</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="emptyState">
          <h2>No Stage 1 data yet</h2>
          <p>Run the migration smoke test or import a tender workbook.</p>
        </section>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Bidder</th>
                <th>Tender Price</th>
                <th>Result</th>
                <th>Fatal</th>
                <th>Pending</th>
                <th>Conditional</th>
                <th>Risk</th>
                <th>Reason / Next Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bidder_id}>
                  <td><strong>{row.bidder_name}</strong></td>
                  <td>{displayAmount(row.tender_price)}</td>
                  <td><span className={`badge ${badgeTone(row.stage_1_result)}`}>{row.stage_1_result ?? 'Not started'}</span></td>
                  <td>{row.fatal_failure_count ?? 0}</td>
                  <td>{row.pending_review_count ?? 0}</td>
                  <td>{row.conditional_pass_count ?? 0}</td>
                  <td><span className="badge warn">{row.risk_level ?? 'MEDIUM'}</span></td>
                  <td>
                    <strong>{row.summary_reason ?? '-'}</strong>
                    <br />
                    <span className="label">{row.next_action ?? '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
