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
            <Link href="/company-intelligence" className="app-nav-icon app-nav-text" title="One Company Intelligence View">ONE</Link>
            <Link href="/eligibility-search" className="app-nav-icon app-nav-text" title="Company Profile Search">ELG</Link>
            <Link href="/pdf-vault" className="app-nav-icon app-nav-text" title="PDF Vault">PDF</Link>
            <Link href="/preq-evaluation" className="app-nav-icon app-nav-text" title="Pre-Q Evaluation">PQR</Link>
            <Link href="/gap-audit" className="app-nav-icon app-nav-text" title="Gap Audit">GAP</Link>
            <Link href="/api-test" className="app-nav-icon app-nav-text" title="API Test">API</Link>
          </aside>

          <section className="app-content">
            <div className="app-topbar">
              <div>
                <div className="app-title">Tender Readiness System</div>
                <div className="app-subtitle">Sheet Infodata → One Company View → Evidence → Compliance Simulation</div>
              </div>
            </div>
            <div className="app-page">{children}</div>
          </section>
        </div>
      </body>
    </html>
  );
}
