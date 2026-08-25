/* ---------------------------------------------------------------------------
 * tools/test_lib.mjs — unit tests for the arithmetic the page is built on.
 *
 * WHY THESE TESTS AND NOT A COMPONENT TEST SUITE. Everything in src/lib is pure:
 * numbers in, numbers out, no DOM, no React, no time. That is exactly the code
 * where a test is cheap and where a bug is invisible — a smooth-looking page can
 * be quietly wrong about where a section starts, and nobody notices until the pin
 * jumps on a 4K monitor. The components, by contrast, are thin: they read a
 * custom property and hand it to CSS, and testing that would mean testing the
 * browser.
 *
 * These run under plain Node with no dependencies, using node:test and the type
 * stripping built into Node 22. tools/mirror.mjs handles the one impedance
 * mismatch (Node wants file extensions on relative imports, TypeScript does not).
 *
 * WHAT THIS DOES NOT PROVE. It does not typecheck, it does not lint, it does not
 * build, and it does not render anything. Those need `npm install`, which is not
 * available in the environment this was written in. Nothing below should be read
 * as a claim that the site runs; it is a claim that the maths is right.
 * ------------------------------------------------------------------------- */

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mirror } from "./mirror.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { load } = mirror(root, ["src/lib", "src/data"]);

const math = await load("src/lib/math.ts");
const motion = await load("src/lib/motion.ts");
const graph = await load("src/lib/graph.ts");
const decrypt = await load("src/lib/decrypt.ts");
const hash = await load("src/lib/hash.ts");
const layouts = await load("src/lib/core-layouts.ts");
const data = await load("src/data/portfolio.ts");

/* ===========================================================================
 * math
 * ========================================================================= */

test("clamp01 keeps everything inside the unit interval", () => {
  assert.equal(math.clamp01(-4), 0);
  assert.equal(math.clamp01(0), 0);
  assert.equal(math.clamp01(0.5), 0.5);
  assert.equal(math.clamp01(1), 1);
  assert.equal(math.clamp01(9), 1);
});

test("lerp hits both endpoints exactly", () => {
  // Exactness at the endpoints matters: a lerp that returns 0.9999 at t=1 leaves
  // a pinned section one pixel short of its final position, forever.
  assert.equal(math.lerp(10, 20, 0), 10);
  assert.equal(math.lerp(10, 20, 1), 20);
  assert.equal(math.lerp(10, 20, 0.5), 15);
});

test("mapRange normalises a sub-range and clamps outside it", () => {
  assert.equal(math.mapRange(0.5, 0.25, 0.75, 0, 1), 0.5);
  assert.equal(math.mapRange(0.25, 0.25, 0.75, 0, 1), 0);
  assert.equal(math.mapRange(0.75, 0.25, 0.75, 0, 1), 1);
  assert.equal(math.mapRange(0, 0.25, 0.75, 0, 1), 0);
  assert.equal(math.mapRange(1, 0.25, 0.75, 0, 1), 1);
  // The output range is allowed to be inverted and to be in any unit: this is
  // how a scroll fraction becomes a rem offset without the caller doing algebra.
  assert.equal(math.mapRange(0.5, 0, 1, 10, -10), 0);
});

test("mapRange survives a zero-width window instead of returning NaN", () => {
  // A degenerate window is a data error, not a crash. Division by zero here would
  // put NaN into a transform and blank a whole section.
  const out = math.mapRange(0.5, 0.5, 0.5, 0, 100);
  assert.ok(Number.isFinite(out), `expected a finite number, got ${out}`);
  assert.equal(math.inverseLerp(3, 3, 9), 0);
});

/* ===========================================================================
 * easing and staggering
 * ========================================================================= */

test("easings are monotonic and pinned at both ends", () => {
  // The names are the ones math.ts actually exports. Asserting a loop over a
  // guessed list would pass vacuously by skipping everything, which is worse
  // than no test: it reports green while checking nothing.
  for (const name of ["easeOutCubic", "easeInOutCubic", "easeOutQuart"]) {
    const fn = math[name];
    assert.equal(typeof fn, "function", `math.${name} does not exist`);
    assert.ok(Math.abs(fn(0)) < 1e-9, `${name}(0) should be 0, got ${fn(0)}`);
    assert.ok(Math.abs(fn(1) - 1) < 1e-9, `${name}(1) should be 1, got ${fn(1)}`);
    let prev = -Infinity;
    for (let i = -10; i <= 110; i++) {
      const v = fn(i / 100);
      // Clamped as well as monotonic: an easing that overshoots past 1 is how a
      // "subtle" reveal flickers at the boundary of a ScrollTrigger.
      assert.ok(v >= -1e-9 && v <= 1 + 1e-9, `${name} left [0,1] at t=${i / 100}: ${v}`);
      assert.ok(v >= prev - 1e-9, `${name} went backwards at t=${i / 100}`);
      prev = v;
    }
  }
});

