/* ---------------------------------------------------------------------------
 * lib/decrypt.ts — the signature interaction, as pure functions.
 *
 * A statement arrives as scrambled glyphs and resolves into language as you
 * scroll. The thing that makes it feel engineered rather than decorative:
 *
 *   IT IS KEYED TO SCROLL POSITION, NOT TO ELAPSED TIME.
 *
 * Each character's reveal threshold is derived from a hash of its own line and
 * column, so a given scroll position always shows exactly the same state. Scroll
 * back up and the sentence re-encrypts to precisely what it looked like on the
 * way down. A timer-based effect cannot do that: it resolves once and any
 * reversal is an approximation. The test file asserts the exactness by comparing
 * the state at p = 0.4 reached from below, from above, and cold.
 *
 * The pointer is a SECOND key. Characters near it resolve early, with a squared
 * falloff so the influence is a soft pool rather than a hard circle. On a device
 * with no pointer that term is simply zero and the scroll key carries it alone.
 *
 * None of this file touches the DOM, which is why it can be tested at all.
 * ------------------------------------------------------------------------- */

import { clamp01, inverseLerp } from "./math";
import { h32 } from "./hash";

/**
 * Exactly 32 glyphs, and the count is load-bearing: log2(32) is 5, so the
 * readout can honestly say "5.00 bits per character" and fall to 0.00 as the
 * line resolves. Deliberately contains no letters and no full stops, so a
 * scrambled cell can never be mistaken for real text mid-reveal.
 */
export const ALPHA = "#$%&*+-/<=>?@[]^_{|}~!0123456789";

/** log2(ALPHA.length). Asserted in the tests rather than hardcoded on faith. */
export const BITS = Math.log2(ALPHA.length);

/** Reveal happens in this many scattered passes, so it never looks like a wipe. */
export const ROUNDS = 8;

/**
 * The slice of the section's progress the reveal occupies. It starts late and
 * finishes early on purpose: the reader needs a beat of stillness to notice the
 * text is scrambled before it starts resolving, and a beat afterwards to read
 * the finished sentence before the section leaves.
 */
export const WINDOW: readonly [number, number] = [0.12, 0.8];

/** Pointer influence radius in CSS pixels, and how much of a round it forgives. */
export const POINTER_RADIUS = 132;
export const POINTER_BIAS = 0.17;

export interface Cell {
  /** Index of the line this cell belongs to. */
  line: number;
  /** Column within that line. */
  col: number;
  /** The real character. Never mutated. */
  ch: string;
  /** Whitespace is structural: never scrambled, never counted as resolvable. */
  space: boolean;
  /** Progress in [0,1] at which this cell resolves. */
  thr: number;
}

/**
 * Turn plain lines into cells with thresholds.
 *
 * The two hashes are salted differently so that the round a character lands in
 * and its position within that round are independent. Without that, every
 * character in a column resolves together and the reveal reads as a column wipe.
 */
export function planLines(lines: readonly string[]): Cell[][] {
  return lines.map((text, line) => {
    const cells: Cell[] = [];
    for (let col = 0; col < text.length; col++) {
      const ch = text.charAt(col);
      const space = ch === " " || ch === "\n" || ch === "\t";
      const ha = h32(line * 131 + 17, col * 977 + 7);
      const hb = h32(col * 31 + 5, line * 613 + 11);
      // Which of the eight rounds, plus where inside it. Divided by ROUNDS so
      // the result spans [0,1) with eight visible clusters.
      const thr = space ? 0 : ((ha % ROUNDS) + (hb % 1000) / 1000) / ROUNDS;
      cells.push({ line, col, ch, space, thr });
    }
    return cells;
  });
}

/** Section progress mapped into the reveal window. */
export function windowProgress(p: number): number {
  return inverseLerp(WINDOW[0], WINDOW[1], p);
}

/**
 * Pointer contribution for one cell, in threshold units.
 *
 * Squared falloff, so influence fades from the middle outward rather than
 * stopping at an edge the reader can see. Returns 0 when there is no pointer.
 */
export function pointerRelief(
  cellX: number,
  cellY: number,
  pointerX: number | null,
  pointerY: number | null,
): number {
  if (pointerX === null || pointerY === null) return 0;
  const dx = cellX - pointerX;
  const dy = cellY - pointerY;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= POINTER_RADIUS) return 0;
  const near = 1 - d / POINTER_RADIUS;
  return POINTER_BIAS * near * near;
}

/** Has this cell resolved, at this progress, with this much pointer relief? */
export function isResolved(cell: Cell, p: number, relief = 0): boolean {
  if (cell.space) return true;
  return windowProgress(p) + relief >= cell.thr;
}

/**
 * The glyph to draw for an unresolved cell.
 *
 * Churn is the one thing here that is keyed to a clock rather than to scroll,
 * because a scrambled character that never changes reads as a typo rather than
 * as noise. `tick` is quantised by the caller and frozen while the page is
 * still, so a stationary reader sees a stable frame rather than a jittering one.
 */
export function scrambleGlyph(cell: Cell, tick: number): string {
  const i = h32(cell.line * 7919 + cell.col, tick | 0) % ALPHA.length;
  return ALPHA.charAt(i);
}

export interface Readout {
  /** 0 through ROUNDS. Displayed as "03 / 08". */
  round: number;
  resolved: number;
  total: number;
  /** Bits per character still unresolved. Falls from BITS to 0. */
  entropy: number;
  /** Four bytes derived from the round, shown as hex. Decorative, but real. */
  key: string[];
}

/**
 * A readout of work the page is actually doing.
 *
 * Every number here is computed from the same state that drives the glyphs, so
 * it reports rather than decorates. That distinction is the whole reason it is
 * allowed on the page: a progress display that is not connected to anything is
 * exactly the kind of fake instrumentation this build refuses elsewhere.
 */
export function readout(lines: readonly Cell[][], p: number): Readout {
  const pw = clamp01(windowProgress(p));
  let total = 0;
  let resolved = 0;
  for (const line of lines) {
    for (const cell of line) {
      if (cell.space) continue;
      total++;
      if (pw >= cell.thr) resolved++;
    }
  }
  const remaining = total === 0 ? 0 : 1 - resolved / total;
  const round = Math.min(ROUNDS, Math.ceil(pw * ROUNDS));
  const key: string[] = [];
  for (let i = 0; i < 4; i++) {
    key.push((h32(round * 2654435761, i * 40503 + 1) & 0xff).toString(16).padStart(2, "0"));
  }
  return {
    round,
    resolved,
    total,
    entropy: remaining * BITS,
    key,
  };
}
