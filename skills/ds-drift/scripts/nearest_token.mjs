#!/usr/bin/env node
//
// nearest_token.mjs — map color literals to the nearest design token by CIE76 ΔE.
//
// WHAT IT DOES
//   Reads a token map and a list of color literals, converts both to CIE Lab, and
//   reports for each literal the closest token and the perceptual distance to it.
//   That distance is the evidence behind every token finding: "exact" is safe to
//   codemod, "near" needs a human eye, "none" is a real design decision.
//
// WHAT IT DOES NOT DO
//   No network access. No writes of any kind — not to your repo, not to disk, not
//   anywhere; the only output is JSON on stdout and diagnostics on stderr. It does
//   not import, execute, or evaluate anything from the repo it is pointed at: both
//   inputs are read as plain text. Nothing it reads can influence what it does.
//   It is safe to run against any checkout, and safe to re-run.
//
// USAGE
//   node nearest_token.mjs <tokens.json> <literals.txt> [--threshold <ΔE>]
//   node nearest_token.mjs <tokens.json> -              [--threshold <ΔE>]
//
//   tokens.json   A flat JSON object of resolved color literals, as ds-doctor
//                 generates it: { "color-text": "#161616", "color-text@dark": "…" }
//   literals.txt  One color literal per line. Pass "-" to read them from stdin
//                 instead, so no scratch file is written into the audited repo.
//                 Duplicates are fine — the output is deduplicated.
//   --threshold   The ΔE at or below which a literal counts as "near". Default 10.
//
// OUTPUT — stdout, a JSON array of { literal, class, token, deltaE, alphaMismatch }
//   "exact"     ΔE < 0.01 and alpha matches — mechanical, codemod-ready
//   "near"      ΔE <= threshold — probably drift, confirm by eye before changing
//   "none"      ΔE > threshold — no token is close; a design decision, never a codemod
//   "unparsed"  the color format is not supported here (oklch, color-mix) —
//               resolve it by hand; do not read it as "none"
//
// OUTPUT — stderr, a run summary plus any token the script had to skip. A skipped
//   token is one that literals cannot match against, which would turn a genuine
//   exact match into a "none", so skips are always reported rather than swallowed.
//
// EXIT CODES  0 on success · 1 on bad arguments or unreadable input.

import { readFileSync } from "node:fs";

const USAGE = "usage: node nearest_token.mjs <tokens.json> <literals.txt|-> [--threshold <ΔE>]";

function fail(message) {
  console.error(`nearest_token: ${message}`);
  console.error(USAGE);
  process.exit(1);
}

const sample = (names, limit = 5) =>
  names.slice(0, limit).join(", ") + (names.length > limit ? `, …and ${names.length - limit} more` : "");

// ---- arguments -------------------------------------------------------------
// Parsed strictly. An unrecognized or malformed flag exits rather than falling
// back to a default: a silently-ignored --threshold changes the class of every
// literal in the output without changing anything about how the run looks.

function parseArgs(argv) {
  const files = [];
  let threshold = 10;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--threshold") {
      const raw = argv[++i];
      const value = Number(raw);
      if (raw === undefined || !Number.isFinite(value) || value < 0) {
        fail(`--threshold needs a non-negative number, got ${JSON.stringify(raw ?? null)}`);
      }
      threshold = value;
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`unknown option ${arg}`);
    } else {
      files.push(arg);
    }
  }

  if (files.length !== 2) fail(`expected 2 file arguments, got ${files.length}`);
  return { tokensPath: files[0], literalsPath: files[1], threshold };
}

// ---- color parsing ---------------------------------------------------------
// Returns { r, g, b, a } with channels in 0–255 and alpha in 0–1, or null when
// the format is not supported. Null is reported as "unparsed", never guessed at.

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

  // #rgb, #rgba, #rrggbb, #rrggbbaa
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join("");
    if (hex.length !== 6 && hex.length !== 8) return null;
    const n = parseInt(hex, 16);
    return hex.length === 8
      ? { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n & 255) / 255 }
      : { r: (n >>> 16) & 255, g: (n >>> 8) & 255, b: n & 255, a: 1 };
  }

  // rgb()/rgba(), comma- or space-separated, channels as numbers or percentages
  m = s.match(/^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    const channel = (v) => (v.endsWith("%") ? (parseFloat(v) / 100) * 255 : parseFloat(v));
    return { r: channel(m[1]), g: channel(m[2]), b: channel(m[3]), a: parseAlpha(m[4]) };
  }

  // hsl()/hsla() — converted to sRGB via the standard hue-to-channel function.
  // Negative hues are legal CSS; normalize into [0, 360) before converting.
  m = s.match(/^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    const hue = (((parseFloat(m[1]) % 360) + 360) % 360) / 360;
    const saturation = parseFloat(m[2]) / 100;
    const lightness = parseFloat(m[3]) / 100;
    const channel = (n) => {
      const k = (n + hue * 12) % 12;
      const chroma = saturation * Math.min(lightness, 1 - lightness);
      return lightness - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return {
      r: channel(0) * 255,
      g: channel(8) * 255,
      b: channel(4) * 255,
      a: parseAlpha(m[4]),
    };
  }

  return null; // oklch, color-mix: reported as unparsed, resolved by hand
}