test("smoothstep is flat outside its edges and symmetric about the middle", () => {
  assert.equal(math.smoothstep(0.2, 0.8, 0.1), 0);
  assert.equal(math.smoothstep(0.2, 0.8, 0.9), 1);
  assert.ok(Math.abs(math.smoothstep(0.2, 0.8, 0.5) - 0.5) < 1e-9);
});

test("q3 quantises without shifting the value or breaking the ends", () => {
  // q3 is not an easing, it is the write filter: it exists so a style write is
  // skipped when the change is smaller than a display can resolve.
  assert.equal(motion.q3(0), 0);
  assert.equal(motion.q3(1), 1);
  assert.equal(motion.q3(0.4173926), 0.417);
  assert.equal(motion.q3(0.4173931), 0.417);
  for (let i = 0; i <= 1000; i++) {
    const v = i / 1000;
    assert.ok(Math.abs(motion.q3(v) - v) <= 0.0005 + 1e-12, `q3 moved ${v} too far`);
  }
});

test("slice is a clamped window and never divides by zero", () => {
  assert.equal(motion.slice(0.1, 0.2, 0.6), 0);
  assert.equal(motion.slice(0.2, 0.2, 0.6), 0);
  // Approximate in the middle, exact at the ends: (0.4-0.2)/(0.6-0.2) is
  // 0.5000000000000001 in binary floating point, which is not a bug in slice.
  assert.ok(Math.abs(motion.slice(0.4, 0.2, 0.6) - 0.5) < 1e-12);
  assert.equal(motion.slice(0.6, 0.2, 0.6), 1);
  assert.equal(motion.slice(0.9, 0.2, 0.6), 1);
  // A zero-width or inverted slice is a typo in a section, and it must degrade to
  // a step rather than to NaN, because NaN in a transform blanks the element.
  assert.ok(Number.isFinite(motion.slice(0.5, 0.5, 0.5)));
  assert.equal(motion.slice(0.6, 0.5, 0.5), 1);
  assert.equal(motion.slice(0.4, 0.5, 0.5), 0);
});

test("pageProgress is clamped and safe on a page that does not scroll", () => {
  assert.equal(motion.pageProgress(0, 1000), 0);
  assert.equal(motion.pageProgress(500, 1000), 0.5);
  assert.equal(motion.pageProgress(4000, 1000), 1);
  // maxScroll is 0 on a short viewport-height page, and the progress bar must not
  // become NaN there.
  assert.ok(Number.isFinite(motion.pageProgress(0, 0)));
});

test("railOffset never scrolls past the end of the track", () => {
  const trackWidth = 4000;
  const viewport = 1200;
  const travel = trackWidth - viewport;
  // `+ 0` normalises the negative zero that -clamp01(0) * n produces. Node's
  // strict equal distinguishes -0 from 0, and a sign on zero is not a bug worth
  // a failing test.
  assert.equal(motion.railOffset(0, trackWidth, viewport) + 0, 0);
  assert.equal(motion.railOffset(1, trackWidth, viewport), -travel);
  // Half way is half the travel, because the rail is deliberately linear in
  // scroll: easing it makes the panels drift out from under the reader's hand.
  assert.equal(motion.railOffset(0.5, trackWidth, viewport), -travel / 2);
  // Out-of-range progress is clamped rather than extrapolated: overscroll must
  // not tear the last panel off the right edge.
  assert.equal(motion.railOffset(1.4, trackWidth, viewport), -travel);
  assert.equal(motion.railOffset(-0.4, trackWidth, viewport) + 0, 0);
});

test("railOffset does not move a track that fits the viewport", () => {
  assert.equal(motion.railOffset(0.5, 800, 1200) + 0, 0);
});

test("railIndex covers every panel and never overflows", () => {
  const count = 5;
  const seen = new Set();
  for (let i = 0; i <= 1000; i++) {
    const idx = motion.railIndex(i / 1000, count);
    assert.ok(Number.isInteger(idx), `index ${idx} is not an integer`);
    assert.ok(idx >= 0 && idx < count, `index ${idx} outside 0..${count - 1}`);
    seen.add(idx);
  }
  // Every panel must be reachable, including the last: an off-by-one here means
  // the fifth project can never become the active one.
  assert.equal(seen.size, count);
  assert.equal(motion.railIndex(0, count), 0);
  assert.equal(motion.railIndex(1, count), count - 1);
});

/* ===========================================================================
 * the skill graph
 * ========================================================================= */

