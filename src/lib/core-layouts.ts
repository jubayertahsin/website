/* ---------------------------------------------------------------------------
 * lib/core-layouts.ts — geometry for the signature object.
 *
 * ONE object appears in the hero and is still on screen at the end. It never
 * cuts; it only reorganises. Five arrangements of the SAME point set, in order:
 *
 *   seed      a tight shell, barely turning. Potential, not activity.
 *   expand    the same shell inflated. The scope of the thing opening up.
 *   lattice   snapped to a grid and wired together. Structure, connections.
 *   route     concentric rings around a hub. Model routing, made literal.
 *   monogram  the points converge on J and T. The person, at the end.
 *
 * The single most important property: point i is the same point in all five
 * arrangements. That is what makes this read as one object living through the
 * page rather than as five separate graphics fading into each other. Morphing is
 * then just a lerp between two arrays, which is also why it is cheap enough to
 * run at 60fps on a phone.
 *
 * There is no WebGL here and no Three.js in the project. A 2D canvas draws a few
 * hundred points and a few dozen lines per frame, which is nothing, and it keeps
 * the dependency list at four. Three.js would have added ~600KB to make the same
 * marks, and the brief is explicit that this must not become a 3D demo.
 *
 * Everything in this file is pure, so tools/test_lib.ts can assert that the
 * monogram actually spells JT: it samples the generated points and checks they
 * all fall inside the letterform shapes, and that every shape received some.
 * ------------------------------------------------------------------------- */

import { clamp01, easeInOutCubic, inverseLerp, mulberry32 } from "./math";

/** Points in the cloud. Enough to read as a field, few enough to stay cheap. */
export const CORE_COUNT = 560;

/** Fixed seed: the object must look identical on every load and every machine. */
export const CORE_SEED = 0x5eed1a7;

export type LayoutName = "seed" | "expand" | "lattice" | "route" | "monogram";

export const LAYOUT_ORDER: readonly LayoutName[] = [
  "seed",
  "expand",
  "lattice",
  "route",
  "monogram",
];

/**
 * Where each arrangement sits along the page's overall progress.
 *
 * Not evenly spaced. `lattice` holds the longest span because that is where the
 * skills live and where the object is doing the most explaining; `monogram`
 * arrives late and fast, because the close should feel like a decision.
 */
export const LAYOUT_STOPS: readonly number[] = [0, 0.18, 0.42, 0.72, 1];

/** A point cloud, as flat xyz triples. Flat because this is per-frame work. */
export type Cloud = Float32Array;

/* =========================================================================
 * Letterforms.
 *
 * J and T described as two primitive kinds only, rect and annulus sector, so
 * that "is this point inside the letter" is arithmetic rather than a rasterised
 * hit test. That is what lets the tests verify the monogram without a canvas.
 * ======================================================================= */

export type Shape =
  | { kind: "rect"; x0: number; y0: number; x1: number; y1: number }
  | { kind: "arc"; cx: number; cy: number; r0: number; r1: number; a0: number; a1: number };

/**
 * The J: one vertical stem and one hook, and no top crossbar.
 *
 * A serif J often carries a crossbar, but placed next to a T it reads as "TT",
 * so it is omitted. The hook's outer radius meets the stem exactly: the arc runs
 * from angle pi to 2pi around (-0.58, -0.15) with radii 0.16 and 0.36, so at
 * angle 2pi its span is x in [-0.42, -0.22], which is precisely the stem's
 * width. The two primitives share an edge instead of overlapping, so the point
 * density stays even across the joint.
 */
export const SHAPES_J: readonly Shape[] = [
  { kind: "rect", x0: -0.42, y0: -0.15, x1: -0.22, y1: 0.56 },
  { kind: "arc", cx: -0.58, cy: -0.15, r0: 0.16, r1: 0.36, a0: Math.PI, a1: Math.PI * 2 },
];

/** The T: crossbar and stem, sharing an edge at y = 0.4. */
export const SHAPES_T: readonly Shape[] = [
  { kind: "rect", x0: 0.06, y0: 0.4, x1: 0.94, y1: 0.56 },
  { kind: "rect", x0: 0.4, y0: -0.55, x1: 0.6, y1: 0.4 },
];

