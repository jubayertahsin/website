/* ---------------------------------------------------------------------------
 * Parallax — depth from the ancestor scene's progress, in CSS.
 *
 * `depth` is the total travel in pixels across the whole scene, positive meaning
 * the element drifts UPWARD faster than the page, which is what reads as "closer
 * to the camera". Negative drifts it down, which reads as further away.
 *
 * Kept deliberately small everywhere it is used. Parallax is a depth cue, and a
 * depth cue you consciously notice has stopped being a depth cue and become an
 * effect. Anything past about 140px on a full-height section starts to feel like
 * the layout is coming apart.
 * ------------------------------------------------------------------------- */

import type { ReactNode } from "react";
import { vars, cx } from "@/lib/css";

export interface ParallaxProps {
  depth?: number;
  className?: string;
  as?: "div" | "span" | "figure";
  children: ReactNode;
}

export default function Parallax({ depth = 80, className, as = "div", children }: ParallaxProps) {
  const Tag = as;
  return (
    <Tag className={cx("par", className)} style={vars({ "--par": depth })}>
      {children}
    </Tag>
  );
}