test("every edge carries its own evidence", () => {
  const edges = graph.skillEdges(data.skills);
  assert.ok(edges.length > 0, "the graph has no edges at all");
  for (const e of edges) {
    assert.ok(Array.isArray(e.basis) && e.basis.length > 0, "an edge has no basis");
    const supported =
      e.sharedItems.length > 0 || e.sharedProjects.length > 0 || e.basis.includes("stated");
    // This is the test that keeps the diagram honest. If an edge can exist with
    // no shared item, no shared project and no stated relation, the picture is
    // decoration and the evidence panel is fiction.
    assert.ok(supported, `edge ${e.aId}-${e.bId} has no supporting evidence`);
    // And the basis must agree with the evidence it claims, in both directions.
    assert.equal(e.basis.includes("items"), e.sharedItems.length > 0, `${e.aId}-${e.bId} items`);
    assert.equal(
      e.basis.includes("projects"),
      e.sharedProjects.length > 0,
      `${e.aId}-${e.bId} projects`,
    );
  }
});

test("edge weight rises with evidence and is never below the stated floor", () => {
  // Weight drives line thickness only. It must still be ordered, because a
  // thicker line that means less is worse than no thickness variation at all.
  for (const e of graph.skillEdges(data.skills)) {
    assert.ok(e.weight >= 1, `weight below the floor on ${e.aId}-${e.bId}`);
    const expected = 1 + e.sharedItems.length * 0.5 + e.sharedProjects.length * 0.75;
    assert.ok(Math.abs(e.weight - expected) < 1e-9, `weight disagrees with evidence`);
  }
});

test("edges are undirected, unique, and never self-referential", () => {
  const edges = graph.skillEdges(data.skills);
  const keys = new Set();
  for (const e of edges) {
    assert.notEqual(e.aId, e.bId, `self edge on ${e.aId}`);
    assert.ok(e.a < e.b, `edge ${e.aId}-${e.bId} is not in canonical order`);
    const key = [e.aId, e.bId].sort().join("|");
    assert.ok(!keys.has(key), `duplicate edge ${key}`);
    keys.add(key);
  }
});

test("edge endpoints resolve to real groups and to their own indices", () => {
  const edges = graph.skillEdges(data.skills);
  for (const e of edges) {
    assert.equal(data.skills[e.a]?.id, e.aId, "edge index a disagrees with aId");
    assert.equal(data.skills[e.b]?.id, e.bId, "edge index b disagrees with bId");
  }
});

test("the graph is one connected system, not two unrelated clusters", () => {
  // The section's claim is that these eight areas are one system. A disconnected
  // node would make that claim visibly false: it would float unattached.
  assert.equal(graph.isConnected(data.skills), true, "the skill graph is disconnected");
});

test("neighbours agrees with the edge list in both directions", () => {
  const edges = graph.skillEdges(data.skills);
  for (const g of data.skills) {
    const n = graph.neighbours(g.id, edges);
    assert.ok(!n.includes(g.id), `${g.id} is its own neighbour`);
    for (const other of n) {
      const back = graph.neighbours(other, edges);
      assert.ok(back.includes(g.id), `${g.id}-${other} is one-way`);
    }
  }
});

