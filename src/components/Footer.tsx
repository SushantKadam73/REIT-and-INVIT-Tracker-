export function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-xs text-muted-foreground space-y-3">
        <p className="font-medium text-foreground">
          Not investment advice.
        </p>
        <p>
          This site is an educational tool built by an independent developer. It is not
          registered with SEBI as an investment adviser or research analyst. Nothing here is a
          recommendation to buy or sell any security. REITs and InvITs carry market risk — read
          the trust&apos;s official disclosures and consult a registered advisor before investing.
        </p>
        <p>
          Prices are end-of-day (EOD), sourced from BSE India&apos;s public API, and refreshed
          nightly. Fundamentals and distribution data come from official trust investor-relations
          pages and exchange filings — each figure carries an &quot;as of&quot; date and source
          link. Data may be stale or contain errors; verify before relying on it.
        </p>
        <p>
          No live prices are shown because real-time exchange data requires a paid
          redistribution licence from NSE Data &amp; Analytics / BSE Information Products.
        </p>
        <p className="pt-2">
          © {new Date().getFullYear()} REIT/InvIT Tracker India · Data as of nightly refresh ·{" "}
          <a href="/methodology/" className="underline hover:text-foreground">
            Methodology &amp; sources
          </a>
        </p>
      </div>
    </footer>
  );
}
