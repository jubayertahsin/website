"use client";

/* ---------------------------------------------------------------------------
 * MagneticButton — a control that leans toward the pointer.
 *
 * Wrap a link or a button in it. The wrapper translates a few pixels toward the
 * cursor and the label inside translates slightly further, which is what produces
 * the small sense of depth. Two numbers, and both are small on purpose: past about
 * fourteen pixels the control is no longer where the reader aimed, and a button
 * that dodges the click is a joke at the reader's expense.
 *
 * THERE IS NO ANIMATION LOOP IN THIS FILE. The offset is published as `--mx` and
 * `--my` and CSS transitions the transform, so the follow is smoothed by the
 * compositor for free. A rAF loop per button would be four loops on the contact
 * section for an effect a `transition` already does better.
 *
 * `field` extends the sensitive area outside the visible border with padding, so
 * the attraction begins just BEFORE the cursor arrives. That is the difference
 * between magnetic and merely hovered. It is deliberately not implemented as a
 * window-level pointer listener measuring distance to every magnetic element on
 * the page: that means a `getBoundingClientRect` per element per pointer event,
 * and the pinned rail moves its panels by transform, so those rects cannot even
 * be cached. Padding is exact, costs nothing, and cannot drift.
 *
 * Desktop with a real pointer only, and gone entirely under reduced motion. The
 * markup is identical either way, so nothing here can cause a hydration mismatch:
 * only whether the listeners get attached changes.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, type ReactNode } from "react";
import { clamp } from "@/lib/math";
import { hasFinePointer, prefersReducedMotion } from "@/lib/env";
import { vars, cx } from "@/lib/css";

export interface MagneticButtonProps {
  /** Travel in pixels at full deflection. Keep it under ~14. */
  strength?: number;
  /** How far outside the visible edge the pull begins, in pixels. */
  field?: number;
  className?: string;
  children: ReactNode;
}

export default function MagneticButton({
  strength = 9,
  field = 14,
  className,
  children,
}: MagneticButtonProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!hasFinePointer() || prefersReducedMotion()) return;

    const write = (x: number, y: number) => {
      el.style.setProperty("--mx", String(Math.round(x * 1000) / 1000));
      el.style.setProperty("--my", String(Math.round(y * 1000) / 1000));
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // Normalised to the half-extent, so a wide button and a small one both
      // reach full deflection at their own edge rather than the wide one barely
      // moving.
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      write(clamp(nx, -1, 1), clamp(ny, -1, 1));
    };

    const onLeave = () => write(0, 0);

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    // A pointerdown that becomes a drag, or a click that navigates, can leave the
    // element deflected with no leave event ever arriving. Releasing resets it.
    el.addEventListener("pointercancel", onLeave);
    el.addEventListener("blur", onLeave, true);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointercancel", onLeave);
      el.removeEventListener("blur", onLeave, true);
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    };
  }, []);

  return (
    <span
      ref={ref}
      className={cx("mag", className)}
      style={vars({ "--mag": strength, "--field": field })}
    >
      <span className="mag-in">{children}</span>
    </span>
  );
}