test("ring positions stay inside the box and are all distinct", () => {
  const n = data.skills.length;
  const pos = graph.ringPositions(n);
  assert.equal(pos.length, n);
  const seen = new Set();
  for (const p of pos) {
    // A node is a zero-sized point with its label centred on it, so the bound is
    // tighter than the box: at x = 0.99 half the label hangs outside and gets
    // clipped. 0.05 is the margin the longest group name needs.
    assert.ok(p.x >= 0.05 && p.x <= 0.95, `x out of range: ${p.x}`);
    assert.ok(p.y >= 0.05 && p.y <= 0.95, `y out of range: ${p.y}`);
    const key = `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    assert.ok(!seen.has(key), "two nodes share a position");
    seen.add(key);
  }
});

test("the first node sits at twelve o'clock so the ring reads in data order", () => {
  const pos = graph.ringPositions(8);
  assert.ok(Math.abs(pos[0].x - 0.5) < 1e-9, "node 01 is not horizontally centred");
  assert.ok(pos[0].y < 0.5, "node 01 is not above the centre");
});

test("degrees sum to twice the edge count", () => {
  // The handshake lemma. If this fails, either an edge is counted once or a node
  // is missing from the tally, and the node sizes on the page are wrong.
  const edges = graph.skillEdges(data.skills);
  const deg = graph.degrees(data.skills, edges);
  assert.equal(deg.length, data.skills.length);
  const total = deg.reduce((a, b) => a + b, 0);
  assert.equal(total, edges.length * 2);
});

/* ===========================================================================
 * the decryption
 * ========================================================================= */

test("the plan covers every character and mutates none of them", () => {
  const lines = ["I learn by building the thing.", "One line more."];
  const planned = decrypt.planLines(lines);
  assert.equal(planned.length, lines.length);
  for (let l = 0; l < lines.length; l++) {
    assert.equal(planned[l].length, lines[l].length, `line ${l} changed length`);
    for (let c = 0; c < lines[l].length; c++) {
      const cell = planned[l][c];
      assert.equal(cell.ch, lines[l].charAt(c), `character moved at ${l}:${c}`);
      assert.equal(cell.line, l);
      assert.equal(cell.col, c);
    }
  }
});

test("whitespace is structural: resolved from the start, never scrambled", () => {
  // A shifting word boundary reads as broken text rather than as encryption, and
  // it reflows the line on every frame.
  const planned = decrypt.planLines(["one two  three"]);
  for (const cell of planned[0]) {
    if (cell.ch !== " ") continue;
    assert.equal(cell.space, true, `a space is not marked structural at ${cell.col}`);
    assert.equal(cell.thr, 0, "a space has a non-zero threshold");
    assert.equal(decrypt.isResolved(cell, 0), true, "a space starts unresolved");
  }
});

test("the line resolves completely by the end of the window and not before", () => {
  const planned = decrypt.planLines(["One assistant that knows the whole context."]);
  const [from, to] = decrypt.WINDOW;
  for (const cell of planned[0]) {
    assert.ok(cell.thr >= 0 && cell.thr < 1, `threshold out of range: ${cell.thr}`);
    // At the end of the window every character must be its real self. This is the
    // test that stops a sentence from staying half-encrypted at the section end.
    assert.equal(decrypt.isResolved(cell, to), true, `cell ${cell.col} never resolves`);
    assert.equal(decrypt.isResolved(cell, 1), true, `cell ${cell.col} unresolved past the end`);
  }
  // And before the window opens, nothing but whitespace has resolved.
  const early = planned[0].filter((c) => !c.space && decrypt.isResolved(c, from - 0.01));
  assert.equal(early.length, 0, `${early.length} characters resolved before the window opened`);
});

test("resolution is monotonic in scroll, so scrolling back does not re-encrypt", () => {
  const planned = decrypt.planLines(["Learn. Build. Innovate. Lead."]);
  for (const cell of planned[0]) {
    let wasResolved = false;
    for (let i = 0; i <= 200; i++) {
      const now = decrypt.isResolved(cell, i / 200);
      assert.ok(!(wasResolved && !now), `cell ${cell.col} un-resolved as scroll advanced`);
      wasResolved = now;
    }
  }
});

test("the reveal is spread across all eight rounds rather than wiping at once", () => {
  // Thresholds clustered into one round would make the whole line flip together,
  // which reads as a page-load flash rather than as a decryption.
  const planned = decrypt.planLines(["One assistant that knows the whole context."]);
  const rounds = new Set(
    planned[0].filter((c) => !c.space).map((c) => Math.floor(c.thr * decrypt.ROUNDS)),
  );
  assert.ok(rounds.size >= 6, `only ${rounds.size} of ${decrypt.ROUNDS} rounds are used`);
});

test("neighbouring characters do not resolve together", () => {
  // The failure this catches is a hash whose two salts are correlated: the line
  // then resolves as a left-to-right column wipe instead of as scattered cells.
  const planned = decrypt.planLines(["One assistant that knows the whole context."]);
  const cells = planned[0].filter((c) => !c.space);
  let adjacentPairs = 0;
  for (let i = 1; i < cells.length; i++) {
    if (Math.abs(cells[i].thr - cells[i - 1].thr) < 0.02) adjacentPairs++;
  }
  assert.ok(
    adjacentPairs < cells.length * 0.25,
    `${adjacentPairs} of ${cells.length} neighbours resolve together`,
  );
});

test("the scrambled glyph is always from the cipher alphabet and never a letter", () => {
  const planned = decrypt.planLines(["Learn. Build."]);
  for (const cell of planned[0]) {
    for (const tick of [0, 1, 7, 41, 1000]) {
      const g = decrypt.scrambleGlyph(cell, tick);
      assert.equal(g.length, 1, "a glyph is not one character wide");
      assert.ok(decrypt.ALPHA.includes(g), `glyph ${g} is outside the alphabet`);
    }
  }
  // No letters in the alphabet is deliberate: letters would read as misspelling.
  assert.ok(!/[a-z]/i.test(decrypt.ALPHA), "the cipher alphabet contains letters");
});

test("the scramble is deterministic for a given tick", () => {
  // Same cell, same tick, same glyph. This is what makes a stationary reader see
  // a stable frame rather than a jittering one.
  const cell = decrypt.planLines(["Learn."])[0][0];
  assert.equal(decrypt.scrambleGlyph(cell, 12), decrypt.scrambleGlyph(cell, 12));
  const varied = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((t) => decrypt.scrambleGlyph(cell, t)));
  assert.ok(varied.size > 1, "the glyph never churns");
});

test("the readout reports the same state that drives the glyphs", () => {
  const planned = decrypt.planLines(["One assistant that knows the whole context."]);
  const total = planned[0].filter((c) => !c.space).length;
  const [, to] = decrypt.WINDOW;

  const start = decrypt.readout(planned, 0);
  assert.equal(start.total, total, "the readout counts a different number of cells");
  assert.equal(start.resolved, 0, "the readout claims progress before the window opens");
  assert.ok(Math.abs(start.entropy - decrypt.BITS) < 1e-9, "entropy does not start full");

  const end = decrypt.readout(planned, to);
  assert.equal(end.resolved, total, "the readout does not finish");
  assert.equal(end.round, decrypt.ROUNDS, "the round counter does not reach the last round");
  assert.ok(Math.abs(end.entropy) < 1e-9, "entropy does not fall to zero");
  assert.equal(end.key.length, 4);
  for (const byte of end.key) assert.match(byte, /^[0-9a-f]{2}$/, `key byte ${byte} is not hex`);

  // Monotonic, and never reporting more resolved than exist.
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const r = decrypt.readout(planned, i / 100);
    assert.ok(r.resolved >= prev, "the resolved count went down");
    assert.ok(r.resolved <= r.total, "more cells resolved than exist");
    assert.ok(r.round >= 0 && r.round <= decrypt.ROUNDS, `round out of range: ${r.round}`);
    prev = r.resolved;
  }
});

test("pointer relief is bounded, falls off, and is zero without a pointer", () => {
  assert.equal(decrypt.pointerRelief(0, 0, null, null), 0);
  assert.equal(decrypt.pointerRelief(0, 0, 10, null), 0);
  const centre = decrypt.pointerRelief(0, 0, 0, 0);
  assert.ok(Math.abs(centre - decrypt.POINTER_BIAS) < 1e-9, "relief at the pointer is not the bias");
  const near = decrypt.pointerRelief(20, 0, 0, 0);
  const far = decrypt.pointerRelief(100, 0, 0, 0);
  assert.ok(near > far, "relief does not fall off with distance");
  assert.equal(decrypt.pointerRelief(decrypt.POINTER_RADIUS, 0, 0, 0), 0, "relief has a hard edge");
  // Relief must never be able to resolve the whole line early on its own.
  assert.ok(decrypt.POINTER_BIAS < 0.25, "the pointer can skip too much of the reveal");
});

test("hashing is stable and well distributed enough to be a key schedule", () => {
  assert.equal(hash.h32(3, 7), hash.h32(3, 7));
  assert.notEqual(hash.h32(3, 7), hash.h32(7, 3), "the hash is symmetric in its arguments");
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const h = hash.h32(i, i * 31 + 1);
    assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff, `h32 out of range: ${h}`);
    seen.add(h);
  }
  assert.ok(seen.size > 480, `too many collisions in 500 keys: ${seen.size} distinct`);
});

test("h01 stays inside the unit interval across a wide input range", () => {
  for (let i = -500; i < 500; i++) {
    const v = hash.h01(i * 7919, i * 104729 + 3);
    assert.ok(v >= 0 && v < 1, `h01 out of range at ${i}: ${v}`);
  }
});

/* ===========================================================================
 * the signature object
 * ========================================================================= */

test("every arrangement holds the same number of points", () => {
  const count = 240;
  const built = layouts.buildLayouts(count);
  const names = Object.keys(built);
  // All five, by name: the object morphs between them, and a missing arrangement
  // would silently collapse two stops of the scroll into one.
  assert.deepEqual(names.sort(), [...layouts.LAYOUT_ORDER].sort());
  for (const name of names) {
    assert.equal(
      built[name].length,
      count * 3,
      `arrangement ${name} has the wrong buffer length`,
    );
    for (let i = 0; i < built[name].length; i++) {
      assert.ok(Number.isFinite(built[name][i]), `NaN in arrangement ${name} at ${i}`);
      // Bounded as well as finite: a stray point at x = 40 is invisible itself but
      // stretches nothing and costs nothing, so it survives review unnoticed.
      assert.ok(Math.abs(built[name][i]) < 4, `point out of bounds in ${name}: ${built[name][i]}`);
    }
  }
});

test("the arrangements are deterministic given the same seed, and differ from each other", () => {
  const a = layouts.buildLayouts(120, 99);
  const b = layouts.buildLayouts(120, 99);
  assert.deepEqual(Array.from(a.seed), Array.from(b.seed), "the same seed gave two clouds");
  // And they must actually be different shapes, or the morph is a no-op.
  const names = [...layouts.LAYOUT_ORDER];
  for (let i = 1; i < names.length; i++) {
    const prev = Array.from(a[names[i - 1]]);
    const next = Array.from(a[names[i]]);
    assert.notDeepEqual(prev, next, `${names[i - 1]} and ${names[i]} are the same arrangement`);
  }
});

test("the monogram is provably two separated letterforms", () => {
  // The claim in the close is that the object becomes J and T. This checks the
  // geometry rather than trusting the comment: the points must fall into two
  // horizontally separated clusters, and both must be populated.
  const count = 300;
  const built = layouts.buildLayouts(count);
  const mono = built.monogram;
  assert.ok(mono, "there is no monogram arrangement");
  let left = 0;
  let right = 0;
  for (let i = 0; i < count; i++) {
    const x = mono[i * 3];
    if (x < 0) left++;
    else right++;
  }
  assert.ok(left > count * 0.2, `left letterform is nearly empty (${left})`);
  assert.ok(right > count * 0.2, `right letterform is nearly empty (${right})`);
});

test("every monogram point is inside the letterforms, not merely near them", () => {
  // The separation test above would pass for two blurry blobs. This one asserts
  // that each sampled point actually lies within one of the shapes that make up
  // the J and the T, which is what makes the mark legible rather than suggestive.
  const count = 400;
  const mono = layouts.buildLayouts(count).monogram;
  let inside = 0;
  for (let i = 0; i < count; i++) {
    if (layouts.insideMonogram(mono[i * 3], mono[i * 3 + 1], 1e-3)) inside++;
  }
  assert.equal(inside, count, `${count - inside} of ${count} points fell outside the letterforms`);
});

test("the letterforms are described y-up, which is the sign the renderer must invert", () => {
  // This is the regression guard for a bug that shipped: the monogram rendered
  // upside down. The geometry was never wrong — it is written in the ordinary
  // mathematical convention, y growing upward — but a canvas grows y downward, so
  // SignatureCore has to project with `cy - y`. Four of the five arrangements are
  // near enough symmetric in y to hide a wrong sign, so the letters were the only
  // place it was visible. These two assertions pin the convention down so that a
  // future edit which flips the shapes instead of the projection fails here.
  const rects = layouts.SHAPES_JT.filter((s) => s.kind === "rect");
  const crossbar = rects.reduce((a, b) => (b.x1 - b.x0 > a.x1 - a.x0 ? b : a));
  const highest = Math.max(...rects.map((s) => Math.max(s.y0, s.y1)));
  assert.equal(
    Math.max(crossbar.y0, crossbar.y1),
    highest,
    "the T's crossbar is not the topmost thing in the mark",
  );

  const hook = layouts.SHAPES_JT.find((s) => s.kind === "arc");
  assert.ok(hook, "the J has no hook");
  // pi to 2pi is the lower half plane, so the hook hangs below the stem's foot.
  assert.ok(
    Math.min(hook.a0, hook.a1) >= Math.PI - 1e-9,
    `the J's hook no longer sweeps the lower half plane: ${hook.a0} to ${hook.a1}`,
  );
});

