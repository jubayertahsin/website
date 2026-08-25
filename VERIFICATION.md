# Verification

What has been checked, how, and what has not. Read this before trusting the
build, because the second half is as important as the first.

## What ran, and passed

```
node tools/test_lib.mjs        56 tests, 56 pass, 0 fail
node tools/check_source.mjs    47 source files, 0 problems, 0 warnings
node tools/check_contrast.mjs  12 pairings measured, all at or above WCAG AA
```

All three are declared in `package.json` as `npm run check`, and none of them
needs a network, a browser, or an install step.

`tools/test_lib.mjs` runs every pure module in `src/lib` under `node:test`. Node
strips the TypeScript types, so the real source is what gets executed, not a
transpiled copy. It covers the range arithmetic, the easing curves and their
monotonicity, the scroll-window functions including the degenerate zero-width
case, the horizontal rail's offset and index, the skill graph's edges and the
proof that the graph is one connected component, the decryption plan (every
character covered, none mutated, resolution monotonic so scrolling back up does
not re-encrypt, glyph alphabet free of real letters), the hash, the five particle
layouts and the monogram containment test, and finally the data rules as
executable assertions: no fabricated URL, no percentage or proficiency level on a
skill, exactly one hero project, no forbidden job title anywhere in the data.

`tools/check_source.mjs` covers the failure classes a missing compiler would let
through, plus a set of checks about honesty that no compiler performs. Structure:
every import resolves, `"use client"` appears exactly where it is needed, no
server component touches `window`, no module is orphaned, the stylesheet's braces
balance and no selector is declared twice in the same context. Contract: every
class the markup asks for is defined in `globals.css` and every class defined is
used, every custom property the components set is read by a `var()`, every nav
anchor lands on a section that exists, every `aria-labelledby` resolves. Truth: no
personal content outside `src/data/portfolio.ts`, no email or phone other than the
two the brief marked public, nothing credential-shaped, no URL outside the six
public destinations, no inflated title, and the `og:image` the metadata promises
exists on disk.

`tools/check_contrast.mjs` parses the palette out of `@theme`, composites alpha
over the ground, and measures every pairing it can find in the stylesheet: rules
that set text and background together, every text colour against the page ground,
and the focus ring against what surrounds it. Thresholds are the AA ones and the
large-text discount is not taken, so every pass is a pass at the stricter number.
The measured numbers are ink 18.10:1, ink-soft 6.24:1 and accent 4.95:1 on the
ground; near-black on the accent fill 4.95:1; focus ring 18.10:1.

## The typecheck and the lint have now run

Both were gaps in an earlier version of this document and both are closed.

```
tsc --noEmit    TypeScript 5.9.3, exit 0, no output
eslint .        0 errors, 0 warnings
```

They ran against the `node_modules` installed on the user's machine, so these are
the real compiler and the real linter, not a stand-in. The typecheck found three
errors on its first run and all three are fixed at the source: an invalid `"//"`
property in `tsconfig.json` (TS5023) is now a real JSONC comment, and `Nav.tsx`
now derives `type SectionId = (typeof nav)[number]["id"]` from the `as const` nav
data so the band type matches what `.map()` produces (TS2322, TS2677). The fix
strengthened the type rather than widening it; no `any`, no suppression comment,
no runtime change. The lint pass additionally removed one unused map index in
`Pogo.tsx`, and `eslint.config.mjs` now ignores the Next-generated
`next-env.d.ts`, which `next lint` never linted either.

## What still has not run, and why

**The bundler.** `next build` cannot execute in the sandbox this was written in:
the installed `node_modules` is a Windows tree, so the only SWC binary present is
`@next/swc-win32-x64-msvc`, and with no network Next cannot fetch
`@next/swc-linux-x64-gnu`. It fails with `Failed to load SWC binary for
linux/x64`, which is an environment fault and says nothing about the source. Run
`npm run build` on the machine that owns the install. Typecheck and lint passing
covers most of what a build would catch, but not everything: a bad import path
resolved only by the bundler, a `"use client"` boundary violation, or a metadata
or route convention error would surface there first.

**No browser has rendered the page.** There is no Chrome and no Playwright here,
so nothing below has been observed, only reasoned about: frame rate, whether the
pinned scenes release cleanly, whether the horizontal rail's length matches its
content on a real viewport, how the decryption reads at speed, and how the whole
thing behaves on a phone. The layout is written to be correct without JavaScript
— `:root` defaults `--p: 1`, so every scene renders in its finished state before
hydration and with scripting off — but "written to be" is the honest phrasing.

**The share card is set in the wrong faces.** `public/og.png` is drawn by
`tools/make_og.py`, reading its strings from `src/data/portfolio.ts` so it cannot
drift from the page. No font registry is reachable, so it uses DejaVu Serif and
DejaVu Sans rather than Instrument Serif and Space Grotesk. Re-run `npm run og`
in an environment with the real faces installed.

**One file could not be deleted.** `src/components/effects/.scratch` is an empty
accident. The sandbox refuses to remove it (`Operation not permitted`). It is a
dotfile with no extension, so Next.js, TypeScript and ESLint all ignore it, and
nothing imports it — but it should be deleted by hand.

## The one thing to do first

```
npm run build
```

`npm run verify` runs the three checks, then the typecheck, the lint and the
build. Everything in it except the build has now passed here, so the build is the
last unopened item.
