/* ---------------------------------------------------------------------------
 * tools/check_source.mjs — the checks that stand in for a compiler.
 *
 * WHY THIS EXISTS. This build was written in an environment with no npm
 * registry, so `next build`, `tsc --noEmit` and `eslint` have never run against
 * it. That is a real gap and it is stated plainly in the report at the end. What
 * this tool does is cover the specific failure classes that a missing toolchain
 * would otherwise let through silently, plus a set of checks about HONESTY that
 * no compiler would ever perform: a typechecker is perfectly happy with a
 * fabricated repository URL.
 *
 * The three groups, in order of how much damage they prevent:
 *
 *   STRUCTURE   imports that resolve, "use client" where it is needed and only
 *               where it is needed, no browser API in a server component, no
 *               orphaned file, balanced CSS.
 *   CONTRACT    every class name the markup uses is defined in the stylesheet,
 *               every custom property it sets is read by the stylesheet, every
 *               nav anchor lands on a real section, every aria-labelledby points
 *               at an id that exists in the same file.
 *   TRUTH       no private contact detail, no secret-shaped string, no personal
 *               content hardcoded outside the data file, no invented URL.
 *
 * Everything is read from the filesystem. Nothing is imported and nothing is
 * executed, so this runs on a file that would not compile — which is exactly the
 * situation it is meant to report on.
 * ------------------------------------------------------------------------- */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative, extname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "src");

/* ---- reporting ---------------------------------------------------------- */

const problems = [];
const warnings = [];
const notes = [];

/** A hard failure: the build is wrong. */
function fail(where, message) {
  problems.push(`${where}: ${message}`);
}

/** Worth a human look, but not a reason to stop. */
function warn(where, message) {
  warnings.push(`${where}: ${message}`);
}

function note(message) {
  notes.push(message);
}

/* ---- walking ------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walk(SRC);
const codeFiles = allFiles.filter((f) => [".ts", ".tsx"].includes(extname(f)));
const rel = (f) => relative(root, f).replace(/\\/g, "/");

/** Comments removed, so a rule about the code is never satisfied by prose. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const files = new Map();
for (const f of codeFiles) {
  const raw = readFileSync(f, "utf8");
  files.set(rel(f), { path: f, raw, code: stripComments(raw) });
}

const css = readFileSync(join(SRC, "styles/globals.css"), "utf8");
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");
const data = readFileSync(join(SRC, "data/portfolio.ts"), "utf8");

/* ===========================================================================
 * STRUCTURE 1 — every import resolves
 *
 * The failure this catches happened during the build: a component imported a
 * type from "@/data/types", a module that does not exist, because the types live
 * in "@/data/portfolio". Without a typechecker that is invisible until `next
 * build`, and `next build` is not available here.
 * ========================================================================= */

const DEPS = new Set([
  "next",
  "react",
  "react-dom",
  "gsap",
  "lenis",
  "framer-motion",
  ...Object.keys(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).dependencies ?? {}),
]);

