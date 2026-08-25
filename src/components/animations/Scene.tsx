"use client";

/* ---------------------------------------------------------------------------
 * Scene — a section that knows how far through itself the reader is.
 *
 * Wrap a section in this and everything inside it can animate from `--p` and
 * `--e` in CSS, with no further JavaScript. Children that need the number rather
 * than the style (the canvas, the cipher, the horizontal rail) subscribe to the
 * channel.
 *
 * `pin` hands the section to ScrollTrigger to hold in place while the page
 * scrolls past it, which is what makes a cinematic beat possible: the frame stops
 * and the content inside it changes. Used twice on this page and no more. Pinning
 * everything is how a site becomes exhausting rather than immersive, and it is
 * the single most common failure of scroll-driven portfolios.
 * ------------------------------------------------------------------------- */

import { useRef, type ReactNode } from "react";
import { useScene } from "@/lib/use-scene";
import { createSceneChannel, SceneContext } from "./scene-channel";
import { cx } from "@/lib/css";

export interface SceneProps {
  as?: "section" | "div" | "header" | "footer" | "article";
  id?: string;
  className?: string;
  start?: string;
  end?: string;
  pin?: boolean;
  /** Extra per-frame work, beyond the custom properties. */
  onProgress?: (p: number, e: number) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  children: ReactNode;
}

export default function Scene({
  as = "section",
  id,
  className,
  start,
  end,
  pin = false,
  onProgress,
  children,
  ...aria
}: SceneProps) {
  const ref = useRef<HTMLElement | null>(null);
  // useRef with an initialiser rather than useState: the channel must exist
  // before the first effect runs, and it must never be replaced.
  const channel = useRef(createSceneChannel());

  useScene(ref, {
    start,
    end,
    pin,
    onProgress: (p, e) => {
      channel.current.emit(p, e);
      onProgress?.(p, e);
    },
  });

  const Tag = as;

  return (
    <SceneContext.Provider value={channel.current}>
      <Tag
        // The generic HTMLElement ref is deliberate: Tag varies, and narrowing it
        // per tag would mean five refs and a union to satisfy nothing useful.
        ref={ref as React.Ref<never>}
        id={id}
        className={cx("scene", className)}
        {...aria}
      >
        {children}
      </Tag>
    </SceneContext.Provider>
  );
}
