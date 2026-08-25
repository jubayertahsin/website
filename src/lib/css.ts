/* ---------------------------------------------------------------------------
 * lib/css.ts
 *
 * React's CSSProperties type does not admit custom properties, so every place
 * that sets `--i` needs a cast. One helper, so there is one cast in the codebase
 * rather than fifty.
 * ------------------------------------------------------------------------- */

import type { CSSProperties } from "react";

export function vars(values: Record<string, string | number | undefined>): CSSProperties {
  return values as CSSProperties;
}

/** Join class names, dropping anything falsy. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
