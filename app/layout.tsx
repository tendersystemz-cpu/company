import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tender Systemz — Tender Readiness System',
  description: 'Company compliance and tender evaluation intelligence web app.'
};

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/tenders', label: 'Tenders' },
  { href: '/stage-1', label: 'Tender Evaluation Report' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/debug', label: 'Debug' }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="appFrame">
          <header className="topBar">
            <a className="topBrand" href="/">
              <span className="brandMark">TS</span>
              <div>
                <strong>Tender Systemz</strong>
                <small>Readiness + Evaluation</small>
              </div>
            </a>

            <details className="mainMenu">
              <summary>Menu</summary>
              <div className="mainMenuPanel">
                {navItems.map((item) => (
                  <a href={item.href} key={item.href}>{item.label}</a>
                ))}
              </div>
            </details>
          </header>

          <main className="main fullMain">{children}</main>
        </div>
      </body>
    </html>
  );
}
