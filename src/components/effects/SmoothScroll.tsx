"use client";

/* ---------------------------------------------------------------------------
 * SmoothScroll — Lenis, GSAP and the store, wired together once.
 *
 * Three things share one clock, and the wiring order is the whole point:
 *
 *   1. GSAP's ticker is the ONLY animation loop on the page. Lenis is stepped
 *      from it rather than running its own requestAnimationFrame. Two loops means
 *      two frames of latency between the scroll position Lenis believes in and
 *      the position ScrollTrigger measured against, and that shows up as pinned
 *      sections lagging a frame behind the content moving past them.
 *
 *   2. ScrollTrigger.update is called on every Lenis scroll event, because Lenis
 *      moves the page by transforming it, not by changing scrollTop, so
 *      ScrollTrigger's own scroll listener would see nothing.
 *
 *   3. lagSmoothing(0) is off. GSAP's default behaviour, when a frame takes too
 *      long, is to pretend less time passed than really did, so animations do not
 *      lurch. That is right for tweens and wrong for a scrubber: it would
 *      desynchronise position from scroll, and everything here is a pure function
 *      of scroll position.
 *
 * On touch devices Lenis is deliberately NOT allowed to intercept the gesture.
 * Native momentum on iOS is better than anything a library can synthesise, and
 * hijacking it produces the rubbery, slightly-behind feeling that makes a phone
 * visit feel worse than a desktop one. So this smooths the wheel and leaves
 * fingers alone.
 * ------------------------------------------------------------------------- */

import { useEffect } from "react";
import Lenis from "lenis";
import { ensureGsap, ScrollTrigger } from "@/lib/gsap";
import { bindControls, publish } from "@/lib/scroll-store";
import { pageProgress } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/env";

/**
 * Renders nothing. It is mounted as a sibling of the page rather than as a
 * wrapper around it, because wrapping would put the entire page inside a client
 * component and forfeit server rendering for every section below it. This way the
 * only thing in the client bundle is the wiring.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const gsap = ensureGsap();

    /* --- reduced motion: no smoothing, but the store still publishes -------
     * The signature object and the progress rail read scroll position from the
     * store. If the store went silent under reduced motion they would freeze at
     * their initial state, which is worse than showing the correct state without
     * easing. So this path keeps publishing; it just publishes the real scroll
     * position instead of a smoothed one. */
    if (prefersReducedMotion()) {
      let raf = 0;
      let queued = false;
      const emit = () => {
        queued = false;
        const scroll = window.scrollY;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        publish({
          scroll,
          viewport: window.innerHeight,
          maxScroll,
          progress: pageProgress(scroll, maxScroll),
          velocity: 0,
          dt: 1 / 60,
          time: performance.now(),
        });
      };
      const onScroll = () => {
        if (queued) return;
        queued = true;
        raf = requestAnimationFrame(emit);
      };
      emit();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", emit);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", emit);
      };
    }

    const lenis = new Lenis({
      // Lerp rather than duration: duration-based smoothing always takes the same
      // time to arrive regardless of distance, so a small flick feels sluggish and
      // a long drag feels rushed. Lerp is proportional, which is what the hand
      // expects. 0.085 is slow enough to feel deliberate and fast enough that the
      // page never feels like it is arguing with you.
      lerp: 0.085,
      smoothWheel: true,
      // Fingers keep native momentum. See the note above.
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
    });

    let viewport = window.innerHeight;
    const measure = () => {
      viewport = window.innerHeight;
    };

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);

    const tick = (time: number, deltaTime: number) => {
      lenis.raf(time * 1000);
      const maxScroll = lenis.limit;
      publish({
        scroll: lenis.scroll,
        viewport,
        maxScroll,
        progress: pageProgress(lenis.scroll, maxScroll),
        velocity: lenis.velocity,
        dt: Math.min(0.1, deltaTime / 1000),
        time: time * 1000,
      });
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    window.addEventListener("resize", measure);
    ScrollTrigger.addEventListener("refresh", measure);

    bindControls({
      scrollTo: (target, opts) =>
        lenis.scrollTo(target, {
          offset: opts?.offset ?? 0,
          immediate: opts?.immediate ?? false,
          // Slightly slower than the wheel lerp, because a jump the reader did
          // not perform themselves needs longer to stay legible.
          duration: 1.15,
        }),
      stop: () => lenis.stop(),
      start: () => lenis.start(),
    });

    // Fonts land after first paint and change every line box on the page, which
    // invalidates every measurement GSAP took. Without this, pinned sections are
    // measured against the fallback font's metrics and end a few dozen pixels off.
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    return () => {
      bindControls(null);
      lenis.off("scroll", onLenisScroll);
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", measure);
      ScrollTrigger.removeEventListener("refresh", measure);
      lenis.destroy();
    };
  }, []);

  return null;
}
