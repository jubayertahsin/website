/* ---------------------------------------------------------------------------
 * lib/math.ts — pure scalar helpers.
 *
 * Everything here is deterministic and side-effect free, which is the point:
 * tools/test_lib.ts runs this file directly under node's TypeScript stripping,
 * so these functions are tested rather than trusted.
 * ------------------------------------------------------------------------- */

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Where v sits between a and b, clamped. Returns 0 when a === b. */
export function inverseLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return clamp01((v - a) / (b - a));
}

export function mapRange(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, v));
}

/* ---- easing ------------------------------------------------------------- */
/* All of these are clamped at the ends and monotonic in between. The tests
 * assert both, because an easing curve that overshoots is how a "subtle" reveal
 * ends up flickering at the boundary of a ScrollTrigger. */

export function easeOutCubic(t: number): number {
  t = clamp01(t);
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutQuart(t: number): number {
  t = clamp01(t);
  return 1 - Math.pow(1 - t, 4);
}

/** Hermite smoothstep between two edges. */
export function smoothstep(edge0: number, edge1: number, v: number): number {
  const t = inverseLerp(edge0, edge1, v);
  return t * t * (3 - 2 * t);
}

/* ---- damping ------------------------------------------------------------ */

/**
 * Frame-rate independent exponential approach.
 *
 * The naive `current += (target - current) * 0.1` runs more than twice as fast
 * on a 144Hz display as on a 60Hz one, so the same page feels different on
 * different hardware. Raising the retention to the power of elapsed frames fixes
 * it, and dt is clamped so a backgrounded tab returning after nine seconds takes
 * one ordinary step instead of teleporting.
 */
export function dampFactor(lerpAmount: number, dt: number): number {
  const step = clamp(dt, 0, 0.1) * 60;
  return 1 - Math.pow(1 - clamp01(lerpAmount), step);
}

/* ---- deterministic randomness ------------------------------------------ */

/**
 * mulberry32. Seeded so that the signature core draws the same cloud on every
 * load and in every browser: a "random" point field that differs per reload
 * cannot be art-directed, and cannot be tested either.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
