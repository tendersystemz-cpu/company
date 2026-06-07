import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tender Readiness System",
  description: "Tender Readiness System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body>
        <div className="app-shell">
          <aside className="app-sidebar">
            <div className="app-logo">✓</div>
            <Link href="/" className="app-nav-icon" title="Dashboard">⌂</Link>
            <Link href="/companies" className="app-nav-icon" title="Company Register">▦</Link>
            <Link href="/sheet-infodata" className="app-nav-icon app-nav-text" title="Google Sheet Infodata Room">SHT</Link>
            <Link href="/company-master-full-import" className="app-nav-icon app-nav-text" title="Company Master Full Import">CMF</Link>
            <Link href="/pdf-vault" className="app-nav-icon app-nav-text" title="PDF Vault / Evidence Source of Truth">PDF</Link>
            <Link href="/eligibility-search" className="app-nav-icon app-nav-text" title="Group Eligibility Search">ELG</Link>
            <Link href="/preq-evaluation" className="app-nav-icon app-nav-text" title="Pre-Q Evaluation Room">PQR</Link>
            <Link href="/gap-audit" className="app-nav-icon app-nav-text" title="Infodata Gap Audit Room">GAP</Link>
            <Link href="/form-rooms" className="app-nav-icon app-nav-text" title="Tender Form Rooms">FRM</Link>
            <Link href="/generate-infodata" className="app-nav-icon app-nav-text" title="Generate Tender Infodata">GEN</Link>
            <Link href="/tender-pack-drafts" className="app-nav-icon app-nav-text" title="Tender Pack Draft Room">TPK</Link>
            <Link href="/kod-bidang-migration" className="app-nav-icon app-nav-text" title="Kod Bidang Migration">KB</Link>
            <Link href="/ssm" className="app-nav-icon app-nav-text" title="SSM Information">SSM</Link>
            <Link href="/cidb" className="app-nav-icon app-nav-text" title="CIDB Information">CIDB</Link>
            <Link href="/cidb-score" className="app-nav-icon app-nav-text" title="CIDB SCORE Register">SCR</Link>
            <Link href="/evidence" className="app-nav-icon" title="Evidence Register">▣</Link>
            <Link href="/evidence-compliance" className="app-nav-icon app-nav-text" title="Evidence Compliance & Health">EVH</Link>
            <Link href="/evidence-tasks" className="app-nav-icon app-nav-text" title="Evidence Update Tasks">EVT</Link>
            <Link href="/preq" className="app-nav-icon" title="Pre-Q Review">✓</Link>
            <Link href="/matrix" className="app-nav-icon" title="Compliance Matrix">⊞</Link>
            <Link href="/readiness" className="app-nav-icon" title="Readiness Report">◉</Link>
            <Link href="/tender-rules" className="app-nav-icon app-nav-text" title="Tender Rules">RUL</Link>
            <Link href="/api-test" className="app-nav-icon app-nav-text" title="API Test">API</Link>
          </aside>

          <section className="app-content">
            <div className="app-topbar">
              <div>
                <div className="app-title">Tender Readiness System</div>
                <div className="app-subtitle">PDF Vault → Verified Facts → Eligibility → Scoring → Tender Pack</div>
              </div>
            </div>
            <div className="app-page">{children}</div>
          </section>
        </div>
      </body>
    </html>
  );
}
