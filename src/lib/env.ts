/* ---------------------------------------------------------------------------
 * lib/env.ts — what the device is willing to do.
 *
 * Every function here is safe to call during a server render: they all check for
 * `window` first and return the CONSERVATIVE answer when it is missing. That
 * direction matters. If `prefersReducedMotion()` guessed `false` on the server
 * and the client then said `true`, the markup would differ between the two and
 * React would throw a hydration error. Guessing "reduce motion, no custom
 * cursor" server-side means the first paint is the calm version and the
 * enhancement arrives after mount, which is the right order anyway.
 * ------------------------------------------------------------------------- */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
export const DESKTOP_QUERY = "(min-width: 1024px)";

function matches(query: string, fallback: boolean): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return fallback;
  return window.matchMedia(query).matches;
}

/** Assumed true on the server, so the quiet version renders first. */
export function prefersReducedMotion(): boolean {
  return matches(REDUCED_MOTION_QUERY, true);
}

/**
 * A real pointer, not a finger.
 *
 * Everything gated on this, the custom cursor, magnetic buttons, the pointer as
 * a second decryption key, is meaningless on a touchscreen: there is no hover
 * state to enter and no cursor to replace. Assumed false on the server.
 */
export function hasFinePointer(): boolean {
  return matches(FINE_POINTER_QUERY, false);
}

export function isDesktop(): boolean {
  return matches(DESKTOP_QUERY, false);
}

/**
 * Subscribe to a media query. Returns an unsubscribe function.
 *
 * Fires once immediately, because the caller almost always needs the current
 * value as well as future ones, and a listener that only reports changes leaves
 * the first render wrong until the user rotates their phone.
 */
export function watchMedia(query: string, onChange: (matches: boolean) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mql = window.matchMedia(query);
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);
  onChange(mql.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}

/**
 * A rough capability signal, used to decide how many points the signature object
 * draws and whether the grain overlay runs.
 *
 * `deviceMemory` is non-standard and absent in Safari and Firefox, so the
 * fallback has to be sane rather than pessimistic: assume a capable device and
 * step down only on evidence. Downgrading everyone because a browser declines to
 * report its RAM would punish the majority for a privacy feature.
 */
export function isLowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2) {
    return true;
  }
  return false;
}

/** Device pixel ratio, capped. Above 2 the extra pixels cost more than they show. */
export function pixelRatio(cap = 2): number {
  if (typeof window === "undefined") return 1;
  return Math.min(cap, Math.max(1, window.devicePixelRatio || 1));
}
