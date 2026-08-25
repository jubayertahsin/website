/* ---------------------------------------------------------------------------
 * tools/mirror.mjs
 *
 * Node 22 runs TypeScript directly by stripping types, which means every pure
 * module in src/lib can be unit-tested for real. One wrinkle: Node's ESM
 * resolver demands a file extension on relative imports, while TypeScript in a
 * Next.js project conventionally omits it.
 *
 * The wrong fix is to write `./math.ts` throughout the source to suit the test
 * runner. Test infrastructure should bend around the product, not the reverse.
 *
 * So this copies the modules under test into a scratch directory and appends the
 * extension on the way through. It is a textual rewrite of import specifiers
 * only: no transpilation, no bundling, no stubs. The code that runs in the tests
 * is character-for-character the code that ships, apart from six characters of
 * module specifier per import line.
 * ------------------------------------------------------------------------- */

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

/** Matches the specifier in `import ... from "X"`, `export ... from "X"`, `import("X")`. */
const SPEC = /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']+)\2/g;

function rewrite(source) {
  return source.replace(SPEC, (all, head, quote, spec) => {
    // Leave anything that already carries an extension alone.
    if (/\.(ts|tsx|mjs|js|json|css)$/.test(spec)) return all;
    return `${head}${quote}${spec}.ts${quote}`;
  });
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

/**
 * Mirror `dirs` (relative to `root`) into a temp tree. Returns a resolver that
 * turns a source-relative path into an importable file URL.
 */
export function mirror(root, dirs) {
  const base = mkdtempSync(join(tmpdir(), "portfolio-lib-"));
  for (const dir of dirs) {
    for (const file of walk(join(root, dir))) {
      const rel = relative(root, file);
      const dest = join(base, rel);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, rewrite(readFileSync(file, "utf8")), "utf8");
    }
  }
  return {
    base,
    /** e.g. load("src/lib/math.ts") */
    load: (rel) => import(pathToFileURL(join(base, rel)).href),
  };
}
