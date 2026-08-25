"use client";

/* ---------------------------------------------------------------------------
 * CustomCursor — a dot the reader controls and a ring that follows it.
 *
 * A custom cursor is the easiest thing on a portfolio to get wrong, in exactly
 * one way: making the thing the reader is pointing WITH lag behind their hand.
 * Latency in a pointer is not style, it is a broken instrument. So there are two
 * elements and they have different jobs.
 *
 *   The DOT is exact. Zero smoothing, written to the real pointer position every
 *   frame. This is the cursor. It is what the reader aims with.
 *
 *   The RING lags, and is allowed to, because it is not aiming at anything. It is
 *   a state readout: it swells over a link, swells further and carries a word
 *   over a project, contracts on press.
 *
 * It exists on desktop only, and not because a phone has no cursor — because a
 * phone has no HOVER, and every state this thing expresses is a hover state.
 * `(hover: hover) and (pointer: fine)` is the correct test; width is not. A
 * touchscreen laptop and a mouse-driven tablet both get the right answer from it.
 *
 * THE NATIVE CURSOR IS ONLY HIDDEN ONCE THIS ONE IS PROVEN TO BE RUNNING. The
 * attribute that sets `cursor: none` is written from inside this effect. If the
 * component never mounts, if the browser refuses, if a script error kills the
 * bundle, the reader keeps the arrow they came with. A page that hides the system
 * cursor and then fails to draw its own is unusable, and it is a failure mode
 * that only ever shows up on someone else's machine.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import { ensureGsap } from "@/lib/gsap";
import { dampFactor } from "@/lib/math";
import { hasFinePointer, prefersReducedMotion } from "@/lib/env";

/** Anything hoverable gets the swell. These two get it for free, unmarked. */
const HOVER_SELECTOR = "a, button, [data-cursor]";

export default function CustomCursor() {
  // Rendered only after the client has confirmed a hovering, fine pointer. The
  // server renders nothing, the first client render renders nothing, so there is
  // no hydration mismatch and a touch device never receives this markup at all.
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(hasFinePointer() && !prefersReducedMotion());
  }, []);

  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!on) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    const gsap = ensureGsap();
    const root = document.documentElement;

    // Start off-screen rather than at 0,0. A cursor that flashes in the top-left
    // corner on load is the tell of every one of these built in an afternoon.
    let px = -100;
    let py = -100;
    let rx = -100;
    let ry = -100;
    let seen = false;
    let state = "idle";
    let text = "";

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!seen) {
        // First sighting: put the ring exactly where the dot is, so it does not
        // fly in from the corner trailing the reader's actual pointer.
        seen = true;
        rx = px;
        ry = py;
        root.dataset.cursorOn = "1";
      }
    };

    const setState = (next: string, nextText: string) => {
      if (next !== state) {
        state = next;
        ring.dataset.state = next;
        dot.dataset.state = next;
      }
      if (nextText !== text) {
        text = nextText;
        label.textContent = nextText;
      }
    };

    const resolve = (node: EventTarget | null) => {
      if (!(node instanceof Element)) return setState("idle", "");
      const target = node.closest(HOVER_SELECTOR);
      if (!target) return setState("idle", "");
      // `data-cursor` carries the word, if there is one. An unmarked link just
      // swells; a project panel says VIEW; an outbound link says OPEN. Empty is
      // a legitimate value and means "swell, say nothing".
      const marked = node.closest<HTMLElement>("[data-cursor]");
      const word = marked?.dataset.cursor?.trim() ?? "";
      setState(word ? "label" : "hover", word);
    };

    // Delegated, so a project card rendered five sections down needs no listener
    // of its own and nothing has to be re-bound when the rail rebuilds.
    const onOver = (e: PointerEvent) => resolve(e.target);
    const onOut = (e: PointerEvent) => resolve(e.relatedTarget);
    const onDown = () => {
      ring.dataset.down = "1";
      dot.dataset.down = "1";
    };
    const onUp = () => {
      ring.dataset.down = "0";
      dot.dataset.down = "0";
    };
    const onLeave = () => {
      ring.dataset.out = "1";
      dot.dataset.out = "1";
    };
    const onEnter = () => {
      ring.dataset.out = "0";
      dot.dataset.out = "0";
    };

    const tick = () => {
      if (!seen) return;
      // The dot is written unsmoothed. This is the whole design.
      dot.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      const f = dampFactor(0.19, gsap.ticker.deltaRatio(60) / 60);
      rx += (px - rx) * f;
      ry += (py - ry) * f;
      // Below a third of a pixel the ring has arrived. Bailing here means a
      // reader whose hand is still costs nothing at all, rather than two style
      // writes a frame forever.
      if (Math.abs(px - rx) < 0.34 && Math.abs(py - ry) < 0.34) {
        rx = px;
        ry = py;
      }
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);
    // The page has exactly one animation loop. This joins it rather than opening
    // a second rAF that would sit a frame out of step with the scroll.
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      // Give the arrow back. Leaving `cursor: none` behind after an unmount is
      // how a client-side route change ends with an invisible pointer.
      delete root.dataset.cursorOn;
    };
  }, [on]);

  if (!on) return null;

  return (
    <>
      {/* The ring: a zero-sized point that gets translated, with the visible
          circle and the word centred inside it as siblings. The circle scales;
          the word does not, which is why they are not nested. */}
      <div
        className="cur-ring"
        ref={ringRef}
        data-state="idle"
        data-out="0"
        data-down="0"
        aria-hidden="true"
      >
        <div className="cur-ring-in" />
        <span className="cur-label label" ref={labelRef} />
      </div>
      <div
        className="cur-dot"
        ref={dotRef}
        data-state="idle"
        data-out="0"
        data-down="0"
        aria-hidden="true"
      >
        <div className="cur-dot-in" />
      </div>
    </>
  );
}