/** Node's resolution, minus the parts TypeScript does differently. */
function resolveModule(spec, fromFile) {
  const base = spec.startsWith("@/")
    ? join(SRC, spec.slice(2))
    : spec.startsWith(".")
      ? resolve(dirname(fromFile), spec)
      : null;
  if (base === null) return "external";
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.css`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const importedBy = new Map();

for (const [name, file] of files) {
  // Covers `import x from "y"`, `import "y"`, `export … from "y"` and the type-only
  // forms, which is every shape used in this codebase.
  const specs = [...file.code.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((m) => m[1]);
  for (const spec of specs) {
    const target = resolveModule(spec, file.path);
    if (target === null) {
      fail(name, `import does not resolve: "${spec}"`);
      continue;
    }
    if (target === "external") {
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      if (!DEPS.has(pkg) && !pkg.startsWith("node:")) {
        fail(name, `imports "${spec}", which is not a declared dependency`);
      }
      continue;
    }
    const key = rel(target);
    if (!importedBy.has(key)) importedBy.set(key, new Set());
    importedBy.get(key).add(name);
  }
}

/* ===========================================================================
 * STRUCTURE 2 — "use client" exactly where it belongs
 *
 * Two failures, opposite directions. A component that uses a hook without the
 * directive fails the build. A component that carries the directive without
 * needing it silently moves work to the browser that could have been done once
 * on the server, which is how a "fast" page acquires a slow first paint.
 * ========================================================================= */

const NEEDS_CLIENT =
  /\buse(?:State|Effect|LayoutEffect|Ref|Memo|Callback|Reducer|Context|SyncExternalStore|Id)\s*[(<]|\bwindow\.|\bdocument\.|addEventListener|requestAnimationFrame|matchMedia|framer-motion/;

for (const [name, file] of files) {
  const isComponent = name.endsWith(".tsx");
  const declared = /^\s*(?:\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(file.raw);
  const needs = NEEDS_CLIENT.test(file.code);
  const isHook = /\/use-[a-z-]+\.ts$/.test(name) || /scene-channel|scroll-store/.test(name);
  // A module may legitimately touch a browser API from either side of the
  // boundary if every access is behind an existence check. lib/env.ts is the
  // deliberate case: it exists precisely so that the rest of the code never has
  // to write `typeof window === "undefined"` again, and it returns the
  // conservative answer on the server so the markup matches after hydration.
  const ssrGuarded = /typeof\s+(?:window|document|navigator)\s*===\s*["']undefined["']/.test(
    file.code,
  );

  if (needs && !declared && !isHook && !ssrGuarded) {
    fail(name, 'uses client-only APIs but has no "use client" directive');
  }
  if (declared && !needs && isComponent) {
    warn(name, 'has "use client" but uses no client-only API');
  }
  if (file.raw.includes('"use client"') && !declared) {
    // The directive is only a directive when nothing precedes it but comments.
    fail(name, '"use client" is not the first statement in the file');
  }
  // A file with no directive runs on the server, where neither of these exists.
  if (!declared && !isHook && !ssrGuarded && /\bwindow\.|\bdocument\./.test(file.code)) {
    fail(name, "touches window or document without being a client component");
  }
  // The guard is only worth trusting if it covers every access, so an unguarded
  // module-scope read in a guarded file is still a failure.
  if (ssrGuarded && !declared) {
    const topLevel = file.code.match(/^(?:const|let|var)\s+\w+\s*=\s*[^;]*\b(?:window|document)\./m);
    if (topLevel) fail(name, "reads window at module scope, which runs during SSR");
  }
}

/* ===========================================================================
 * STRUCTURE 3 — no orphaned modules
 *
 * A component nobody imports is either dead weight in the repository or a
 * section that was written and then forgotten. Both are worth knowing about; the
 * second one is worth knowing about urgently.
 * ========================================================================= */

const ENTRY = new Set(["src/app/page.tsx", "src/app/layout.tsx"]);

for (const name of files.keys()) {
  if (ENTRY.has(name)) continue;
  if (!importedBy.has(name)) warn(name, "is never imported by anything");
}

/* ===========================================================================
 * CONTRACT 1 — every class the markup uses is defined in the stylesheet
 *
 * This page's whole motion system is a contract between markup and CSS: the
 * component writes a class and a custom property, and the stylesheet decides what
 * they mean. A typo in either half is silent. Nothing throws, nothing warns, the
 * element simply renders unstyled in the middle of a section that otherwise looks
 * correct, and on a dark page an unstyled element frequently looks like nothing
 * at all.
 * ========================================================================= */

/** Class names the stylesheet actually defines. */
const definedClasses = new Set(
  [
    ...cssCode
      // Quoted values first, and the order matters. The noise texture is a
      // url("data:…svg…") whose payload contains a ")" of its own, so stripping
      // url(…) first cuts the string in half and leaves an unpaired quote, which
      // then shifts the pairing of every quote after it and swallows whole rule
      // blocks. Removing complete strings first takes the data URI out in one
      // piece and turns [data-tone="live"] into [data-tone=], which is inert.
      // Without this, ".w3" and ".org" from the SVG namespace get reported as
      // undefined classes, and a scanner that invents its own findings is worse
      // than no scanner.
      .replace(/"[^"]*"|'[^']*'/g, "")
      .replace(/url\([^)]*\)/g, "")
      .matchAll(/\.(-?[a-z][a-z0-9-]*)/g),
  ].map((m) => m[1]),
);

/** Class names the markup asks for. */
const usedClasses = new Map();

for (const [name, file] of files) {
  // lib/css.ts is where cx is DEFINED, so its signature mentions the strings the
  // scanner is looking for without any of them being a class name.
  if (name === "src/lib/css.ts") continue;

  // A bare literal attribute: the whole value is class names.
  for (const m of file.code.matchAll(/className\s*=\s*"([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/).filter(Boolean)) {
      if (!usedClasses.has(token)) usedClasses.set(token, new Set());
      usedClasses.get(token).add(name);
    }
  }
  // An expression, or a cx() call: only the quoted parts are class names. The
  // identifiers between them are variables, and this tool cannot follow them.
  for (const m of [
    ...file.code.matchAll(/className\s*=\s*\{([^}]*)\}/g),
    ...file.code.matchAll(/\bcx\(([^)]*)\)/g),
  ]) {
    // A conditional class is written `variant === "fill" && "btn-fill"`, and only
    // the second string is a class. Dropping the comparison operand first is what
    // stops the scanner reporting every prop value as a missing rule.
    const text = m[1].replace(/[!=]==?\s*"[^"]*"/g, "");
    for (const literal of text.matchAll(/"([^"]*)"/g)) {
      for (const token of literal[1].split(/\s+/).filter(Boolean)) {
        if (!usedClasses.has(token)) usedClasses.set(token, new Set());
        usedClasses.get(token).add(name);
      }
    }
  }
}

for (const [token, where] of usedClasses) {
  if (!definedClasses.has(token)) {
    fail([...where][0], `class "${token}" is never defined in globals.css`);
  }
}

/* The reverse direction is a warning, not a failure: a stylesheet may reasonably
 * carry a rule for a state that only appears under a media query or an attribute
 * combination this crude scan cannot see. It is still worth reporting, because
 * dead CSS is how a stylesheet grows two definitions of the same mark. */
const IGNORED_UNUSED = /^(sr|is|has|no|js)-|^(html|body|root)$|^lenis(-|$)/;
for (const token of definedClasses) {
  if (usedClasses.has(token) || IGNORED_UNUSED.test(token)) continue;
  warn("globals.css", `class ".${token}" is defined but never used in markup`);
}

/* ===========================================================================
 * CONTRACT 2 — every custom property the markup sets is read by the stylesheet
 *
 * The other half of the same contract, and the more dangerous half: a class that
 * does not exist renders unstyled, but a custom property that nothing reads
 * renders CORRECTLY and does nothing. A stagger that silently never applies looks
 * exactly like a stagger that was tuned to zero.
 * ========================================================================= */

const setProps = new Map();
for (const [name, file] of files) {
  for (const m of file.code.matchAll(/["'](--[a-z][a-z0-9-]*)["']\s*:/g)) {
    if (!setProps.has(m[1])) setProps.set(m[1], new Set());
    setProps.get(m[1]).add(name);
  }
}

for (const [prop, where] of setProps) {
  // `var(--x)` is the read. A property that is only ever declared is inert.
  if (!new RegExp(`var\\(\\s*${prop}\\b`).test(cssCode)) {
    fail([...where][0], `sets ${prop}, which no CSS rule reads`);
  }
}

/* ===========================================================================
 * CONTRACT 3 — the navigation lands somewhere
 * ========================================================================= */

const sectionIds = new Set();
for (const file of files.values()) {
  for (const m of file.code.matchAll(/\bid\s*=\s*["']([a-z][a-z0-9-]*)["']/g)) {
    sectionIds.add(m[1]);
  }
}

for (const m of data.matchAll(/href:\s*"#([a-z-]+)"/g)) {
  if (!sectionIds.has(m[1])) {
    fail("src/data/portfolio.ts", `nav points at #${m[1]}, which no component renders`);
  }
}

