/* ---------------------------------------------------------------------------
 * lib/motion.ts — the arithmetic behind the choreography, with no DOM in sight.
 *
 * Components measure, these functions calculate, components write. Nothing here
 * touches `window`, which is the only reason any of it can be verified in a
 * terminal rather than taken on trust.
 *
 * A note on a bug that is not in this file because of what is: the natural way
 * to ask "how far through this tall section am I" divides by `height - viewport`.
 * For the last section on a page that denominator is a lie, because the document
 * runs out of scroll before the section does. Progress then tops out around 0.88
 * and everything keyed above that, the final arrangement, the last line of copy,
 * the nav's exit, becomes literally unreachable. It reads as a design that gives
 * up two thirds of the way through its own ending, and it cost a long evening to
 * find the first time.
 *
 * This build does not recompute that by hand. `use-scene.ts` hands the problem
 * to GSAP's `clamp()` prefix, which exists precisely for it. The lesson is
 * recorded here so nobody optimises the clamp away later.
 * ------------------------------------------------------------------------- */

import { clamp01, easeOutQuart } from "./math";

/** Whole-document progress. Drives the signature object and the progress rail. */
export function pageProgress(scroll: number, maxScroll: number): number {
  if (maxScroll <= 0) return 0;
  return clamp01(scroll / maxScroll);
}

/**
 * The eased companion to raw progress.
 *
 * Every scene publishes both. `--p` is for anything that must stay exactly
 * linear in scroll: the signature object's arrangement, the decryption, a
 * horizontal rail that must not drift out from under the reader's finger. `--e`
 * is for the things that should feel like they settle, which is most reveals.
 * Two variables rather than one, because using an eased value where a linear one
 * belongs produces motion that is neither honest nor comfortable, and it is the
 * reason a lot of scroll sites feel slightly seasick.
 */
export function eased(p: number): number {
  return easeOutQuart(p);
}

/**
 * Quantise a millisecond clock into churn ticks for the scrambled glyphs.
 *
 * They have to change, or they read as typos rather than as noise, but they must
 * not change every frame or the line becomes unreadable static. Around twelve
 * changes a second is where it looks alive and stays legible.
 */
export function churnTick(nowMs: number, hz = 12): number {
  return Math.floor((nowMs / 1000) * hz);
}

/**
 * Round so a value is only written to the DOM when it visibly changed.
 *
 * Setting a custom property invalidates style for the whole subtree whether or
 * not the value actually differs, so writing 0.4173926 and then 0.4173931 buys a
 * full style recalculation for a change no display can resolve. Three decimals
 * is finer than any screen can show for an opacity or a percentage translate.
 */
export function q3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * How far a horizontal rail has travelled, in pixels.
 *
 * Returns a NEGATIVE value so the caller writes it straight into a transform
 * without having to remember a sign convention.
 */
export function railOffset(p: number, trackWidth: number, viewportWidth: number): number {
  return -clamp01(p) * Math.max(0, trackWidth - viewportWidth);
}

/**
 * Which of `count` panels is currently centred on the rail.
 *
 * Derived from the same progress value as `railOffset`, deliberately, so the
 * "03 / 05" indicator cannot drift out of agreement with what is on screen. Two
 * independent calculations of the same fact is how a counter ends up one ahead.
 */
export function railIndex(p: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(clamp01(p) * (count - 1))));
}

/**
 * Progress within one slice of a longer timeline.
 *
 * A pinned scene often needs several things to happen in sequence: the label
 * arrives over the first fifth, the statement decrypts over the middle, the
 * diagram assembles at the end. Rather than three scroll triggers on one
 * element, the scene publishes one progress value and each part reads its own
 * window out of it.
 */
export function slice(p: number, from: number, to: number): number {
  if (to <= from) return p >= to ? 1 : 0;
  return clamp01((p - from) / (to - from));
}