test("the renderer's own projection puts the mark the right way up", () => {
  // The test above pins the geometry. On its own that is not enough, and the proof
  // is that it passed while the page was wrong: it would also pass if someone
  // corrected an upside-down mark by flipping the projection instead of leaving it
  // alone. So this one asserts the other half, through `screenY` — the exact
  // function SignatureCore calls, not a copy of its arithmetic.
  const { screenY, SHAPES_JT } = layouts;
  const cy = 400;
  const scale = 300;

  // Downward in the maths must be downward on the screen, at every scale and every
  // perspective factor, or the whole cloud is mirrored and only the letters show it.
  assert.ok(screenY(cy, 1, 1, scale) < cy, "y up did not project above the centre");
  assert.ok(screenY(cy, -1, 1, scale) > cy, "y down did not project below the centre");
  assert.ok(
    screenY(cy, 0.5, 0.4, scale) < cy && screenY(cy, 0.5, 1.6, scale) < cy,
    "perspective inverted the axis",
  );

  const rects = SHAPES_JT.filter((s) => s.kind === "rect");
  const mid = (s) => screenY(cy, (s.y0 + s.y1) / 2, 1, scale);
  // Identified by shape, not by array position, so reordering the letterforms
  // cannot quietly turn this into a test of the wrong two rectangles.
  const crossbar = rects.reduce((a, b) => (b.x1 - b.x0 > a.x1 - a.x0 ? b : a));
  const stems = rects.filter((s) => s !== crossbar);
  for (const stem of stems) {
    assert.ok(
      mid(crossbar) < mid(stem),
      `the T's crossbar rendered at y=${mid(crossbar)}, below a stem at y=${mid(stem)}`,
    );
  }

  // And the J's hook must hang below its own stem. The stem is the rect that
  // shares the hook's x range; its foot is the hook's centre line.
  const hook = SHAPES_JT.find((s) => s.kind === "arc");
  const hookFoot = screenY(cy, hook.cy - (hook.r0 + hook.r1) / 2, 1, scale);
  const jStem = stems.reduce((a, b) => (a.x0 < b.x0 ? a : b));
  assert.ok(
    hookFoot > mid(jStem),
    `the J's hook rendered at y=${hookFoot}, above its stem at y=${mid(jStem)}`,
  );
});

