"use client";

/* ---------------------------------------------------------------------------
 * ScrollProgress — the page's position, expressed twice.
 *
 * ONE: it is the single writer of `--u` on the documentElement. `--u` is progress
 * through the WHOLE document, 0 to 1, as distinct from `--p`, which every Scene
 * publishes for progress through ITSELF. Two components writing the same custom
 * property on the same node is a race that only shows up on slow machines, so
 * this is the only place in the codebase that touches it, and anything that needs
 * page-level progress in CSS reads it from here. The nav uses it to know it is no
 * longer at the top; the close uses it to know the page is ending.
 *
 * TWO: it draws a hairline. One pixel, the accent, scaled from the left. Not a
 * chunky bar, not a circular gauge with a percentage in it, and no "01 / 06"
 * counter: the reader does not need to be told which of six sections they are
 * in, they need to know roughly how much is left, which is exactly what a line
 * that grows tells them and nothing more.
 *
 * The scrollbar itself stays. Hiding it and replacing it with an indicator you
 * cannot drag is a downgrade dressed as a design decision.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/scroll-store";
import { q3 } from "@/lib/motion";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    let last = -1;

    return subscribe((frame) => {
      // Quantised to a thousandth. A hairline across a 1920px viewport cannot
      // express more than about two thousand states anyway, so anything finer is
      // a style write nobody can see.
      const u = q3(frame.progress);
      if (u === last) return;
      last = u;
      root.style.setProperty("--u", String(u));
      if (bar) bar.style.transform = `scaleX(${u})`;
    });
  }, []);

  return (
    <div className="prog" aria-hidden="true">
      <div className="prog-bar" ref={barRef} />
    </div>
  );
}
