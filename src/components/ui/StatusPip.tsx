/* ---------------------------------------------------------------------------
 * StatusPip — a project's state, in form rather than in colour.
 *
 * There are three states and exactly one accent colour on this page, so the pip
 * distinguishes them by SHAPE: filled means running, an open ring means being
 * worked on now, a dashed ring means experimental. That is not a compromise
 * forced by the palette; it is better. A red / amber / green legend has to be
 * learned, ranks the states against each other, and disappears entirely for the
 * eight percent of men with a colour vision deficiency.
 *
 * The word is always printed next to the mark, so the mark is decorative and
 * hidden from assistive technology rather than being the only carrier of the
 * information. If the pip were the only signal, this component would be a bug.
 * ------------------------------------------------------------------------- */

import type { StatusTone } from "@/data/portfolio";
import { cx } from "@/lib/css";

export interface StatusPipProps {
  tone: StatusTone;
  /** The status text exactly as authored. Never abbreviated here. */
  children: string;
  className?: string;
}

export default function StatusPip({ tone, children, className }: StatusPipProps) {
  return (
    <span className={cx("status", className)}>
      <span className="pip" data-tone={tone} aria-hidden="true" />
      <span className="status-text label">{children}</span>
    </span>
  );
}
