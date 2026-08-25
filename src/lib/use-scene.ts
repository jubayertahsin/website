"use client";

/* ---------------------------------------------------------------------------
 * lib/use-scene.ts — the one way a section becomes scroll-aware.
 *
 * A scene publishes two custom properties on its element:
 *
 *   --p   raw progress, 0 to 1, exactly linear in scroll
 *   --e   the same value eased
 *
 * and CSS does the rest. That split is the whole architecture, and it is worth
 * being explicit about why it beats the obvious alternative of tweening
 * properties with GSAP:
 *
 *   ONE STYLE WRITE PER SECTION PER FRAME. A headline of forty characters
 *   staggering in costs one property write, not forty tweens, because the
 *   per-character delay is computed in CSS from --i and --n. The forty-tween
 *   version is what makes portfolio sites stutter on a mid-range phone.
 *
 *   THE PAGE IS CORRECT BEFORE THE JAVASCRIPT ARRIVES. globals.css declares
 *   `--p: 1` on :root, so every section inherits the FINISHED state until a
 *   scene overrides it. No hidden content, no flash, and with JS disabled the
 *   page is simply a well-set static document.
 *
 *   REVERSAL IS EXACT. Because the value is a pure function of scroll position
 *   rather than the output of a running animation, scrolling back up lands on
 *   precisely the state you left rather than approximately.
 *
 * GSAP still does the parts that are genuinely hard: measurement, pinning, and
 * re-measurement on resize. This hook does not tween anything, which is why
 * there is no second animation system fighting the first.
 * ------------------------------------------------------------------------- */

import { useEffect, type RefObject } from "react";
import { ensureGsap, ScrollTrigger } from "./gsap";
import { eased, q3 } from "./motion";
import { prefersReducedMotion } from "./env";

export interface SceneOptions {
  /**
   * ScrollTrigger start. Default: the element's top reaching 85% down the
   * viewport, which is where a reader's eye lands rather than at the very edge.
   */
  start?: string;
  end?: string;
  /** Pin the trigger for the duration. */
  pin?: boolean;
  /** Element that receives --p and --e. Defaults to the trigger. */
  target?: RefObject<HTMLElement | null>;
  /** Extra work per frame. Called with raw and eased progress. */
  onProgress?: (p: number, e: number) => void;
  /** Called when GSAP re-measures, e.g. after a resize or font load. */
  onRefresh?: () => void;
  /** Re-create the trigger when these change. */
  deps?: unknown[];
  /** Anticipate a pin by this many pixels. Only meaningful with pin. */
  anticipatePin?: number;
  /**
   * When false, no trigger is created and nothing is written.
   *
   * This exists for components that can either drive themselves or be driven by
   * a parent scene. Inside a pinned section an element does not move, so its own
   * ScrollTrigger would fire once and then sit at a constant progress forever;
   * such a component subscribes to the parent's channel instead and switches its
   * own scene off. The flag is here rather than in the caller because a hook has
   * to be called unconditionally.
   */
  enabled?: boolean;
}

export function useScene(
  ref: RefObject<HTMLElement | null>,
  {
    // `clamp()` is doing real work here. Without it, a scene near the bottom of
    // the document asks to scroll further than the document can, so its progress
    // tops out somewhere around 0.88 and every state keyed above that is
    // unreachable: the last layout never arrives, the closing lines never
    // finish, and it reads as a page that gives up. GSAP's clamp prefix pulls
    // the start and end inside the scrollable range instead.
    start = "clamp(top 85%)",
    end = "clamp(bottom 60%)",
    pin = false,
    target,
    onProgress,
    onRefresh,
    deps = [],
    anticipatePin = 0,
    enabled = true,
  }: SceneOptions = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const write = (p: number) => {
      const node = target?.current ?? el;
      const e = eased(p);
      node.style.setProperty("--p", String(q3(p)));
      node.style.setProperty("--e", String(q3(e)));
      onProgress?.(p, e);
    };

    if (!enabled) return;

    // Reduced motion: no trigger at all, and certainly no pin. The section is
    // pinned to its finished state and the page becomes an ordinary document.
    // This is a cheaper and more reliable guarantee than trying to make every
    // animated property behave; there is nothing left running to misbehave.
    if (prefersReducedMotion()) {
      write(1);
      return;
    }

    ensureGsap();

    const st = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      pin: pin ? el : false,
      pinSpacing: pin,
      anticipatePin: pin ? anticipatePin : 0,
      // Invalidate on refresh so a font swap or an orientation change re-measures
      // rather than animating against stale geometry.
      invalidateOnRefresh: true,
      onUpdate: (self) => write(self.progress),
      onRefresh: (self) => {
        write(self.progress);
        onRefresh?.();
      },
    });

    write(st.progress);

    return () => {
      st.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, start, end, pin, anticipatePin, enabled, ...deps]);
}