export const SHAPES_JT: readonly Shape[] = [...SHAPES_J, ...SHAPES_T];

/** Area, used to distribute points so density is uniform across the monogram. */
export function shapeArea(s: Shape): number {
  if (s.kind === "rect") return Math.abs((s.x1 - s.x0) * (s.y1 - s.y0));
  return 0.5 * Math.abs(s.a1 - s.a0) * Math.abs(s.r1 * s.r1 - s.r0 * s.r0);
}

/**
 * A uniformly distributed point inside a shape.
 *
 * The arc case takes the square root of the interpolated squared radius rather
 * than interpolating the radius directly. Interpolating radius linearly piles
 * points up on the inner edge, which makes the hook of the J look like it has a
 * bright rim; area-correct sampling does not.
 */
export function samplePoint(s: Shape, rnd: () => number): [number, number] {
  if (s.kind === "rect") {
    return [s.x0 + rnd() * (s.x1 - s.x0), s.y0 + rnd() * (s.y1 - s.y0)];
  }
  const r = Math.sqrt(s.r0 * s.r0 + rnd() * (s.r1 * s.r1 - s.r0 * s.r0));
  const a = s.a0 + rnd() * (s.a1 - s.a0);
  return [s.cx + Math.cos(a) * r, s.cy + Math.sin(a) * r];
}

/** Inside test, with tolerance. Used by the tests, not by the renderer. */
export function insideShape(s: Shape, x: number, y: number, eps = 1e-6): boolean {
  if (s.kind === "rect") {
    return (
      x >= Math.min(s.x0, s.x1) - eps &&
      x <= Math.max(s.x0, s.x1) + eps &&
      y >= Math.min(s.y0, s.y1) - eps &&
      y <= Math.max(s.y0, s.y1) + eps
    );
  }
  const dx = x - s.cx;
  const dy = y - s.cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < s.r0 - eps || r > s.r1 + eps) return false;
  // Normalise the angle into [0, 2pi) and test both it and its +2pi image, so a
  // sector written as [pi, 2pi] still matches a point that atan2 reports as 0.
  let a = Math.atan2(dy, dx);
  if (a < 0) a += Math.PI * 2;
  const lo = Math.min(s.a0, s.a1) - eps;
  const hi = Math.max(s.a0, s.a1) + eps;
  return (a >= lo && a <= hi) || (a + Math.PI * 2 >= lo && a + Math.PI * 2 <= hi);
}

export function insideMonogram(x: number, y: number, eps = 1e-6): boolean {
  for (const s of SHAPES_JT) if (insideShape(s, x, y, eps)) return true;
  return false;
}

/* =========================================================================
 * Projection.
 * ======================================================================= */

/**
 * A point's y in canvas space.
 *
 * This is one line and it lives here rather than inline in the renderer, because
 * it is the line that was wrong. Everything above is written in the ordinary
 * mathematical convention where y grows upward — the T's crossbar sits at +0.56,
 * the J's hook sweeps the lower half plane — while a canvas grows y downward, so
 * the projection has to negate. Four of the five arrangements are near enough
 * symmetric in y that a wrong sign is invisible in them; the monogram is the only
 * place it shows, and it showed. The mark rendered upside down.
 *
 * Exported and pure so the test suite can assert the mark is the right way up
 * through the same expression the renderer actually uses. A test that restates the
 * projection instead of calling it can agree with itself while the page disagrees,
 * which is precisely how the bug survived a green suite the first time.
 */
export function screenY(cy: number, y: number, persp: number, scale: number): number {
  return cy - y * persp * scale;
}

/* =========================================================================
 * The five arrangements.
 * ======================================================================= */

/**
 * Even directions on a sphere, via the golden angle.
 *
 * Random directions clump: a few hundred of them leave visible bald patches and
 * visible clusters, and both read as a mistake rather than as a texture. The
 * Fibonacci construction has no free parameters and no clumping.
 */
function sphereDirection(i: number, n: number): [number, number, number] {
  const y = 1 - (2 * i + 1) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * 2.399963229728653; // golden angle in radians
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

function buildSeed(n: number, rnd: () => number): Cloud {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = sphereDirection(i, n);
    // A shell with thickness, not a soap bubble: a mathematically perfect shell
    // silhouettes as a hard circle, which looks like a logo rather than a cloud.
    const r = 0.3 + rnd() * 0.06;
    out[i * 3] = x * r;
    out[i * 3 + 1] = y * r;
    out[i * 3 + 2] = z * r;
  }
  return out;
}

