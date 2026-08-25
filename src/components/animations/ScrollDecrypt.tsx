"use client";

/* ---------------------------------------------------------------------------
 * ScrollDecrypt — the signature interaction.
 *
 * A statement arrives as noise and resolves into language as the reader scrolls.
 * The logic lives in lib/decrypt.ts, where it is pure and tested; this file is
 * only the part that has to touch the DOM.
 *
 * Four decisions worth defending:
 *
 * 1. THE FINISHED SENTENCE IS WHAT THE SERVER SENDS. Initial render puts the real
 *    characters in the HTML with data-on="1". JavaScript then degrades the display
 *    according to scroll. So a crawler, a reader with scripts blocked, and anyone
 *    on the reduced-motion path all get plain readable prose, and there is no
 *    frame where the page shows gibberish it cannot recover from.
 *
 * 2. IT UPDATES BY MUTATION, NOT BY RENDER. Setting React state per frame would
 *    reconcile a few hundred spans sixty times a second. Instead the spans are
 *    rendered once and their textContent is written directly, guarded by a cache
 *    so a character whose glyph did not change is not touched at all.
 *
 * 3. IT READS ITS PARENT'S PROGRESS WHEN IT HAS ONE. Inside a pinned section the
 *    element never moves, so a ScrollTrigger of its own would report a constant
 *    progress forever. When a Scene is above it in the tree, it subscribes.
 *
 * 4. ONE RECT READ PER FRAME. Cell positions are measured once, relative to the
 *    container, and the container's own position is read once per frame. Measuring
 *    every character every frame would be a few hundred forced layouts per frame,
 *    which is how this kind of effect gets its reputation.
 *
 * The effect is used THREE TIMES on the whole page. It is a punctuation mark, and
 * a page where every sentence does this is unreadable, not sophisticated.
 * ------------------------------------------------------------------------- */

import { Fragment, useEffect, useMemo, useRef } from "react";
import {
  isResolved,
  planLines,
  pointerRelief,
  readout,
  ROUNDS,
  scrambleGlyph,
  type Cell,
} from "@/lib/decrypt";
import { churnTick, slice } from "@/lib/motion";
import { hasFinePointer } from "@/lib/env";
import { subscribe as subscribeScroll } from "@/lib/scroll-store";
import { useScene } from "@/lib/use-scene";
import { cx } from "@/lib/css";
import { useSceneChannel } from "./scene-channel";

type Tag = "h2" | "h3" | "p" | "div" | "blockquote";

export interface ScrollDecryptProps {
  /** One string per visual line. Line breaks are authored, not wrapped. */
  lines: readonly string[];
  as?: Tag;
  className?: string;
  /** Which slice of the parent scene's progress the reveal occupies. */
  from?: number;
  to?: number;
  /** Show the round / key / entropy strip. Once per page is plenty. */
  showReadout?: boolean;
}

interface Slot {
  cell: Cell;
  flat: number;
}

type Run = { kind: "word"; slots: Slot[] } | { kind: "gap"; text: string };

