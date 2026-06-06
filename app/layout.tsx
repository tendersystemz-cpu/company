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

            <Link href="/" className="app-nav-icon" title="Dashboard">
              ⌂
            </Link>

            <Link href="/companies" className="app-nav-icon" title="Company Register">
              ▦
            </Link>

            <Link href="/ssm" className="app-nav-icon app-nav-text" title="SSM Information">
              SSM
            </Link>

            <Link href="/cidb" className="app-nav-icon app-nav-text" title="CIDB Information">
              CIDB
            </Link>

            <Link href="/evidence" className="app-nav-icon" title="Evidence Register">
              ▣
            </Link>

            <Link href="/preq" className="app-nav-icon" title="Pre-Q Review">
              ✓
            </Link>

            <Link href="/matrix" className="app-nav-icon" title="Compliance Matrix">
              ⊞
            </Link>

            <Link href="/readiness" className="app-nav-icon" title="Readiness Report">
              ◉
            </Link>

            <Link href="/tender-rules" className="app-nav-icon app-nav-text" title="Tender Rules">
              RUL
            </Link>

            <Link href="/api-test" className="app-nav-icon app-nav-text" title="API Test">
              API
            </Link>
          </aside>

          <section className="app-content">
            <div className="app-topbar">
              <div>
                <div className="app-title">Tender Readiness System</div>
                <div className="app-subtitle">
                  Evidence → Compliance → Scoring → Advisory → Tender Pack
                </div>
              </div>
            </div>

            <div className="app-page">{children}</div>
          </section>
        </div>
      </body>
    </html>
  );
}
