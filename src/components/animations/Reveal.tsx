/* ---------------------------------------------------------------------------
 * Reveal / Parallax — two server components with no JavaScript in them at all.
 *
 * Both read `--e` or `--p` from the nearest ancestor Scene, through ordinary CSS
 * custom property inheritance. That is the payoff of putting progress on the
 * section: a reveal costs one class and zero bytes of script, and there is no
 * `IntersectionObserver`, no ref, no effect, and nothing to clean up.
 *
 * `index` and `total` stagger a list. The delay is computed in CSS from `--i` and
 * `--n` exactly as it is for split text, so a twelve-item list still animates
 * from the single style write its parent scene already performs.
 * ------------------------------------------------------------------------- */

import type { ReactNode } from "react";
import { vars, cx } from "@/lib/css";

type Tag = "div" | "span" | "li" | "p" | "figure" | "header" | "footer";

export interface RevealProps {
  as?: Tag;
  className?: string;
  /** Position in a staggered group. */
  index?: number;
  /** Size of that group. Required for the stagger to mean anything. */
  total?: number;
  /** 0 for "all together", up to ~0.7 before it reads as a wave. */
  stagger?: number;
  children: ReactNode;
}

export default function Reveal({
  as = "div",
  className,
  index,
  total,
  stagger = 0.45,
  children,
}: RevealProps) {
  const Tag = as;
  const staggered = typeof index === "number" && typeof total === "number" && total > 1;
  return (
    <Tag
      className={cx("reveal", className)}
      style={
        staggered
          ? vars({ "--i": index, "--n": total, "--stagger": stagger })
          : undefined
      }
    >
      {children}
    </Tag>
  );
}
