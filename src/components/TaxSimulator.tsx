"use client";

import { useMemo, useState } from "react";
import { formatINR, parseINRInput } from "@/lib/format";
import { computeTax, computeCapitalGains, SLAB_RATES, type SlabRate } from "@/lib/tax";

interface Option {
  symbol: string;
  name: string;
  type: string;
  price: number | null;
}

export function TaxSimulator({ options }: { options: Option[] }) {
  // Distribution tax inputs
  const [mode, setMode] = useState<"trust" | "custom">("trust");
  const [interest, setInterest] = useState("10000");
  const [dividend, setDividend] = useState("8000");
  const [roc, setRoc] = useState("6000");
  const [other, setOther] = useState("0");
  const [divTaxable, setDivTaxable] = useState(true);
  const [slab, setSlab] = useState<SlabRate>(30);

  // Capital gains inputs
  const [cgSymbol, setCgSymbol] = useState(options[0]?.symbol ?? "");
  const [buyPrice, setBuyPrice] = useState("100");
  const [sellPrice, setSellPrice] = useState("120");
  const [units, setUnits] = useState("1000");
  const [months, setMonths] = useState("18");

  const distTax = useMemo(
    () =>
      computeTax({
        interest: parseINRInput(interest) || 0,
        dividend: parseINRInput(dividend) || 0,
        returnOfCapital: parseINRInput(roc) || 0,
        other: parseINRInput(other) || 0,
        slabRate: slab,
        dividendTaxable: divTaxable,
      }),
    [interest, dividend, roc, other, slab, divTaxable]
  );

  const cg = useMemo(
    () =>
      computeCapitalGains(
        parseFloat(buyPrice) || 0,
        parseFloat(sellPrice) || 0,
        parseFloat(units) || 0,
        parseFloat(months) || 0
      ),
    [buyPrice, sellPrice, units, months]
  );

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm tnum";

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Distribution tax */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Tax on distributions</h2>

        <div className="flex gap-2 text-sm">
          {(["custom", "trust"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md capitalize ${
                mode === m ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {m === "custom" ? "Custom amounts" : "From a trust's mix"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Interest component" value={interest} onChange={setInterest} cls={inputCls} />
          <Field label="Dividend component" value={dividend} onChange={setDividend} cls={inputCls} />
          <Field label="Return of capital" value={roc} onChange={setRoc} cls={inputCls} />
          <Field label="Other income" value={other} onChange={setOther} cls={inputCls} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={divTaxable}
            onChange={(e) => setDivTaxable(e.target.checked)}
            className="rounded"
          />
          Dividend is taxable (uncheck if the trust&apos;s SPVs pay concessional tax — most REIT dividends are exempt)
        </label>

        <div>
          <label className="text-sm font-medium block mb-1.5">Your slab rate</label>
          <div className="flex gap-1.5 flex-wrap">
            {SLAB_RATES.map((r) => (
              <button
                key={r}
                onClick={() => setSlab(r)}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  slab === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/60 p-4 space-y-1.5 text-sm">
          <Line label="Gross distribution" value={formatINR(distTax.grossIncome)} />
          <Line label={`Interest tax @ ${slab}%`} value={`−${formatINR(distTax.interestTax)}`} red />
          <Line label={`Dividend tax ${divTaxable ? `@ ${slab}%` : "(exempt)"}`} value={`−${formatINR(distTax.dividendTax)}`} red />
          <Line label="Return of capital tax" value="₹0 (reduces cost basis)" />
          <Line label={`Other tax @ ${slab}%`} value={`−${formatINR(distTax.otherTax)}`} red />
          <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
            <span>Post-tax cash</span>
            <span className="tnum text-green-600 dark:text-green-400">{formatINR(distTax.postTaxIncome)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Effective rate {distTax.effectiveRate.toFixed(1)}% · TDS 10% u/s 194LBA applies on taxable components
          </div>
        </div>
      </section>

      {/* Capital gains */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Tax on capital gains (when you sell)</h2>

        <div>
          <label className="text-sm font-medium block mb-1.5">Trust (for reference price)</label>
          <select
            value={cgSymbol}
            onChange={(e) => {
              setCgSymbol(e.target.value);
              const p = options.find((o) => o.symbol === e.target.value)?.price;
              if (p) {
                setSellPrice(p.toFixed(2));
                setBuyPrice((p * 0.9).toFixed(2));
              }
            }}
            className={inputCls}
          >
            {options.map((o) => (
              <option key={o.symbol} value={o.symbol}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Buy price /unit" value={buyPrice} onChange={setBuyPrice} cls={inputCls} />
          <Field label="Sell price /unit" value={sellPrice} onChange={setSellPrice} cls={inputCls} />
          <Field label="Units" value={units} onChange={setUnits} cls={inputCls} />
          <Field label="Holding period (months)" value={months} onChange={setMonths} cls={inputCls} />
        </div>

        <div className="rounded-lg bg-muted/60 p-4 space-y-1.5 text-sm">
          <Line
            label="Total gain"
            value={formatINR(cg.stcg + cg.ltcg)}
          />
          <Line
            label={cg.ltcg > 0 ? "LTCG tax (12.5% after ₹1.25L exemption)" : "STCG tax (20%)"}
            value={`−${formatINR(cg.tax)}`}
            red
          />
          <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
            <span>Post-tax gain</span>
            <span className="tnum text-green-600 dark:text-green-400">
              {formatINR(cg.stcg + cg.ltcg - cg.tax)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{cg.note}</div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-border">
          <p>
            <strong>Cost basis note:</strong> return-of-capital distributions reduce your purchase
            cost. If you received ₹6/unit as RoC on units bought at ₹100, your adjusted cost is ₹94 —
            increasing your taxable gain when you sell.
          </p>
          <p>
            <strong>Specified-sum rule:</strong> if cumulative RoC distributions on a unit ever
            exceed its issue price, the excess is taxed as income in that year. Rare, but possible
            for long-held InvITs.
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  cls,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  cls: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} inputMode="decimal" />
    </div>
  );
}

function Line({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tnum ${red ? "text-red-600 dark:text-red-400" : ""}`}>{value}</span>
    </div>
  );
}
