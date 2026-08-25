/* ---------------------------------------------------------------------------
 * lib/hash.ts
 *
 * One integer hash, used by the decryption to derive a per-character threshold
 * from that character's own line and column. Math.imul rather than `*` because
 * plain multiplication of two 32-bit values silently loses precision past 2^53,
 * and a hash that loses low bits stops being well spread exactly where it
 * matters.
 * ------------------------------------------------------------------------- */

/** Deterministic, unsigned, well spread over the low bits. */
export function h32(a: number, b: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

/** h32 folded to the unit interval, for thresholds and jitter. */
export function h01(a: number, b: number): number {
  return h32(a, b) / 4294967296;
}
