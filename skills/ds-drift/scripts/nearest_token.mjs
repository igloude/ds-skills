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
let THRESHOLD = 10;
if (tIdx !== -1) {
  THRESHOLD = parseFloat(rest[tIdx + 1]);
  if (!Number.isFinite(THRESHOLD) || THRESHOLD < 0) {
    console.error("invalid --threshold value: " + rest[tIdx + 1]);
    process.exit(1);
  }
}

// ---- parsing ---------------------------------------------------------------

// CSS named colors. `transparent` / `currentcolor` / `inherit` are deliberately
// absent — they are semantics, not colors, and should not be collected.
const NAMED = {
  aliceblue: "#f0f8ff", antiquewhite: "#faebd7", aqua: "#00ffff", aquamarine: "#7fffd4",
  azure: "#f0ffff", beige: "#f5f5dc", bisque: "#ffe4c4", black: "#000000",
  blanchedalmond: "#ffebcd", blue: "#0000ff", blueviolet: "#8a2be2", brown: "#a52a2a",
  burlywood: "#deb887", cadetblue: "#5f9ea0", chartreuse: "#7fff00", chocolate: "#d2691e",
  coral: "#ff7f50", cornflowerblue: "#6495ed", cornsilk: "#fff8dc", crimson: "#dc143c",
  cyan: "#00ffff", darkblue: "#00008b", darkcyan: "#008b8b", darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9", darkgreen: "#006400", darkgrey: "#a9a9a9", darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b", darkolivegreen: "#556b2f", darkorange: "#ff8c00", darkorchid: "#9932cc",
  darkred: "#8b0000", darksalmon: "#e9967a", darkseagreen: "#8fbc8f", darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f", darkslategrey: "#2f4f4f", darkturquoise: "#00ced1", darkviolet: "#9400d3",
  deeppink: "#ff1493", deepskyblue: "#00bfff", dimgray: "#696969", dimgrey: "#696969",
  dodgerblue: "#1e90ff", firebrick: "#b22222", floralwhite: "#fffaf0", forestgreen: "#228b22",
  fuchsia: "#ff00ff", gainsboro: "#dcdcdc", ghostwhite: "#f8f8ff", gold: "#ffd700",
  goldenrod: "#daa520", gray: "#808080", green: "#008000", greenyellow: "#adff2f",
  grey: "#808080", honeydew: "#f0fff0", hotpink: "#ff69b4", indianred: "#cd5c5c",
  indigo: "#4b0082", ivory: "#fffff0", khaki: "#f0e68c", lavender: "#e6e6fa",
  lavenderblush: "#fff0f5", lawngreen: "#7cfc00", lemonchiffon: "#fffacd", lightblue: "#add8e6",
  lightcoral: "#f08080", lightcyan: "#e0ffff", lightgoldenrodyellow: "#fafad2", lightgray: "#d3d3d3",
  lightgreen: "#90ee90", lightgrey: "#d3d3d3", lightpink: "#ffb6c1", lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa", lightskyblue: "#87cefa", lightslategray: "#778899", lightslategrey: "#778899",
  lightsteelblue: "#b0c4de", lightyellow: "#ffffe0", lime: "#00ff00", limegreen: "#32cd32",
  linen: "#faf0e6", magenta: "#ff00ff", maroon: "#800000", mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd", mediumorchid: "#ba55d3", mediumpurple: "#9370db", mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee", mediumspringgreen: "#00fa9a", mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585", midnightblue: "#191970", mintcream: "#f5fffa", mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5", navajowhite: "#ffdead", navy: "#000080", oldlace: "#fdf5e6",
  olive: "#808000", olivedrab: "#6b8e23", orange: "#ffa500", orangered: "#ff4500",
  orchid: "#da70d6", palegoldenrod: "#eee8aa", palegreen: "#98fb98", paleturquoise: "#afeeee",
  palevioletred: "#db7093", papayawhip: "#ffefd5", peachpuff: "#ffdab9", peru: "#cd853f",
  pink: "#ffc0cb", plum: "#dda0dd", powderblue: "#b0e0e6", purple: "#800080",
  rebeccapurple: "#663399", red: "#ff0000", rosybrown: "#bc8f8f", royalblue: "#4169e1",
  saddlebrown: "#8b4513", salmon: "#fa8072", sandybrown: "#f4a460", seagreen: "#2e8b57",
  seashell: "#fff5ee", sienna: "#a0522d", silver: "#c0c0c0", skyblue: "#87ceeb",
  slateblue: "#6a5acd", slategray: "#708090", slategrey: "#708090", snow: "#fffafa",
  springgreen: "#00ff7f", steelblue: "#4682b4", tan: "#d2b48c", teal: "#008080",
  thistle: "#d8bfd8", tomato: "#ff6347", turquoise: "#40e0d0", violet: "#ee82ee",
  wheat: "#f5deb3", white: "#ffffff", whitesmoke: "#f5f5f5", yellow: "#ffff00",
  yellowgreen: "#9acd32",
};

function parseColor(raw) {
  let s = raw.trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];

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

  m = s.match(/^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    const h = (((parseFloat(m[1]) % 360) + 360) % 360) / 360, sl = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
    const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    const f = (n) => {
      const k = (n + h * 12) % 12;
      const c = sl * Math.min(l, 1 - l);
      return l - c * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
  }

  return null; // oklch, color-mix: report as unparsed, resolve manually
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
  readFileSync(literalsPath, "utf8").split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean)
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
