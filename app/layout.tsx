import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tender Systemz — Tender Readiness System',
  description: 'Company compliance and tender evaluation intelligence web app.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">
              <span className="brandMark">TS</span>
              <div>
                <strong>Tender Systemz</strong>
                <small>Readiness + Evaluation</small>
              </div>
            </div>
            <nav>
              <a href="/">Dashboard</a>
              <a href="/tenders">Tenders</a>
              <a href="/stage-1">Stage 1 Board</a>
              <a href="/recommendations">Recommendations</a>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
