/* ---------------------------------------------------------------------------
 * tools/check_contrast.mjs — WCAG ratios for the pairings the page actually uses.
 *
 * WHY THIS EXISTS. A dark page with an accent is the exact shape of design where
 * contrast quietly fails: off-white on near-black is so far above the threshold
 * that it trains you to stop checking, and then a red label lands on a red fill
 * and nothing in the toolchain says a word. There is no browser here to measure
 * a rendered pixel, so this measures the source of truth instead — the palette
 * tokens and the rules that use them.
 *
 * It does not guess. Every pairing it reports on was found in globals.css:
 *
 *   DIRECT    a single rule sets both `color` and `background`. The pairing is
 *             unambiguous and it is required to pass.
 *   ON GROUND every text colour used anywhere, against the page ground, because
 *             the page ground is what almost all of this text sits on.
 *   FILLS     a background colour that carries text somewhere, checked against
 *             every text colour that a rule pairs with it.
 *
 * Alpha is composited over the ground before measuring, which is the only honest
 * way to score a hairline: rgb(245 245 240 / 0.12) is not a light colour, it is a
 * dark grey once it has been drawn.
 *
 * Thresholds are the AA ones: 4.5:1 for text, 3:1 for a UI boundary. Large text
 * is allowed 3:1 by the specification and this tool does not take that discount,
 * so every pass here is a pass at the stricter number.
 * ------------------------------------------------------------------------- */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/styles/globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

const problems = [];
const rows = [];

/* ---- colour ------------------------------------------------------------- */

/** #rgb, #rrggbb, rgb(r g b) and rgb(r g b / a) — the four forms in this file. */
function parseColor(value) {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    return {
      r: +rgb[1],
      g: +rgb[2],
      b: +rgb[3],
      a: rgb[4] === undefined ? 1 : +rgb[4],
    };
  }
  return null;
}

/** Source-over composite. What the eye receives is what gets measured. */
function over(fg, bg) {
  if (fg.a >= 1) return { ...fg, a: 1 };
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

/** WCAG 2.x relative luminance. */
function luminance({ r, g, b }) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ---- the palette -------------------------------------------------------- */

const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/);
if (!theme) {
  console.error("no @theme block found in globals.css");
  process.exit(1);
}

