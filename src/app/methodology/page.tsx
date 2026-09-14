export const metadata = { title: "Methodology & sources" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

function Weights({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border my-2">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-border first:border-0">
              <td className="px-3 py-1.5 text-muted-foreground">{k}</td>
              <td className="px-3 py-1.5 tnum text-right font-medium">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Methodology &amp; sources</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          What every number means, where it comes from, and how the scorecards work. No black boxes.
        </p>
      </div>

      <Section title="The one rule">
        <p>
          REITs are only ever compared with REITs, and InvITs only with InvITs. They are different
          asset classes — office rent is not a toll road is not a transmission tariff. A single
          &quot;#1 best trust&quot; would be meaningless, so this site never produces one. Instead it shows
          four separate profile scores (income, value, safety, growth), each with its weights
          published below.
        </p>
      </Section>

      <Section title="What each metric means">
        <p>
          <strong>Price (EOD)</strong> — the last traded price at end of day, in ₹ per unit. Always
          shown with its &quot;as of&quot; date.
        </p>
        <p>
          <strong>TTM DPU</strong> — the total distribution per unit over the trailing twelve months
          (last 4 quarters), in ₹. This is the cash the trust actually paid out.
        </p>
        <p>
          <strong>TTM Yield</strong> — TTM DPU ÷ current price, as a %. It is backward-looking and
          includes return of capital, so it can overstate true income.
        </p>
        <p>
          <strong>Recurring Yield</strong> — like TTM yield but with return of capital removed.
          Return of capital is not income — it is the trust handing part of your own money back and
          reducing your cost basis. This is the more honest yield.
        </p>
        <p>
          <strong>vs NAV</strong> — price compared to the latest published Net Asset Value per unit.
          A negative number means the trust trades at a discount to its stated asset value. NAV is
          only published periodically (usually half-yearly), so the NAV date is always shown — an old
          NAV is a weak signal.
        </p>
        <p>
          <strong>LTV</strong> — loan-to-value, a leverage measure. Lower is generally safer. REITs in
          India are capped by regulation on how much they can borrow.
        </p>
        <p>
          <strong>Occupancy / Concession life</strong> — for REITs, committed occupancy of the
          portfolio; for InvITs, the weighted average remaining life of the underlying concessions
          (how long the contracted cash flows run).
        </p>
      </Section>

      <Section title="The four scorecards">
        <p>
          Each card is a 0–100 relative score computed only within the trust&apos;s own type. They are
          educational profiles, not buy/sell advice.
        </p>
        <p className="font-medium text-foreground">Income — recurring cash quality</p>
        <Weights
          rows={[
            ["Recurring yield (excl. return of capital)", "40%"],
            ["NDCF / distribution coverage", "30%"],
            ["DPU growth", "20%"],
            ["Penalty for high return-of-capital share", "10%"],
          ]}
        />
        <p className="font-medium text-foreground">Value — price versus assets</p>
        <Weights
          rows={[
            ["Discount to latest NAV", "60%"],
            ["Leverage (LTV)", "40%"],
          ]}
        />
        <p className="font-medium text-foreground">Safety — resilience of the cash flows</p>
        <Weights
          rows={[
            ["Leverage (LTV)", "50%"],
            ["Occupancy / remaining concession life", "30%"],
            ["Sponsor quality", "20%"],
          ]}
        />
        <p className="font-medium text-foreground">Growth — rising distributions</p>
        <Weights
          rows={[
            ["Year-over-year DPU growth", "50%"],
            ["Occupancy trend", "30%"],
            ["Sector outlook", "20%"],
          ]}
        />
        <p>
          Where an input is not yet available (for example NDCF coverage for some trusts), the score
          is computed from what exists and shown with a &quot;—&quot; for the missing piece rather than
          guessed.
        </p>
      </Section>

      <Section title="Where the data comes from">
        <p>
          <strong>Prices</strong> — end-of-day, sourced from BSE India&apos;s public API, refreshed
          nightly. There are no live or intraday prices on this site: real-time exchange data
          requires a paid redistribution licence from NSE Data &amp; Analytics / BSE Information
          Products, which this free project does not have.
        </p>
        <p>
          <strong>Distributions</strong> — hand-compiled from official trust investor-relations pages
          and exchange filings (each row links to its source). Where a trust has not published the
          component split (interest / dividend / return of capital), the split is shown as
          unavailable rather than estimated.
        </p>
        <p>
          <strong>Fundamentals</strong> (NAV, LTV, occupancy, GAV) — from the trust&apos;s official
          disclosures, each with an &quot;as of&quot; date and a source link.
        </p>
        <p>
          <strong>Freshness</strong> — prices update nightly after market close; distributions and
          fundamentals update when the trust files them (typically quarterly). Data may be stale or
          contain errors — always verify against the trust&apos;s official disclosures before acting.
        </p>
      </Section>

      <Section title="Tax in one paragraph">
        <p>
          For a resident Indian individual: the interest and (direct) rent components are taxed at
          your income-tax slab (10% TDS is deducted first under section 194LBA). Dividends are exempt
          for most trusts but taxable for some, depending on the trust&apos;s SPV tax regime. Return of
          capital is not taxed on receipt — it reduces your cost basis, so you pay more capital gains
          tax when you eventually sell. Gains on listed units held over 12 months are taxed at 12.5%
          after a ₹1.25 lakh annual exemption; under 12 months, 20%. Use the{" "}
          <a href="/tax/" className="underline text-foreground">tax simulator</a> to see this worked
          out per rupee.
        </p>
      </Section>

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        This is an educational tool, not investment advice. The site is not registered with SEBI as
        an investment adviser or research analyst. Nothing here is a recommendation to buy or sell
        any security. Consult a registered advisor before investing.
      </div>
    </div>
  );
}