export default function ScrollDecrypt({
  lines,
  as = "p",
  className,
  from = 0,
  to = 1,
  showReadout = false,
}: ScrollDecryptProps) {
  const channel = useSceneChannel();
  const hostRef = useRef<HTMLElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const cellRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const offsets = useRef<Array<{ x: number; y: number }>>([]);
  const cache = useRef<Array<{ glyph: string; on: string; hit: string }>>([]);
  const pointer = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const progress = useRef(1);

  const { plan, model, flatCells, plain } = useMemo(() => {
    const plan = planLines(lines);
    const flatCells: Cell[] = [];
    // Characters are grouped into words wrapped in a nowrap span. Without that,
    // every letter is its own inline-block and the browser will happily break a
    // line in the middle of a word, which looks like a rendering bug.
    const model = plan.map((cells) => {
      const runs: Run[] = [];
      let word: Slot[] = [];
      let gap = "";
      const flushWord = () => {
        if (word.length > 0) {
          runs.push({ kind: "word", slots: word });
          word = [];
        }
      };
      const flushGap = () => {
        if (gap.length > 0) {
          runs.push({ kind: "gap", text: gap });
          gap = "";
        }
      };
      for (const cell of cells) {
        if (cell.space) {
          flushWord();
          gap += cell.ch;
        } else {
          flushGap();
          word.push({ cell, flat: flatCells.length });
          flatCells.push(cell);
        }
      }
      flushWord();
      flushGap();
      return runs;
    });
    return { plan, model, flatCells, plain: lines.join(" ") };
  }, [lines]);

  /* --- measurement ------------------------------------------------------- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const hostRect = host.getBoundingClientRect();
      offsets.current = cellRefs.current.map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.left - hostRect.left + r.width / 2,
          y: r.top - hostRect.top + r.height / 2,
        };
      });
    };
    measure();
    // Font swap and reflow both move every cell. ResizeObserver on the container
    // catches a width change from either cause, including the one that matters
    // most and is easiest to forget: the container narrowing because a sibling
    // grew, which no window resize event reports.
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    if ("fonts" in document) document.fonts.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [model]);

  /* --- pointer as the second key ----------------------------------------- */
  useEffect(() => {
    if (!hasFinePointer()) return;
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      pointer.current = { x: null, y: null };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  /* --- own scene, only when there is no parent to follow ----------------- */
  useScene(hostRef, {
    enabled: channel === null,
    start: "clamp(top 85%)",
    end: "clamp(top 30%)",
    onProgress: (p) => {
      progress.current = p;
    },
  });

  useEffect(() => {
    if (!channel) return;
    return channel.subscribe((p) => {
      progress.current = p;
    });
  }, [channel]);

  /* --- the per-frame write ----------------------------------------------- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let lastTick = -1;
    let lastP = -1;
    let settled = false;

    // Subscribing to the scroll store rather than opening a private rAF loop:
    // the page already has exactly one animation loop, and adding a second one
    // for this would put the two a frame out of step with each other.
    return subscribeScroll(() => {
      const p = slice(progress.current, from, to);
      const tick = churnTick(performance.now());

      // Nothing to do before the reveal starts, and nothing to do once it has
      // finished, except the single pass that writes the finished state.
      if (p <= 0) {
        settled = false;
        if (lastP === 0) return;
      } else if (p >= 1) {
        if (settled) return;
        settled = true;
      } else {
        settled = false;
        // Mid-reveal, a frame is only worth spending if the scroll moved or the
        // churn clock advanced. Standing still with the pointer parked costs
        // nothing.
        if (p === lastP && tick === lastTick && pointer.current.x === null) return;
      }
      lastP = p;
      lastTick = tick;

      const rect = host.getBoundingClientRect();
      const px = pointer.current.x;
      const py = pointer.current.y;

      for (let i = 0; i < flatCells.length; i++) {
        const el = cellRefs.current[i];
        if (!el) continue;
        const cell = flatCells[i];
        const off = offsets.current[i] ?? { x: 0, y: 0 };
        const relief =
          px === null ? 0 : pointerRelief(rect.left + off.x, rect.top + off.y, px, py);

        const onScroll = isResolved(cell, p, 0);
        const on = onScroll || isResolved(cell, p, relief);
        const glyph = on ? cell.ch : scrambleGlyph(cell, tick);
        const onAttr = on ? "1" : "0";
        // Accent marks only the characters the POINTER resolved early. It is the
        // one visual acknowledgement that the effect has a second input, and it
        // is honest: these are exactly the cells that would still be noise
        // without the cursor there.
        const hitAttr = !onScroll && on ? "1" : "0";

        const prev = cache.current[i];
        if (!prev) {
          el.textContent = glyph;
          el.dataset.on = onAttr;
          el.dataset.hit = hitAttr;
          cache.current[i] = { glyph, on: onAttr, hit: hitAttr };
          continue;
        }
        if (prev.glyph !== glyph) {
          el.textContent = glyph;
          prev.glyph = glyph;
        }
        if (prev.on !== onAttr) {
          el.dataset.on = onAttr;
          prev.on = onAttr;
        }
        if (prev.hit !== hitAttr) {
          el.dataset.hit = hitAttr;
          prev.hit = hitAttr;
        }
      }

      const strip = readoutRef.current;
      if (strip) {
        const r = readout(plan, p);
        const next = `${String(r.round).padStart(2, "0")} / ${String(ROUNDS).padStart(2, "0")}  ·  ${r.key.join(" ")}  ·  ${r.entropy.toFixed(2)} bits/char`;
        if (strip.textContent !== next) strip.textContent = next;
      }
    });
  }, [flatCells, plan, from, to]);

  const Tag = as;

  return (
    <Tag
      ref={hostRef as React.Ref<never>}
      className={cx("cipher", className)}
      aria-label={plain}
    >
      {model.map((runs, li) => (
        <span className="cl" key={li} aria-hidden="true">
          {runs.map((run, ri) =>
            run.kind === "gap" ? (
              <span className="cg" key={ri}>
                {run.text}
              </span>
            ) : (
              <span className="cw" key={ri}>
                {run.slots.map((slot) => (
                  <span
                    key={slot.flat}
                    className="ch"
                    data-on="1"
                    data-hit="0"
                    ref={(el) => {
                      cellRefs.current[slot.flat] = el;
                    }}
                  >
                    {slot.cell.ch}
                  </span>
                ))}
              </span>
            ),
          )}
        </span>
      ))}
      {showReadout ? (
        <Fragment>
          <span className="cipher-readout label" aria-hidden="true" ref={readoutRef}>
            {`${String(ROUNDS).padStart(2, "0")} / ${String(ROUNDS).padStart(2, "0")}  ·  00 00 00 00  ·  0.00 bits/char`}
          </span>
        </Fragment>
      ) : null}
    </Tag>
  );
}