/* ===========================================================================
 * CONTRACT 4 — every aria reference resolves inside its own file
 *
 * aria-labelledby pointing at an id that does not exist is worse than no label:
 * the element ends up with an empty accessible name, and a screen reader
 * announces a region with nothing to identify it. Every id used in this codebase
 * is rendered by the same component that references it, so the check is local.
 * ========================================================================= */

for (const [name, file] of files) {
  const localIds = new Set(
    [...file.code.matchAll(/\bid\s*=\s*[{"']?["']?([a-zA-Z][\w-]*)["']?\}?/g)].map((m) => m[1]),
  );
  const templated = /id=\{`/.test(file.code) || /id=\{[a-zA-Z]/.test(file.code);
  for (const m of file.code.matchAll(/aria-labelledby\s*=\s*["']([\w-]+)["']/g)) {
    if (localIds.has(m[1]) || templated) continue;
    fail(name, `aria-labelledby="${m[1]}" has no matching id in this file`);
  }
}

/* ===========================================================================
 * CONTRACT 5 — accessibility rules a linter would catch, and one it would not
 * ========================================================================= */

for (const [name, file] of files) {
  if (/href\s*=\s*["']#["']/.test(file.code)) fail(name, 'has an href="#" placeholder link');
  if (/<(?:div|span)[^>]*\bonClick=/.test(file.code)) {
    fail(name, "puts a click handler on a div or span instead of a button");
  }
  // target="_blank" without rel is a well known tab-napping hole, and it is also
  // the kind of thing that gets copied from one link to the next.
  const blanks = [...file.code.matchAll(/target\s*=\s*["']_blank["']/g)];
  const rels = [...file.code.matchAll(/rel\s*=\s*["']noopener noreferrer["']/g)];
  if (blanks.length > rels.length) {
    fail(name, `has ${blanks.length} _blank link(s) but only ${rels.length} with rel=noopener`);
  }
  // An external link that opens in a new tab must say so to someone who cannot
  // see it happen. The visible arrow glyph does not do that.
  if (blanks.length > 0 && !/opens in a new tab/.test(file.raw)) {
    fail(name, "opens a new tab without telling a screen reader");
  }
}

/* ===========================================================================
 * STRUCTURE 4 — the stylesheet is structurally sound
 *
 * One unbalanced brace in a 2800-line stylesheet does not throw. The browser
 * discards from the error to the end of the block and keeps going, so the symptom
 * is that some rules near the bottom of the file stop applying while everything
 * above them still works. That reads as a layout bug, not as a syntax error, and
 * it is the single most expensive thing to debug by eye.
 *
 * The duplicate-selector pass exists for a related reason: two blocks for the same
 * selector both apply, so the later one silently wins on any property they share,
 * and the earlier one becomes a decoy for whoever edits it next.
 * ========================================================================= */

{
  const opens = (cssCode.match(/\{/g) ?? []).length;
  const closes = (cssCode.match(/\}/g) ?? []).length;
  if (opens !== closes) {
    fail("globals.css", `${opens} "{" against ${closes} "}" — the stylesheet is unbalanced`);
  }

  /* Duplicates are counted PER CONTEXT, and the distinction is the whole check.
   * `.eco` appearing again inside `@media (min-width: 1024px)` is the responsive
   * override doing its job, and reporting it would train whoever reads this output
   * to ignore it. Two `.hero-foot` blocks inside the SAME reduced-motion query is
   * a real duplicate, and that is the one worth surfacing. */
  const seen = new Map();
  const stack = [];
  let cursor = 0;
  /* The header is the whole thing, not its last line. A grouped selector written
   * over two lines — `.cur-dot,\n.cur-ring {` — is one block, and keying on the
   * last line alone reports it as a duplicate of the later `.cur-ring` rule that
   * adds the properties only the ring needs. That is a normal and readable way to
   * write CSS, and a checker that calls it a fault is a checker people turn off. */
  const header = (text) =>
    text.split(";").pop().replace(/\s+/g, " ").trim();
  for (let i = 0; i < cssCode.length; i++) {
    const ch = cssCode[i];
    if (ch === "{") {
      stack.push(header(cssCode.slice(cursor, i)));
      cursor = i + 1;
    } else if (ch === "}") {
      const selector = stack.pop() ?? "";
      const body = cssCode.slice(cursor, i);
      // A leaf block: it holds declarations rather than further rules.
      if (body.includes(":") && !body.includes("{") && /^[.:#a-zA-Z*[]/.test(selector)) {
        const key = `${stack.join(" >> ")} >> ${selector}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      cursor = i + 1;
    }
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      const context = key.split(" >> ").filter(Boolean);
      const selector = context.pop();
      const where = context.length > 0 ? ` inside ${context.join(" / ")}` : "";
      warn("globals.css", `"${selector}" is declared ${count} times${where}`);
    }
  }

  note(`globals.css: ${cssCode.split("\n").length} lines, ${opens} blocks, braces balanced`);
}

