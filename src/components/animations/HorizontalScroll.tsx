"use client";

/* ---------------------------------------------------------------------------
 * HorizontalScroll — the pinned lateral rail.
 *
 * Vertical scrolling reads as argument: one thing after another, building. Lateral
 * travel reads as survey: a set of things that sit beside each other as peers.
 * The project case studies are peers, so they move sideways. That is the entire
 * justification, and it is why this appears once on the page rather than twice.
 *
 * Three things this gets right that pinned rails usually get wrong:
 *
 * VERTICAL IS THE DEFAULT, NOT THE FALLBACK. The server renders a plain vertical
 * stack, and the rail is switched on after mount only when the viewport is wide
 * enough and motion is welcome. So the no-JavaScript version is a readable column
 * rather than a row clipped at the right edge, and there is no hydration mismatch
 * because the markup is identical either way. Only a data attribute changes.
 *
 * THE MOVEMENT IS LINEAR IN SCROLL. Easing a rail means the panels drift out from
 * under the reader's hand, which feels like the page is dragging them. `--p` is
 * used here, never `--e`.
 *
 * KEYBOARD FOCUS MOVES THE PAGE. A pinned rail translated by transform is the
 * classic accessibility trap: tabbing to a link in panel four moves focus
 * somewhere off-screen and the viewport does not follow, because from the
 * browser's point of view nothing scrolled. So focus entering a panel scrolls the
 * document to the position where that panel is centred. Tab through the rail and
 * it advances, which is the behaviour a sighted keyboard user has every right to
 * expect.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, type ReactNode } from "react";
import { ensureGsap, ScrollTrigger } from "@/lib/gsap";
import { railIndex, railOffset, q3 } from "@/lib/motion";
import { isDesktop, prefersReducedMotion, watchMedia, DESKTOP_QUERY } from "@/lib/env";
import { scrollTo } from "@/lib/scroll-store";
import { cx } from "@/lib/css";

export interface HorizontalScrollProps {
  id?: string;
  className?: string;
  /** Number of panels, used for the index readout and focus targeting. */
  count: number;
  /** Rendered above the rail and pinned with it. */
  header?: ReactNode;
  children: ReactNode;
  "aria-label"?: string;
}

export default function HorizontalScroll({
  id,
  className,
  count,
  header,
  children,
  ...aria
}: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const indexRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let st: ScrollTrigger | null = null;

    const teardown = () => {
      st?.kill();
      st = null;
      track.style.transform = "";
      section.dataset.mode = "v";
      section.style.removeProperty("--p");
    };

    const build = () => {
      teardown();
      if (!isDesktop() || prefersReducedMotion()) return;

      ensureGsap();
      section.dataset.mode = "h";

      const distance = () => Math.max(1, track.scrollWidth - window.innerWidth);
      let lastIndex = -1;

      const write = (p: number) => {
        track.style.transform = `translate3d(${railOffset(p, track.scrollWidth, window.innerWidth)}px, 0, 0)`;
        section.style.setProperty("--p", String(q3(p)));
        const i = railIndex(p, count);
        if (i !== lastIndex) {
          lastIndex = i;
          if (indexRef.current) {
            indexRef.current.textContent = String(i + 1).padStart(2, "0");
          }
          // Panels announce themselves so CSS can lift the active one without
          // JavaScript touching any style but the track's transform.
          const panels = track.querySelectorAll<HTMLElement>("[data-panel]");
          panels.forEach((el, k) => {
            el.dataset.active = k === i ? "1" : "0";
          });
        }
      };

      st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        // The scroll length equals the horizontal overflow, so one pixel of wheel
        // is one pixel of lateral travel. Anything else makes the rail feel
        // geared, either sluggish or twitchy.
        end: () => `+=${distance()}`,
        pin: true,
        pinSpacing: true,
        // One pixel of lookahead. Without it the pin engages a frame late at high
        // scroll speed and the section visibly jumps.
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => write(self.progress),
        onRefresh: (self) => write(self.progress),
      });

      write(st.progress);
    };

    build();

    // Rebuild on a breakpoint change rather than on every resize: crossing into
    // desktop has to construct the pin, but dragging a window a few pixels wider
    // only needs GSAP's own refresh, which it does itself.
    const stopWatching = watchMedia(DESKTOP_QUERY, () => build());

    /* --- focus follows tab ------------------------------------------------ */
    const onFocusIn = (event: FocusEvent) => {
      if (!st) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const panel = target.closest<HTMLElement>("[data-panel]");
      if (!panel) return;
      const i = Number(panel.dataset.index ?? "0");
      if (!Number.isFinite(i) || count <= 1) return;
      const span = st.end - st.start;
      scrollTo(st.start + (i / (count - 1)) * span);
    };
    section.addEventListener("focusin", onFocusIn);

    return () => {
      section.removeEventListener("focusin", onFocusIn);
      stopWatching();
      teardown();
    };
  }, [count]);

  return (
    <section
      ref={sectionRef as React.Ref<never>}
      id={id}
      className={cx("rail", className)}
      data-mode="v"
      {...aria}
    >
      <div className="rail-head">
        {header}
        <span className="rail-count label" aria-hidden="true">
          <span ref={indexRef}>01</span>
          <span className="rail-count-sep"> / </span>
          <span>{String(count).padStart(2, "0")}</span>
        </span>
      </div>
      <div className="rail-track" ref={trackRef}>
        {children}
      </div>
    </section>
  );
}
