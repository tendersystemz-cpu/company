import { createSupabaseServerClient } from '@/lib/supabase/server';
import { displayAmount } from '@/lib/ui';

type Row = {
  tender_id: string;
  tender_title: string;
  employer_or_client: string | null;
  tender_category: string | null;
  contract_amount: number | null;
};

async function loadRows() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { rows: [] as Row[], configured: false, error: null as null | { message: string } };

  const { data, error } = await supabase
    .from('tender_bidder_stage_summary')
    .select('tender_id,tender_title,employer_or_client,tender_category,contract_amount')
    .order('tender_title', { ascending: true })
    .limit(100);

  const map = new Map<string, Row>();
  for (const row of data ?? []) {
    map.set(row.tender_id, row as Row);
  }

  return { rows: Array.from(map.values()), configured: true, error };
}

export default async function TendersPage() {
  const { rows, configured, error } = await loadRows();

  return (
    <div>
      <header className="pageHeader">
        <div>
          <div className="eyebrow">Tenders</div>
          <h1>Tender list</h1>
          <p>Each tender becomes a decision context for bidder evaluation.</p>
        </div>
      </header>

      {!configured || error ? (
        <section className="emptyState">
          <h2>{!configured ? 'Supabase is not configured' : 'Tender view is not ready'}</h2>
          <p>{error?.message ?? 'Set Supabase env values and apply migrations.'}</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="emptyState">
          <h2>No tender data yet</h2>
          <p>Run the smoke test or import a tender workbook.</p>
        </section>
      ) : (
        <div className="grid">
          {rows.map((row) => (
            <article className="card" key={row.tender_id}>
              <div className="eyebrow">{row.tender_category ?? 'No category'}</div>
              <h2>{row.tender_title}</h2>
              <p>{row.employer_or_client ?? 'No employer/client recorded'}</p>
              <div className="metric">{displayAmount(row.contract_amount)}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