/* ===========================================================================
 * TRUTH 1 — personal content lives in exactly one file
 *
 * The brief is explicit that src/data/portfolio.ts holds all editable personal
 * content and that it must not be hardcoded through the components. That is not
 * tidiness for its own sake: the moment a name or a status is duplicated into a
 * component, editing the data file stops being sufficient, and the two copies
 * disagree the first time one of them is updated.
 *
 * The tokens below are the ones that can only be personal content. Deliberately
 * NOT included: "pogo", "pakhi", "vqt" and the other project ids, because those
 * appear legitimately all over the components as class names, element ids and
 * local variables. Their VALUES are checked by the unit tests against the data
 * file instead.
 * ========================================================================= */

const DATA_FILE = "src/data/portfolio.ts";

const PERSONAL =
  /Jubayer|Tahsin|xubayertahsin|xubayertahxin|Barguna|Barishal|Crestodian|gmail\.com|\+8801/i;

for (const [name, file] of files) {
  if (name === DATA_FILE) continue;
  // Comments are stripped, so a component may explain who the site is about
  // without that counting as hardcoded content.
  const hit = file.code.match(PERSONAL);
  if (hit) fail(name, `hardcodes personal content ("${hit[0]}") outside ${DATA_FILE}`);
}

/* ===========================================================================
 * TRUTH 2 — only the contact details the brief marked public
 *
 * §21 lists what may be published and what may not. A checker cannot know
 * whether an address is private, so it inverts the problem: exactly two contact
 * strings are allowed to exist anywhere in the source, and any other email or
 * phone number is a failure by default. That way the failure mode of this check
 * is a false alarm on a deliberate addition, not silent publication.
 * ========================================================================= */

