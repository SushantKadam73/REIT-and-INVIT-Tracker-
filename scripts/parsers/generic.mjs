/**
 * generic.mjs — fallback distribution-PDF parser.
 *
 * Used when no scripts/parsers/<SYMBOL>.mjs template exists for a trust. It looks
 * for the common phrasing in Indian REIT/InvIT distribution notices:
 *
 *   "distribution of ₹3.00 per unit ... comprising interest of ₹1.77, dividend of
 *    ₹0.66, return of capital ₹0.56 and other income ₹0.01"
 *
 * Contract: return an object with any of
 *   { totalDPU, interest, dividend, returnOfCapital, other, quarter, fy,
 *     recordDate, exDate, paymentDate }
 * Values that are not found MUST be null — never guess. The caller verifies that
 * components sum to totalDPU (±0.05) before accepting the split; on mismatch the
 * row is stored split-less and the filing is flagged in data/alerts.json.
 *
 * To add a per-trust template, copy this file to scripts/parsers/<SYMBOL>.mjs and
 * tighten the regexes to that trust's notice layout.
 */

const NUM = "[₹\\s]*([0-9]+(?:\\.[0-9]+)?)";

function pick(text, re) {
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

export async function parse(text /*, filing */) {
  if (!text) return {};
  const t = text.replace(/\s+/g, " ");

  const totalDPU = pick(
    t,
    new RegExp(`(?:total\\s+)?distribution(?:\\s+amount)?\\s+of\\s+${NUM}\\s*per\\s+(?:unit|issued\\s+unit)`, "i")
  ) ?? pick(t, new RegExp(`aggregate\\s+distribution[^.]*?${NUM}\\s*per\\s+unit`, "i"));

  const interest =
    pick(t, new RegExp(`interest(?:\\s+income)?(?:\\s+component)?[^.]*?${NUM}\\s*per\\s+unit`, "i")) ??
    pick(t, new RegExp(`in\\s+the\\s+form\\s+of\\s+interest[^.]*?${NUM}`, "i"));

  const dividend =
    pick(t, new RegExp(`dividend(?:\\s+income)?(?:\\s+component)?[^.]*?${NUM}\\s*per\\s+unit`, "i")) ??
    pick(t, new RegExp(`in\\s+the\\s+form\\s+of\\s+dividend[^.]*?${NUM}`, "i"));

  const returnOfCapital =
    pick(t, new RegExp(`(?:return\\s+of\\s+capital|capital\\s+repayment|amorti[sz]ation\\s+of\\s+(?:SPV\\s+)?debt)[^.]*?${NUM}\\s*per\\s+unit`, "i"));

  const other = pick(t, new RegExp(`other\\s+income[^.]*?${NUM}\\s*per\\s+unit`, "i"));

  // Quarter / FY, e.g. "quarter ended June 30, 2025" or "Q1 FY26"
  let quarter = null;
  let fy = null;
  const qm = t.match(/\bQ([1-4])\s*[\-–]?\s*FY\s*['']?(\d{2,4})/i);
  if (qm) {
    quarter = `Q${qm[1]} FY${qm[2].length === 2 ? "20" + qm[2] : qm[2]}`;
    fy = `FY${qm[2].length === 2 ? "20" + qm[2] : qm[2]}`;
  }

  const rd = t.match(/record\s+date[^.]*?(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s+(\d{4})/i);
  const MONTHS = { january: "01", february: "02", march: "03", april: "04", may: "05", june: "06", july: "07", august: "08", september: "09", october: "10", november: "11", december: "12" };
  const recordDate = rd ? `${rd[3]}-${MONTHS[rd[2].toLowerCase()]}-${String(rd[1]).padStart(2, "0")}` : null;

  return { totalDPU, interest, dividend, returnOfCapital, other, quarter, fy, recordDate, exDate: null, paymentDate: null };
}