function buildExpand(n: number, rnd: () => number): Cloud {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = sphereDirection(i, n);
    // Same directions as `seed`, so this is unmistakably the same cloud
    // inflating rather than a different cloud appearing. The variance is wider
    // because the shell is bigger, keeping apparent thickness roughly constant.
    const r = 0.66 + rnd() * 0.2;
    out[i * 3] = x * r;
    out[i * 3 + 1] = y * r * 0.92;
    out[i * 3 + 2] = z * r;
  }
  return out;
}

/**
 * A grid, with a slight per-point offset.
 *
 * Perfectly regular grids produce moire when projected and rotated, and the
 * jitter is what stops the lattice from strobing as the object turns.
 */
function buildLattice(n: number, rnd: () => number): Cloud {
  const out = new Float32Array(n * 3);
  const side = Math.max(2, Math.ceil(Math.cbrt(n)));
  const span = 1.62;
  for (let i = 0; i < n; i++) {
    const gx = i % side;
    const gy = Math.floor(i / side) % side;
    const gz = Math.floor(i / (side * side)) % side;
    const step = span / (side - 1);
    out[i * 3] = -span / 2 + gx * step + (rnd() - 0.5) * step * 0.42;
    out[i * 3 + 1] = -span / 2 + gy * step + (rnd() - 0.5) * step * 0.42;
    out[i * 3 + 2] = -span / 2 + gz * step + (rnd() - 0.5) * step * 0.42;
  }
  return out;
}

/** Ring radii for the routing arrangement, plus the share of points each takes. */
export const ROUTE_RINGS: readonly number[] = [0.34, 0.54, 0.74, 0.92];

/**
 * Concentric rings around a dense hub.
 *
 * This is the one arrangement that means something specific: a router in the
 * middle and providers orbiting it is what OmniRoute and FreeLLMAPI actually
 * do, so the object is diagramming the projects it sits next to. Points per
 * ring scale with circumference, so spacing along every ring is even.
 */
function buildRoute(n: number, rnd: () => number): Cloud {
  const out = new Float32Array(n * 3);
  const hub = Math.round(n * 0.14);
  for (let i = 0; i < hub; i++) {
    const [x, y, z] = sphereDirection(i, Math.max(1, hub));
    const r = 0.06 + rnd() * 0.07;
    out[i * 3] = x * r;
    out[i * 3 + 1] = y * r;
    out[i * 3 + 2] = z * r;
  }
  const rest = n - hub;
  const total = ROUTE_RINGS.reduce((a, b) => a + b, 0);
  let placed = 0;
  for (let ring = 0; ring < ROUTE_RINGS.length; ring++) {
    const radius = ROUTE_RINGS[ring];
    const isLast = ring === ROUTE_RINGS.length - 1;
    const count = isLast ? rest - placed : Math.round((radius / total) * rest);
    for (let k = 0; k < count; k++) {
      const i = hub + placed + k;
      if (i >= n) break;
      const a = (k / Math.max(1, count)) * Math.PI * 2 + ring * 0.37;
      const wobble = (rnd() - 0.5) * 0.03;
      out[i * 3] = Math.cos(a) * (radius + wobble);
      out[i * 3 + 1] = Math.sin(a) * (radius + wobble) * 0.58;
      // Rings tilt out of plane by ring index, so they read as orbits in depth
      // rather than as flat concentric circles.
      out[i * 3 + 2] = Math.sin(a) * (radius + wobble) * 0.52 + (ring - 1.5) * 0.06;
    }
    placed += count;
  }
  return out;
}