const PUBLIC_EMAIL = "xubayertahxin@gmail.com";
const PUBLIC_PHONE = "+8801780082987";

for (const [name, file] of files) {
  for (const m of file.raw.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) {
    if (m[0].toLowerCase() !== PUBLIC_EMAIL) {
      fail(name, `contains an email address that is not the public one: ${m[0]}`);
    }
  }
  // Long digit runs after a "+" are phone-shaped. Scroll spans and durations are
  // never written that way, so this does not collide with the motion code.
  for (const m of file.raw.matchAll(/\+\d[\d\s-]{7,}\d/g)) {
    if (m[0].replace(/[\s-]/g, "") !== PUBLIC_PHONE) {
      fail(name, `contains a phone-shaped string that is not the public number: ${m[0]}`);
    }
  }
}

/* Both public details must still actually be reachable, or the contact section is
 * decorative. */
if (!data.includes(PUBLIC_EMAIL)) fail(DATA_FILE, "no longer contains the public email");
if (!data.includes(PUBLIC_PHONE)) fail(DATA_FILE, "no longer contains the public phone number");

/* ===========================================================================
 * TRUTH 3 — nothing secret-shaped
 *
 * No key was ever needed to build this page, so any credential-shaped string
 * here would have arrived by accident, and accidents of this kind are the ones
 * that get committed. The patterns are the well known prefixes plus the generic
 * case of a secret-sounding identifier assigned a literal.
 * ========================================================================= */

