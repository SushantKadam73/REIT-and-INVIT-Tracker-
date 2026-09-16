#!/usr/bin/env node
/**
 * notify.mjs — alert dispatch.
 *
 * If data/alerts.json has entries (parser fallback, token 401, new-trust
 * discovery, feed failures), POST a summary to the webhook in env
 * ALERT_WEBHOOK_URL (generic JSON POST — works with Telegram/Discord/Slack-style
 * endpoints and request-bin style URLs).
 *
 * If ALERT_WEBHOOK_URL is unset, the alerts are logged to stdout and the file is
 * left in place — the site and data are unaffected either way. Always exits 0:
 * alerting must never fail the data pipeline.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const alertsPath = join(root, "data/alerts.json");
const WEBHOOK = process.env.ALERT_WEBHOOK_URL;

function main() {
  if (!existsSync(alertsPath)) {
    console.log("No alerts file — nothing to send.");
    return;
  }
  let alerts;
  try {
    alerts = JSON.parse(readFileSync(alertsPath, "utf8"));
  } catch {
    console.log("alerts.json unreadable — nothing to send.");
    return;
  }
  if (!Array.isArray(alerts) || alerts.length === 0) {
    console.log("No alerts — nothing to send.");
    return;
  }

  const lines = alerts.map((a) => `• [${a.type}] ${a.message}`);
  const text = `REIT/InvIT Tracker — ${alerts.length} alert(s) from the nightly refresh:\n\n${lines.join("\n")}`;

  if (!WEBHOOK) {
    console.log("ALERT_WEBHOOK_URL not set — logging alerts instead:\n");
    console.log(text);
    return;
  }

  return fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text, alerts }),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error(`Webhook POST -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        console.error("Alerts were NOT cleared; they will be retried on the next run.");
        return;
      }
      console.log(`Sent ${alerts.length} alert(s) to webhook.`);
      writeFileSync(alertsPath, "[]");
    })
    .catch((e) => {
      console.error(`Webhook POST failed: ${e.message} — alerts kept for next run.`);
    });
}

Promise.resolve(main()).catch((e) => {
  console.error(`notify failed (non-fatal): ${e.message}`);
  process.exit(0);
});
