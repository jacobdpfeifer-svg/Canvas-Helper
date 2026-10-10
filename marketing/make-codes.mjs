#!/usr/bin/env node
// Turns placements.json into print-ready QR codes and the URL list for NFC tags.
//
//   npm run codes                      write codes/ (needs baseUrl in placements.json)
//   npm run codes -- --base https://x  same, with the domain given here
//   npm run check                      validate placements.json only, write nothing
//
// Every placement becomes <baseUrl>/go/<slug>, which landing/go/ serves (see
// landing/vercel.json). The slug is in the path so Vercel Web Analytics can count
// scans and Mac arrivals per placement on the free tier.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadFunnel } from "./lib/funnel.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// Same slug rule the landing page uses to read the path.
const { SLUG } = loadFunnel();

const KINDS = new Set(["qr", "nfc", "both"]);
const ECC = new Set(["L", "M", "Q", "H"]);

export function validate(config, baseOverride) {
  const errors = [];
  const baseUrl = baseOverride || config.baseUrl;
  if (!baseUrl) {
    errors.push(
      'No domain yet. Set "baseUrl" in marketing/placements.json to the landing site ' +
        "(for example https://kairos.example), or pass --base https://..."
    );
  } else {
    let url = null;
    try {
      url = new URL(baseUrl);
    } catch {
      errors.push(`baseUrl "${baseUrl}" is not a URL.`);
    }
    if (url && url.protocol !== "https:") errors.push("baseUrl must start with https:// (iOS won't open plain http from a tag).");
    if (url && url.pathname !== "/" && url.pathname !== "") errors.push("baseUrl should be the bare domain, with no path.");
  }
  const seen = new Set();
  for (const p of config.placements || []) {
    if (!SLUG.test(p.slug || "")) errors.push(`"${p.slug}": slugs are lowercase letters, digits and dashes, 1 to 40 characters.`);
    if (seen.has(p.slug)) errors.push(`"${p.slug}" is listed twice. Each physical thing needs its own slug.`);
    seen.add(p.slug);
    if (!KINDS.has(p.kind)) errors.push(`"${p.slug}": kind must be qr, nfc, or both.`);
    if (p.ecc && !ECC.has(p.ecc)) errors.push(`"${p.slug}": ecc must be L, M, Q, or H.`);
  }
  if (!seen.size) errors.push("placements.json has no placements.");
  return { errors, baseUrl: baseUrl ? baseUrl.replace(/\/$/, "") : null };
}

function csvCell(s) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main(argv) {
  const check = argv.includes("--check");
  const baseIdx = argv.indexOf("--base");
  const baseOverride = baseIdx >= 0 ? argv[baseIdx + 1] : null;
  const config = JSON.parse(await readFile(join(here, "placements.json"), "utf8"));
  const { errors, baseUrl } = validate(config, baseOverride);

  // --check passes without a domain: the slugs are what can be wrong today.
  const blocking = check ? errors.filter((e) => !e.startsWith("No domain yet")) : errors;
  if (blocking.length) {
    for (const e of blocking) console.error(`✗ ${e}`);
    process.exitCode = 1;
    return;
  }
  if (check) {
    console.log(`✓ ${config.placements.length} placements look right${baseUrl ? ` for ${baseUrl}` : " (no domain set yet)"}.`);
    return;
  }

  const { default: QRCode } = await import("qrcode");
  const out = join(here, "codes");
  await mkdir(out, { recursive: true });
  const rows = [["slug", "kind", "url", "note"]];
  for (const p of config.placements) {
    const url = `${baseUrl}/go/${p.slug}`;
    rows.push([p.slug, p.kind, url, p.note || ""]);
    if (p.kind === "nfc") continue;
    // Q survives a fold, a wrinkle or a scuffed sticker better than the default M.
    const opts = {
      errorCorrectionLevel: p.ecc || "Q",
      margin: 4,
      color: { dark: "#1d1d1fff", light: "#ffffffff" },
    };
    await writeFile(join(out, `${p.slug}.svg`), await QRCode.toString(url, { ...opts, type: "svg" }));
    // 2400px is about 8 inches at 300 dpi, enough for a hoodie back.
    await QRCode.toFile(join(out, `${p.slug}.png`), url, { ...opts, type: "png", width: 2400 });
    console.log(`  ${p.slug.padEnd(12)} ${url}`);
  }
  await writeFile(join(out, "links.csv"), rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
  console.log(`✓ Wrote QR codes and links.csv (the NFC tag list) to marketing/codes/.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