test("layoutAt walks the arrangements in order and stays in range", () => {
  let last = -1;
  for (let i = 0; i <= 200; i++) {
    const u = i / 200;
    const b = layouts.layoutAt(u);
    assert.ok(b.t >= 0 && b.t <= 1, `blend t out of range: ${b.t}`);
    assert.ok(b.segment >= last, "the schedule went backwards");
    // The pair must always be consecutive stops in the declared order, never a
    // jump: the object may not teleport from the seed to the monogram.
    assert.equal(layouts.LAYOUT_ORDER[b.segment], b.from, `from disagrees with segment at ${u}`);
    assert.equal(layouts.LAYOUT_ORDER[b.segment + 1], b.to, `to disagrees with segment at ${u}`);
    last = b.segment;
  }
});

test("the schedule starts on the seed and ends fully arrived at the monogram", () => {
  const start = layouts.layoutAt(0);
  assert.equal(start.from, "seed");
  assert.equal(start.t, 0, "the object starts already moving");

  const end = layouts.layoutAt(1);
  assert.equal(end.to, "monogram", "the object does not end on the monogram");
  assert.ok(Math.abs(end.t - 1) < 1e-9, `the monogram is never fully reached: t=${end.t}`);
  // Overscroll past the end must hold the monogram rather than wrap around.
  assert.equal(layouts.layoutAt(4).to, "monogram");
  assert.equal(layouts.layoutAt(-4).from, "seed");
});

