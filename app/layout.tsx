import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Compliance ALARP",
  description: "Current Verified Company State",
};

const navItems = [
  { href: "/", label: "Dashboard", short: "DASH" },
  { href: "/company-overview", label: "Company Overview", short: "CO" },
  { href: "/data-intake", label: "Data Intake Center", short: "IN" },
  { href: "/infodata/company-mof", label: "InfoData MOF View", short: "INFO" },
  { href: "/infodata/company-mof-intake", label: "Input Kod MOF", short: "MOF+" },
  { href: "/readiness", label: "Company Action Profile", short: "ACT" },
  { href: "/company-master-full-import", label: "Import Centre", short: "IMP" },
  { href: "/drive-vault-import", label: "Drive Mapping", short: "DRV" },
  { href: "/pdf-vault", label: "Document Vault", short: "DOC" },
  { href: "/evidence-verification", label: "Verification Workspace", short: "VER" },
  { href: "/cidb", label: "CIDB", short: "CIDB" },
  { href: "/mof", label: "MOF", short: "MOF" },
  { href: "/personnel-ccd", label: "Personnel / CCD", short: "CCD" },
];

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
            <div className="app-logo">AL</div>
            {navItems.map((item) => (
              <Link
                href={item.href}
                className="app-nav-icon app-nav-text"
                title={item.label}
                key={item.href}
              >
                {item.short}
              </Link>
            ))}
          </aside>

          <section className="app-content">
            <div className="app-topbar">
              <div>
                <div className="app-title">Company Compliance ALARP</div>
                <div className="app-subtitle">Current Verified Company State | Import | Verification | Minimum Compliance ALARP</div>
              </div>
            </div>
            <div className="app-page">{children}</div>
          </section>
        </div>
      </body>
    </html>
  );
}
