"use client";

/* ---------------------------------------------------------------------------
 * Loader — the first four hundred milliseconds.
 *
 * A loader is a promise that something is happening. Most of them lie: a bar
 * eased from 0 to 100 over a fixed duration, a percentage counted by a timer, a
 * spinner that spins identically whether the work took 40ms or four seconds.
 * The reader cannot tell the difference, which is precisely why it is a lie
 * worth avoiding on a site whose whole argument is that its claims are checked.
 *
 * So this reports three things that are genuinely observable:
 *
 *   Document   this effect running at all means React mounted and hydrated.
 *   Typefaces  `document.fonts.ready` settled. Two families have to arrive
 *              before a single line box on the page is measured correctly.
 *   Motion     the scroll store published a frame with a real viewport height,
 *              which means Lenis is stepping and GSAP's ticker is alive.
 *
 * Three, not ten, because those are the three that exist. The rule fills in
 * thirds, and each third corresponds to something that actually finished.
 *
 * TWO TIME BOUNDS, both defensive rather than decorative:
 *
 *   MIN_MS   a floor, so that on a warm cache — where all three land inside one
 *            frame — the loader is not a single-frame flash. A flash is worse
 *            than no loader: the reader registers something happened and cannot
 *            say what.
 *   MAX_MS   a ceiling, so a font CDN that hangs can never trap the reader
 *            behind an overlay. `document.fonts.ready` does settle on failure,
 *            but "settles on failure" and "settles promptly" are different
 *            promises, and only one of them is being made here.
 *
 * NO-SCRIPT is handled in layout.tsx, which hides `.ldr` inside a <noscript>
 * <style>. Without that, a reader with JavaScript off gets an overlay with no
 * code running to remove it — the entire site behind a permanent black screen.
 *
 * REDUCED MOTION. The glyph entrance is a CSS animation, so the media query in
 * globals.css neutralises it without this component knowing. Only the exit is
 * driven by Framer Motion — an unmount sequence is React state, which is the one
 * job §37 assigns it — and its duration is read from a ref captured at mount.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { person } from "@/data/portfolio";
import { lockScroll, unlockScroll, subscribe } from "@/lib/scroll-store";
import { prefersReducedMotion } from "@/lib/env";
import { vars } from "@/lib/css";

const DOCUMENT = 1;
const TYPEFACES = 2;
const MOTION = 4;
const ALL = DOCUMENT | TYPEFACES | MOTION;

/**
 * The three observable milestones, in the order they are expected to land —
 * though each one is lit by its OWN bit, not by its position, because a warm
 * font cache reports Typefaces before Motion and a cold one does the reverse.
 * Lighting the first N labels would show the wrong two on one of those paths.
 */
const STEPS = [
  { label: "Document", bit: DOCUMENT },
  { label: "Typefaces", bit: TYPEFACES },
  { label: "Motion", bit: MOTION },
] as const;

/** Floor on visible time, so a warm cache does not produce a one-frame flash. */
const MIN_MS = 420;
/** Ceiling, so a stalled font request cannot hold the page hostage. */
const MAX_MS = 2500;
/** A beat at three-thirds, so the completed state is legible before the exit. */
const SETTLE_MS = 180;

export default function Loader() {
  const [done, setDone] = useState(0);
  const [gone, setGone] = useState(false);
  const started = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    started.current = performance.now();
    reduced.current = prefersReducedMotion();
    lockScroll();

    // `done` is a bitmask rather than a count because the milestones can land in
    // any order — a warm font cache reports Typefaces before Motion — and OR-ing
    // a bit is idempotent, so a double-fire cannot push the total past three.
    const mark = (bit: number) => setDone((prev) => prev | bit);

    // Milestone 1. Not a claim about the future: this line executing IS the fact.
    mark(DOCUMENT);

    // Milestone 2.
    if ("fonts" in document) {
      document.fonts.ready.then(() => mark(TYPEFACES)).catch(() => mark(TYPEFACES));
    } else {
      mark(TYPEFACES);
    }

    // Milestone 3. `subscribe` replays the current frame synchronously, and at
    // mount that frame still holds the module's zeroed defaults — hence the
    // `viewport > 0` test, which is only true once SmoothScroll has measured.
    // `settled` guards the synchronous replay, where `off` is not yet assigned.
    let settled = false;
    const off = subscribe((frame) => {
      if (settled || frame.viewport <= 0) return;
      settled = true;
      mark(MOTION);
    });
    if (settled) off();

    const ceiling = window.setTimeout(() => mark(ALL), MAX_MS);

    return () => {
      window.clearTimeout(ceiling);
      off();
      // If the loader is torn down before it finished — a fast route change, or
      // React's development double-mount — the page must not be left frozen.
      unlockScroll();
    };
  }, []);

  useEffect(() => {
    if (done !== ALL) return;
    const elapsed = performance.now() - started.current;
    const wait = Math.max(0, MIN_MS - elapsed) + SETTLE_MS;
    const id = window.setTimeout(() => setGone(true), wait);
    return () => window.clearTimeout(id);
  }, [done]);

  useEffect(() => {
    if (gone) unlockScroll();
  }, [gone]);

  const reached = ((done & DOCUMENT) ? 1 : 0) + ((done & TYPEFACES) ? 1 : 0) + ((done & MOTION) ? 1 : 0);

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="ldr"
          initial={false}
          // The overlay does not slide or scale away. It lifts, and the page is
          // already behind it in its finished state, so the transition is a
          // dissolve between two composed frames rather than a curtain trick.
          exit={{ opacity: 0 }}
          transition={{
            duration: reduced.current ? 0 : 0.62,
            ease: [0.76, 0, 0.24, 1],
          }}
        >
          <div className="ldr-in">
            {/* The monogram, in the display serif at display size. Nothing else
                competes with it: no logo, no tagline, no "loading" verb. */}
            <p className="ldr-mark" aria-hidden="true">
              {person.monogram.split("").map((glyph, i) => (
                <span key={i} className="ldr-glyph" style={vars({ "--i": i })}>
                  {glyph}
                </span>
              ))}
            </p>

            {/* The rule fills in thirds. Its width is the same hairline that
                becomes the scroll progress rail once the page is live, which is
                the first hint that the whole site is one continuous instrument. */}
            <div className="ldr-rule" aria-hidden="true">
              <span
                className="ldr-rule-fill"
                style={vars({ "--fill": reached / STEPS.length })}
              />
            </div>

            {/* The ledger. Each label dims until its own milestone is in. */}
            <ul className="ldr-steps" aria-hidden="true">
              {STEPS.map((step) => (
                <li
                  key={step.label}
                  className="ldr-step label"
                  data-in={done & step.bit ? "1" : "0"}
                >
                  {step.label}
                </li>
              ))}
            </ul>

            {/* One announcement, not three. A screen reader does not need the
                instrument panel; it needs to know whether to wait. */}
            <p className="sr-only" role="status">
              {done === ALL ? "Ready" : "Loading"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