const tokens = new Map();
for (const m of theme[1].matchAll(/(--color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  const colour = parseColor(m[2]);
  if (colour) tokens.set(m[1], colour);
}

const GROUND = tokens.get("--color-ground");
if (!GROUND) {
  console.error("--color-ground is not defined");
  process.exit(1);
}

/** A token reference resolved to a colour, composited over the ground. */
function resolve1(value) {
  const ref = value.match(/var\(\s*(--color-[a-z0-9-]+)/);
  const raw = ref ? tokens.get(ref[1]) : parseColor(value);
  if (!raw) return null;
  return { name: ref ? ref[1] : value.trim(), colour: over(raw, GROUND) };
}

/* ---- the rules ---------------------------------------------------------- */

/* Declaration blocks, flattened. Nesting means a "}" can close either a rule or
 * a layer, but a block that CONTAINS declarations always has them immediately
 * before its closing brace, which is all this needs to pair a colour with the
 * background set beside it. */
const blocks = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = m[1].trim().split("\n").pop().trim();
  const body = m[2];
  if (!body.includes(":")) continue;
  blocks.push({ selector, body });
}

/* A text rule whose surface is painted by a DIFFERENT rule. There is exactly one
 * in this stylesheet and it is worth being explicit rather than silent about it:
 * the custom cursor's word is a sibling of the disc, not a child of it, so that it
 * does not inherit the ring's scale transform. That is the right structure for the
 * motion and it puts the colour and the surface in two different rules.
 *
 * The point of naming it here rather than exempting it is that the pairing still
 * gets measured, against the surface that is actually behind it. An exemption
 * would remove the only pairing on the page where near-black text sits on the
 * accent by way of a sibling, which is precisely the arrangement most likely to
 * drift when one of the two rules is edited. */
const SURFACE_OVERRIDES = [
  {
    selector: /^\.cur-label$/,
    surface: "--color-accent",
    why: '.cur-ring[data-state="label"] .cur-ring-in paints the disc behind it',
  },
];
const textUsed = new Map(); // token -> { selectors, bare }
const fills = new Map(); // background token -> Set of text tokens set in the same rule
const direct = []; // { selector, fg, bg }

for (const { selector, body } of blocks) {
  const fg = [...body.matchAll(/(?:^|[\s;{])color\s*:\s*([^;]+);/g)].pop();
  const bg = [...body.matchAll(/background(?:-color)?\s*:\s*([^;]+);/g)].pop();

  const fgc = fg ? resolve1(fg[1]) : null;
  let bgc = bg ? resolve1(bg[1]) : null;

  if (fgc && !bgc) {
    const override = SURFACE_OVERRIDES.find((o) => o.selector.test(selector));
    if (override) bgc = resolve1(`var(${override.surface})`);
  }

  if (fgc) {
    if (!textUsed.has(fgc.name)) textUsed.set(fgc.name, { selectors: new Set(), bare: false });
    const entry = textUsed.get(fgc.name);
    entry.selectors.add(selector);
    // "Bare" means this rule sets a text colour and does not say what it sits on,
    // so whatever is behind it is the page ground.
    if (!bgc) entry.bare = true;
  }
  if (fgc && bgc) {
    direct.push({ selector, fg: fgc, bg: bgc });
    if (!fills.has(bgc.name)) fills.set(bgc.name, new Set());
    fills.get(bgc.name).add(fgc.name);
  }
}

/* ---- the checks --------------------------------------------------------- */

function check(kind, label, fg, bg, threshold) {
  const r = ratio(fg.colour, bg.colour);
  rows.push({ kind, label, r, threshold, pass: r >= threshold });
  if (r < threshold) {
    problems.push(`${label} measures ${r.toFixed(2)}:1, below the ${threshold}:1 minimum`);
  }
}

/* DIRECT: a rule that sets both. This is where a fill and its label live, and it
 * is the pairing that a designer is most likely to get wrong, because the two
 * declarations are chosen at the same moment for how they look. */
for (const { selector, fg, bg } of direct) {
  check("direct", `${fg.name} on ${bg.name} (${selector})`, fg, bg, 4.5);
}

/* ON GROUND: every text colour that is set WITHOUT a background beside it, which
 * means the ground is what it sits on. A colour used only inside a rule that also
 * paints its own surface is not measured here — --color-accent-ink is near-black
 * precisely so it can sit on the red fill, and scoring it against the ground would
 * report a 1:1 failure for a pairing that never appears on screen. Those are still
 * printed, marked as not required, so nothing is quietly dropped. */
for (const [name, { bare }] of textUsed) {
  const fg = { name, colour: over(tokens.get(name) ?? parseColor(name) ?? GROUND, GROUND) };
  const pairedWithAFill = [...fills.values()].some((set) => set.has(name));
  const required = bare || !pairedWithAFill;
  check(
    required ? "ground" : "note",
    `${name} on --color-ground`,
    fg,
    { name: "--color-ground", colour: GROUND },
    required ? 4.5 : 0,
  );
}

/* UI BOUNDARIES: the focus ring is the one non-text element that must be
 * visible, because it is the only thing telling a keyboard user where they are.
 * 1.4.11 asks for 3:1 against what surrounds it. */
const focus = css.match(/:focus-visible\s*\{[^}]*outline\s*:\s*[^;]*?var\(\s*(--color-[a-z0-9-]+)/);
if (focus) {
  const fg = { name: focus[1], colour: over(tokens.get(focus[1]) ?? GROUND, GROUND) };
  check("ui", `focus ring ${focus[1]} on --color-ground`, fg, { colour: GROUND }, 3);
} else {
  problems.push("no :focus-visible outline colour found, so keyboard focus cannot be measured");
}

/* ---- the report --------------------------------------------------------- */

const line = "-".repeat(72);
console.log(line);
console.log("contrast");
console.log(line);

const order = { direct: 0, ground: 1, ui: 2, note: 3 };
rows.sort((a, b) => order[a.kind] - order[b.kind] || a.r - b.r);

for (const row of rows) {
  const mark = row.threshold === 0 ? "·" : row.pass ? "ok" : "x ";
  const need = row.threshold === 0 ? "not required on the ground" : `needs ${row.threshold}`;
  console.log(`  ${mark} ${row.r.toFixed(2).padStart(6)}:1  ${row.label}  (${need})`);
}

console.log(`\n  ${tokens.size} palette tokens, ${direct.length} rules setting text and background together`);

if (problems.length > 0) {
  console.log(`\n  ${problems.length} problem(s):`);
  for (const p of problems) console.log(`    x ${p}`);
  console.log(`\n${line}`);
  console.log("FAILED");
  process.exit(1);
}

console.log(`\n${line}`);
console.log(`OK — ${rows.length} pairing(s) measured, all at or above AA`);