const parseAlpha = (raw) =>
  raw == null ? 1 : raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);

// ---- sRGB → Lab → ΔE76 -----------------------------------------------------

function toLab({ r, g, b }) {
  const linearize = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [linearize(r), linearize(g), linearize(b)];

  // CIE XYZ, normalized against the D65 reference white
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const deltaE = (p, q) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);

// ---- inputs ----------------------------------------------------------------

function readTokens(path) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`could not read ${path} as JSON — ${err.message}`);
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    fail(`${path} must be a JSON object mapping token name → color literal`);
  }

  const usable = [];
  const nonString = []; // nested token files — the shape is wrong, not the color
  const unsupported = []; // strings in a format parseColor cannot read

  for (const [name, value] of Object.entries(raw)) {
    if (typeof value !== "string") {
      nonString.push(name);
      continue;
    }
    const color = parseColor(value);
    if (!color) {
      unsupported.push(name);
      continue;
    }
    usable.push({ name, lab: toLab(color), alpha: color.a });
  }

  return { usable, nonString, unsupported };
}

function readLiterals(path) {
  const source = path === "-" ? 0 : path; // file descriptor 0 is stdin
  let text;
  try {
    text = readFileSync(source, "utf8");
  } catch (err) {
    fail(`could not read literals from ${path === "-" ? "stdin" : path} — ${err.message}`);
  }
  // Lowercase before deduplicating: #FFF and #fff are the same literal.
  return [...new Set(text.split("\n").map((line) => line.trim().toLowerCase()).filter(Boolean))];
}

// ---- classification --------------------------------------------------------

function classify(literal, tokens, threshold) {
  const color = parseColor(literal);
  if (!color) {
    return { literal, class: "unparsed", token: null, deltaE: null, alphaMismatch: null };
  }

  const lab = toLab(color);
  let best = tokens[0];
  let bestDistance = deltaE(lab, best.lab);
  for (let i = 1; i < tokens.length; i++) {
    const distance = deltaE(lab, tokens[i].lab);
    if (distance < bestDistance) {
      best = tokens[i];
      bestDistance = distance;
    }
  }

  const alphaMismatch = Math.abs(color.a - best.alpha) > 0.001;
  const cls =
    bestDistance < 0.01 && !alphaMismatch ? "exact" : bestDistance <= threshold ? "near" : "none";

  return {
    literal,
    class: cls,
    token: best.name,
    deltaE: +bestDistance.toFixed(2),
    alphaMismatch,
  };
}

// ---- run -------------------------------------------------------------------

const { tokensPath, literalsPath, threshold } = parseArgs(process.argv.slice(2));
const { usable: tokens, nonString, unsupported } = readTokens(tokensPath);

if (tokens.length === 0) fail(`no parseable color tokens in ${tokensPath}`);

// A skipped token cannot be matched against, so a literal that is really an exact
// match comes back as "none". Warn before the results, not after them.
if (nonString.length > 0) {
  console.error(
    `nearest_token: WARNING — ${nonString.length} token(s) in ${tokensPath} have non-string ` +
      `values and were skipped: ${sample(nonString)}. This usually means the file is a nested ` +
      `token source rather than the flat, fully resolved map this script expects. Results are ` +
      `incomplete: do not report "none" classes from this run.`,
  );
}
if (unsupported.length > 0) {
  console.error(
    `nearest_token: ${unsupported.length} token(s) are in an unsupported color format and were ` +
      `skipped: ${sample(unsupported)}`,
  );
}

const literals = readLiterals(literalsPath);
const results = literals.map((literal) => classify(literal, tokens, threshold));

const count = (cls) => results.filter((r) => r.class === cls).length;
console.error(
  `nearest_token: ${literals.length} unique literal(s) against ${tokens.length} token(s), ` +
    `near-threshold ΔE ${threshold} — exact ${count("exact")}, near ${count("near")}, ` +
    `none ${count("none")}, unparsed ${count("unparsed")}`,
);

console.log(JSON.stringify(results, null, 2));