test("the wiring is visible only around the lattice", () => {
  // The edges are an argument about one arrangement. If they linger into the
  // monogram, the mark reads as a mesh instead of as two letters.
  assert.equal(layouts.edgeOpacity(0), 0, "the seed is wired");
  assert.equal(layouts.edgeOpacity(1), 0, "the monogram is wired");
  const atLattice = layouts.edgeOpacity(layouts.LAYOUT_STOPS[2]);
  assert.ok(atLattice > 0.9, `the lattice is not wired: ${atLattice}`);
  for (let i = 0; i <= 100; i++) {
    const v = layouts.edgeOpacity(i / 100);
    assert.ok(v >= 0 && v <= 1, `edge opacity out of range: ${v}`);
  }
});

test("blendInto writes into the caller's buffer without allocating", () => {
  const built = layouts.buildLayouts(50);
  const target = new Float32Array(150);
  layouts.blendInto(target, built.seed, built.expand, 0, 50);
  assert.deepEqual(Array.from(target), Array.from(built.seed), "t=0 is not the from cloud");
  layouts.blendInto(target, built.seed, built.expand, 1, 50);
  assert.deepEqual(Array.from(target), Array.from(built.expand), "t=1 is not the to cloud");
});

test("the lattice wiring is local, bounded, and never self-linked", () => {
  const n = 200;
  const cloud = layouts.buildLayouts(n).lattice;
  const radius = 0.2;
  const cap = 300;
  const edges = layouts.latticeEdges(cloud, n, radius, cap);
  assert.ok(edges.length > 0, "the lattice has no wiring at all");
  assert.ok(edges.length <= cap, `the cap was exceeded: ${edges.length} > ${cap}`);
  for (const e of edges) {
    assert.notEqual(e.a, e.b, "a point is wired to itself");
    assert.ok(e.a >= 0 && e.a < n && e.b >= 0 && e.b < n, "an edge points outside the cloud");
    const dx = cloud[e.a * 3] - cloud[e.b * 3];
    const dy = cloud[e.a * 3 + 1] - cloud[e.b * 3 + 1];
    const dz = cloud[e.a * 3 + 2] - cloud[e.b * 3 + 2];
    // Locality is the whole point: long edges across the middle would read as a
    // random scribble rather than as structure.
    assert.ok(
      Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius + 1e-6,
      "an edge is longer than the neighbourhood radius",
    );
  }
});

/* ===========================================================================
 * the data itself — the anti-fabrication rules, as executable assertions
 * ========================================================================= */

test("no project claims a repository or demo it does not have", () => {
  for (const p of data.projects) {
    for (const field of ["repo", "demo"]) {
      const v = p[field];
      assert.ok(
        v === null || /^https:\/\//.test(v),
        `${p.id}.${field} is neither null nor a real https URL: ${v}`,
      );
    }
  }
});

test("exactly one project is the hero", () => {
  assert.equal(data.projects.filter((p) => p.hero).length, 1);
});

test("every project id and index is unique", () => {
  const ids = new Set(data.projects.map((p) => p.id));
  const idx = new Set(data.projects.map((p) => p.index));
  assert.equal(ids.size, data.projects.length);
  assert.equal(idx.size, data.projects.length);
});

