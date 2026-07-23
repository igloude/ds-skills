#!/usr/bin/env node
// nearest_token.mjs — map color literals to the nearest design token by CIE76 ΔE.
//
// Usage:
//   node nearest_token.mjs tokens.json literals.txt [--threshold 10]
//
//   tokens.json   { "token-name": "#0f62fe" | "rgb(...)" | "hsl(...)", ... }
//   literals.txt  one color literal per line (duplicates fine; output is deduped)
//
// Output: JSON array of { literal, class: "exact"|"near"|"none"|"unparsed",
//                         token, deltaE, alphaMismatch }

import { readFileSync } from "node:fs";

const [tokensPath, literalsPath, ...rest] = process.argv.slice(2);
if (!tokensPath || !literalsPath) {
  console.error("usage: node nearest_token.mjs tokens.json literals.txt [--threshold 10]");
  process.exit(1);
}
const tIdx = rest.indexOf("--threshold");
const THRESHOLD = tIdx !== -1 ? parseFloat(rest[tIdx + 1]) : 10;

// ---- parsing ---------------------------------------------------------------

function parseColor(raw) {
  const s = raw.trim().toLowerCase();

  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = parseInt(h, 16);
    return h.length === 8
      ? { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n & 255) / 255 }
      : { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 1 };
  }

  m = s.match(/^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    const ch = (v) => (v.endsWith("%") ? (parseFloat(v) / 100) * 255 : parseFloat(v));
    const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: ch(m[1]), g: ch(m[2]), b: ch(m[3]), a };
  }

  m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    const h = parseFloat(m[1]) / 360, sl = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
    const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    const f = (n) => {
      const k = (n + h * 12) % 12;
      const c = sl * Math.min(l, 1 - l);
      return l - c * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
  }

  return null; // oklch, color-mix, named colors: report as unparsed, resolve manually
}

// ---- sRGB → Lab → ΔE76 -----------------------------------------------------

function toLab({ r, g, b }) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  // D65 reference white
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const deltaE = (p, q) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);

// ---- run -------------------------------------------------------------------

const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
const tokenLab = Object.entries(tokens)
  .map(([name, value]) => {
    const c = parseColor(String(value));
    return c ? { name, value, lab: toLab(c), alpha: c.a } : null;
  })
  .filter(Boolean);

if (tokenLab.length === 0) {
  console.error("no parseable tokens in " + tokensPath);
  process.exit(1);
}

const literals = [...new Set(
  readFileSync(literalsPath, "utf8").split("\n").map((l) => l.trim()).filter(Boolean)
)];

const results = literals.map((literal) => {
  const c = parseColor(literal);
  if (!c) return { literal, class: "unparsed", token: null, deltaE: null, alphaMismatch: null };

  const lab = toLab(c);
  let best = null;
  for (const t of tokenLab) {
    const d = deltaE(lab, t.lab);
    if (!best || d < best.deltaE) best = { token: t.name, deltaE: d, tokenAlpha: t.alpha };
  }
  const alphaMismatch = Math.abs(c.a - best.tokenAlpha) > 0.001;
  const cls = best.deltaE < 0.01 && !alphaMismatch ? "exact" : best.deltaE <= THRESHOLD ? "near" : "none";
  return { literal, class: cls, token: best.token, deltaE: +best.deltaE.toFixed(2), alphaMismatch };
});

console.log(JSON.stringify(results, null, 2));
