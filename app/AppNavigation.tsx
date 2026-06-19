"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", short: "DASH" },
  { href: "/company-overview", label: "Company Overview", short: "CO" },
  { href: "/readiness", label: "Company Action Profile", short: "ACT" },
  { href: "/company-master-full-import", label: "Import Centre", short: "IMP" },
  { href: "/drive-vault-import", label: "Drive Mapping", short: "DRV" },
  { href: "/pdf-vault", label: "Document Vault", short: "DOC" },
  { href: "/evidence-verification", label: "Verification Workspace", short: "VER" },
  { href: "/infodata/company-mof", label: "InfoData Syarikat + MOF", short: "INFO" },
  { href: "/infodata/company-mof-intake", label: "Input Kod MOF", short: "MOF+" },
  { href: "/cidb", label: "CIDB", short: "CIDB" },
  { href: "/mof", label: "MOF", short: "MOF" },
  { href: "/personnel-ccd", label: "Personnel / CCD", short: "CCD" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.indexOf(href + "/") === 0;
}

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar" aria-label="Main navigation">
      <div className="app-logo">AL</div>
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            href={item.href}
            className={"app-nav-icon app-nav-text" + (active ? " active" : "")}
            title={item.label}
            aria-current={active ? "page" : undefined}
            key={item.href}
          >
            <span>{item.short}</span>
          </Link>
        );
      })}
    </aside>
  );
}