test("no skill group carries a level, score or percentage", () => {
  // The brief forbids invented proficiency. This asserts it structurally rather
  // than trusting future edits: no numeric field may appear on a group, and no
  // item may read like "Python 95%".
  for (const g of data.skills) {
    for (const [key, value] of Object.entries(g)) {
      assert.notEqual(typeof value, "number", `${g.id}.${key} is a number`);
    }
    for (const item of g.items) {
      assert.ok(!/\d\s*%/.test(item), `${g.id} item looks like a percentage: ${item}`);
      assert.ok(
        !/\b(beginner|intermediate|advanced|expert|proficient)\b/i.test(item),
        `${g.id} item asserts a level: ${item}`,
      );
    }
  }
});

test("every skill group's related ids exist", () => {
  const ids = new Set(data.skills.map((g) => g.id));
  for (const g of data.skills) {
    for (const r of g.related) {
      assert.ok(ids.has(r), `${g.id} relates to unknown group ${r}`);
      assert.notEqual(r, g.id, `${g.id} relates to itself`);
    }
  }
});

test("every project referenced by a skill group exists", () => {
  const ids = new Set(data.projects.map((p) => p.id));
  for (const g of data.skills) {
    for (const p of g.projects) {
      assert.ok(ids.has(p), `${g.id} references unknown project ${p}`);
    }
  }
});

test("a skill group that attributes projects does not miss one it plainly matches", () => {
  /* This runs the check in the only direction the data can actually support.
   *
   * The tempting test is the other way round: if a group says it is used in POGO,
   * POGO's own technologies should name one of that group's skills. That test
   * fails on true data. `dev` lists Python and JavaScript, POGO lists OpenClaw
   * and LLM APIs, and both are correct — a project's technology list names what
   * it is built ON, not what it is written IN. Asserting the overlap would push
   * whoever hits the failure into padding POGO's technology list to satisfy the
   * test, which is fabrication with a green tick next to it.
   *
   * What IS checkable is under-attribution. If a group names a skill that appears
   * verbatim in a project's own text, that group should list the project;
   * otherwise the graph's evidence panel is quietly incomplete. Groups that
   * attribute nothing at all are abstaining rather than under-claiming, and are
   * skipped: `cs` and `sec` deliberately point at no project.
   */
  for (const g of data.skills) {
    if (g.projects.length === 0) continue;
    for (const p of data.projects) {
      const haystack = [...p.technologies, ...p.concepts, p.type, p.category]
        .join(" ")
        .toLowerCase();
      const match = g.items.find((item) => haystack.includes(item.toLowerCase()));
      if (!match) continue;
      assert.ok(
        g.projects.includes(p.id),
        `${g.id} names "${match}", which ${p.id} also names, but does not list ${p.id}`,
      );
    }
  }
});

test("education never names a university or an admission result", () => {
  const intended = data.education.find((e) => e.kind === "intended");
  assert.ok(intended, "there is no intended entry");
  assert.equal(intended.institution, null, "the intended degree names an institution");
  assert.equal(intended.board, null);
  for (const e of data.education) {
    const text = JSON.stringify(e).toLowerCase();
    for (const banned of ["ielts", "scholarship", "accepted", "admitted", "admission"]) {
      assert.ok(!text.includes(banned), `education mentions "${banned}"`);
    }
  }
});

test("the dream role is framed as an aspiration", () => {
  assert.equal(data.objective.dream.role, "CEO");
  assert.ok(
    /aspiration/i.test(data.objective.dream.framing),
    "the CEO framing does not say it is an aspiration",
  );
});

test("the journey separates what is true now from what is intended", () => {
  const states = new Set(data.objective.stages.map((s) => s.state));
  assert.ok(states.has("now") && states.has("ahead"), "the stages are all one state");
});

test("nav targets are all in-page anchors and unique", () => {
  const seen = new Set();
  for (const item of data.nav) {
    assert.match(item.href, /^#[a-z-]+$/, `nav href is not an in-page anchor: ${item.href}`);
    assert.equal(item.href, `#${item.id}`, `nav id and href disagree: ${item.id}`);
    assert.ok(!seen.has(item.id), `duplicate nav id ${item.id}`);
    seen.add(item.id);
  }
});

test("no personal title in the data overstates the status", () => {
  // The brief lists the words that must not describe him. This walks the whole
  // data file rather than the person block, because the risk is a stray phrase in
  // a summary, not in the field literally called `status`.
  const banned = [
    "senior developer",
    "professional software engineer",
    "ai engineer",
    "expert in",
    "years of experience",
  ];
  const text = JSON.stringify(data.portfolio ?? data.default ?? {}).toLowerCase();
  for (const phrase of banned) {
    assert.ok(!text.includes(phrase), `the data claims "${phrase}"`);
  }
  assert.equal(data.person.status, "Student");
});