const SECRET_SHAPES = [
  [/\bsk-[A-Za-z0-9]{16,}/, "an OpenAI-style secret key"],
  [/\b(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{16,}/, "a GitHub token"],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/, "a GitHub fine-grained token"],
  [/\bAIza[0-9A-Za-z_-]{20,}/, "a Google API key"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, "a Slack token"],
  [/\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, "a JWT"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [
    // An assignment, not a mention: `apiKey: "…"` fails, the word `token` in a
    // sentence does not, and neither does an empty string.
    /\b(?:api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["'][^"']+["']/i,
    "a credential assigned a literal value",
  ],
];

for (const [name, file] of files) {
  for (const [pattern, what] of SECRET_SHAPES) {
    if (pattern.test(file.code)) fail(name, `looks like it contains ${what}`);
  }
}

/* ===========================================================================
 * TRUTH 4 — no invented URL
 *
 * This is the check no compiler and no linter will ever perform, and it is the
 * one that matters most in a portfolio: a plausible repository link that 404s
 * costs more credibility than an honest "repository pending" state, which is
 * exactly what the brief asked for. So the allowlist is the public profiles from
 * §21 and nothing else. A new destination is a decision, and it should have to
 * be made here as well as in the data.
 * ========================================================================= */

const ALLOWED_ORIGINS = [
  // Corrected by the user on 2026-08-25: the GitHub account is xubayertahxin (an
  // "x", matching the email), Telegram and X use an underscore, and Instagram and
  // Facebook use a dot. Five near-identical handles across five platforms is
  // exactly the situation where a typo goes unnoticed, which is why they are
  // pinned here as well as in the data.
  "https://github.com/xubayertahxin",
  "https://t.me/xubayer_tahsin",
  "https://x.com/xubayer_tahsin",
  "https://www.instagram.com/xubayer.tahsin/",
  "https://www.facebook.com/xubayer.tahsin2.0",
  // The SVG namespace in the noise texture. Not a link: it is never fetched and
  // never navigated to.
  "http://www.w3.org/2000/svg",
];

for (const [name, file] of files) {
  for (const m of file.code.matchAll(/https?:\/\/[^\s"'`)]+/g)) {
    const url = m[0].replace(/[.,;]$/, "");
    // The boundary matters. A plain startsWith would accept
    // github.com/xubayertahxin-labs, a different account entirely, which is
    // precisely the kind of near-miss URL this check exists to catch.
    if (
      ALLOWED_ORIGINS.some(
        (ok) => url === ok || url === `${ok}/` || url.startsWith(ok.endsWith("/") ? ok : `${ok}/`),
      )
    ) {
      continue;
    }
    fail(name, `links to ${url}, which is not one of the public profiles in the brief`);
  }
}

/* The repository and demo fields are the specific place fabrication is tempting,
 * because an empty one looks like an omission. `null` is the honest value and the
 * UI renders a pending state from it. */
for (const m of data.matchAll(/\b(repo|demo)\s*:\s*([^,\n]+)/g)) {
  const value = m[2].trim();
  // The interface declares `repo: string | null;`. That is the type, not a value,
  // and a checker that cannot tell them apart fails on correct source.
  if (value.endsWith(";")) continue;
  if (value === "null") continue;
  if (/^"https:\/\/github\.com\/xubayertahxin\//.test(value)) continue;
  fail(DATA_FILE, `${m[1]} is ${value}; expected null or a repository under the real account`);
}

/* ===========================================================================
 * TRUTH 5 — the inflation the brief forbids, in the markup as well as the data
 *
 * The unit tests assert this over the parsed data, which is where the strings
 * come from. This covers the other half: a title that appears only in a
 * component, in a heading or an aria-label, would never reach the data file and
 * so would never be tested.
 *
 * The numeric half of the same rule — no "Python 95%", no proficiency levels —
 * is asserted over the skills data in tools/test_lib.mjs, because percentages
 * appear legitimately throughout the components as scroll spans ("+=180%") and a
 * textual scan here could not tell the two apart.
 * ========================================================================= */

const INFLATED = [
  /\bsenior (?:developer|engineer|software)/i,
  /\bprofessional software engineer\b/i,
  /\b(?:expert|specialist) in\b/i,
  /\bai engineer\b/i,
  /\byears of experience\b/i,
  /\bindustry[- ]leading\b/i,
  /\bproficiency\b/i,
  /\bmastery\b/i,
];

for (const [name, file] of files) {
  for (const pattern of INFLATED) {
    const hit = file.code.match(pattern);
    if (hit) fail(name, `claims "${hit[0]}", which the brief forbids for a student`);
  }
}

/* CEO is allowed, but only as the stated long-term aspiration. Anywhere it
 * appears without that framing nearby it reads as a current title. */
for (const [name, file] of files) {
  for (const m of file.code.matchAll(/\bCEO\b/g)) {
    const around = file.code.slice(Math.max(0, m.index - 400), m.index + 400);
    if (/aspiration|long[- ]term|dream|toward|ambition/i.test(around)) continue;
    fail(name, "mentions CEO without the aspiration framing the brief requires");
  }
}

/* ===========================================================================
 * TRUTH 6 — the assets the metadata promises actually exist
 *
 * A share card is the one part of a site nobody looks at while building it, and a
 * missing og:image does not fail a build: the crawler asks for it, gets a 404, and
 * the link renders as a bare grey rectangle for the rest of the site's life.
 * ========================================================================= */

for (const m of data.matchAll(/ogImage:\s*"(\/[^"]+)"/g)) {
  const asset = join(root, "public", m[1].slice(1));
  if (!existsSync(asset)) {
    fail(DATA_FILE, `ogImage points at ${m[1]}, which does not exist under public/`);
  }
}

note(`personal content confined to ${DATA_FILE}`);
note(`${ALLOWED_ORIGINS.length} allowed link destinations, no others found`);

/* ---- the report --------------------------------------------------------- */

const line = "-".repeat(72);
console.log(line);
console.log("source checks");
console.log(line);

for (const n of notes) console.log(`  ${n}`);

if (warnings.length > 0) {
  console.log(`\n  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`    ~ ${w}`);
}

if (problems.length > 0) {
  console.log(`\n  ${problems.length} problem(s):`);
  for (const p of problems) console.log(`    x ${p}`);
  console.log(`\n${line}`);
  console.log("FAILED");
  process.exit(1);
}

console.log(`\n${line}`);
console.log(`OK — ${files.size} source files checked, ${warnings.length} warning(s)`);
