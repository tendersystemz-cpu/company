import { createSupabaseServerClient, getSupabaseEnvStatus } from '@/lib/supabase/server';

async function loadDebug() {
  const env = getSupabaseEnvStatus();
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      env,
      connected: false,
      error: 'Supabase client not created. Environment variables are missing.',
      recommendationCount: null as number | null
    };
  }

  const { count, error } = await supabase
    .from('tender_final_recommendation_board')
    .select('*', { count: 'exact', head: true });

  return {
    env,
    connected: !error,
    error: error?.message ?? null,
    recommendationCount: count ?? null
  };
}

export default async function DebugPage() {
  const debug = await loadDebug();

  return (
    <div>
      <header className="pageHeader">
        <div>
          <div className="eyebrow">Deployment Debug</div>
          <h1>Supabase connection status</h1>
          <p>This page does not expose the full key. It only confirms whether the app can see env values and read the dashboard view.</p>
        </div>
      </header>

      <section className="grid cols3">
        <div className="card">
          <div className="label">URL env</div>
          <div className="metric">{debug.env.hasUrl ? 'OK' : 'Missing'}</div>
          <p>{debug.env.urlHost ?? '-'}</p>
        </div>
        <div className="card">
          <div className="label">Key env</div>
          <div className="metric">{debug.env.hasKey ? 'OK' : 'Missing'}</div>
          <p>{debug.env.keyPrefix ?? '-'}</p>
        </div>
        <div className="card">
          <div className="label">Recommendation rows</div>
          <div className="metric">{debug.recommendationCount ?? '-'}</div>
          <p>{debug.connected ? 'Connected' : 'Not connected'}</p>
        </div>
      </section>

      {debug.error ? (
        <section className="emptyState" style={{ marginTop: 16 }}>
          <h2>Error</h2>
          <p>{debug.error}</p>
        </section>
      ) : null}
    </div>
  );
}