function buildMonogram(n: number, rnd: () => number): Cloud {
  const out = new Float32Array(n * 3);
  const areas = SHAPES_JT.map(shapeArea);
  const total = areas.reduce((a, b) => a + b, 0);
  // Cumulative area, so a single random draw picks a shape with probability
  // proportional to its size and the letter has even density throughout.
  const cume: number[] = [];
  let acc = 0;
  for (const a of areas) {
    acc += a / total;
    cume.push(acc);
  }
  for (let i = 0; i < n; i++) {
    const pick = rnd();
    let s = SHAPES_JT.length - 1;
    for (let k = 0; k < cume.length; k++) {
      if (pick <= cume[k]) {
        s = k;
        break;
      }
    }
    const [x, y] = samplePoint(SHAPES_JT[s], rnd);
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    // Shallow depth rather than zero: a flat plate loses the object's volume at
    // the exact moment it is meant to feel like it has arrived somewhere.
    out[i * 3 + 2] = (rnd() - 0.5) * 0.1;
  }
  return out;
}

export type Layouts = Record<LayoutName, Cloud>;

/** Build all five arrangements once, at mount. */
export function buildLayouts(n: number = CORE_COUNT, seed: number = CORE_SEED): Layouts {
  // One generator per arrangement, each with its own derived seed, so adding an
  // arrangement later cannot change the ones before it.
  return {
    seed: buildSeed(n, mulberry32(seed ^ 0x11)),
    expand: buildExpand(n, mulberry32(seed ^ 0x22)),
    lattice: buildLattice(n, mulberry32(seed ^ 0x33)),
    route: buildRoute(n, mulberry32(seed ^ 0x44)),
    monogram: buildMonogram(n, mulberry32(seed ^ 0x55)),
  };
}

/* =========================================================================
 * Edges.
 * ======================================================================= */

export interface Edge {
  a: number;
  b: number;
}

/**
 * Short connections within the lattice, computed once.
 *
 * O(n^2) on 560 points is about 157k distance tests, which happens once at mount
 * and costs under a millisecond. Doing it per frame would be indefensible;
 * doing it once, to get honest nearest-neighbour structure instead of arbitrary
 * lines, is free. Each edge is stored with a < b so the dedupe is trivial.
 */
export function latticeEdges(cloud: Cloud, n: number, radius = 0.2, cap = 700): Edge[] {
  const edges: Edge[] = [];
  const r2 = radius * radius;
  for (let i = 0; i < n && edges.length < cap; i++) {
    for (let j = i + 1; j < n && edges.length < cap; j++) {
      const dx = cloud[i * 3] - cloud[j * 3];
      const dy = cloud[i * 3 + 1] - cloud[j * 3 + 1];
      const dz = cloud[i * 3 + 2] - cloud[j * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 <= r2) edges.push({ a: i, b: j });
    }
  }
  return edges;
}

/* =========================================================================
 * Interpolation.
 * ======================================================================= */

export interface LayoutBlend {
  from: LayoutName;
  to: LayoutName;
  /** Eased, so arrivals settle rather than stop dead. */
  t: number;
  /** Index of the `from` stop, for callers that key other behaviour off it. */
  segment: number;
}

/** Which two arrangements the object is between, at overall progress u. */
export function layoutAt(u: number): LayoutBlend {
  const p = clamp01(u);
  for (let i = 0; i < LAYOUT_STOPS.length - 1; i++) {
    const a = LAYOUT_STOPS[i];
    const b = LAYOUT_STOPS[i + 1];
    if (p <= b || i === LAYOUT_STOPS.length - 2) {
      return {
        from: LAYOUT_ORDER[i],
        to: LAYOUT_ORDER[i + 1],
        t: easeInOutCubic(inverseLerp(a, b, p)),
        segment: i,
      };
    }
  }
  return { from: "route", to: "monogram", t: 1, segment: LAYOUT_STOPS.length - 2 };
}

/**
 * Write the blended cloud into `target`.
 *
 * Writes into a caller-owned buffer instead of returning a new one: this runs
 * every frame, and allocating a 1680-element Float32Array 60 times a second is
 * how a smooth page acquires a sawtooth garbage-collection profile.
 */
export function blendInto(target: Cloud, from: Cloud, to: Cloud, t: number, n: number): void {
  for (let i = 0; i < n * 3; i++) {
    target[i] = from[i] + (to[i] - from[i]) * t;
  }
}

/** How visible the wiring is, per arrangement. Only the lattice is wired. */
export function edgeOpacity(u: number): number {
  const b = layoutAt(u);
  if (b.from === "expand" && b.to === "lattice") return b.t;
  if (b.from === "lattice" && b.to === "route") return 1 - b.t;
  return b.from === "lattice" ? 1 : 0;
}
