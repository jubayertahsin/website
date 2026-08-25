"use client";

/* ---------------------------------------------------------------------------
 * lib/scroll-store.ts — one place that knows where the page is.
 *
 * The alternative is every component that cares about scroll adding its own
 * listener, and then the signature object, the progress rail, the nav and the
 * cursor each read layout independently, on the same frame, interleaved with
 * writes. That is the classic layout-thrash pattern: N reads and N writes per
 * frame instead of one read and N writes.
 *
 * So SmoothScroll measures once per frame and publishes. Everything else
 * subscribes. Nothing else calls `window.scrollY`, and nothing else reads
 * `getBoundingClientRect` in a loop.
 *
 * This is a module-level store rather than React context on purpose: it updates
 * sixty times a second, and a context value that changes every frame re-renders
 * every consumer every frame. Subscribers here get a callback and mutate the DOM
 * directly, which is the only way this stays at 60fps.
 * ------------------------------------------------------------------------- */

export interface Frame {
  /** Smoothed scroll offset in pixels, as Lenis reports it. */
  scroll: number;
  viewport: number;
  maxScroll: number;
  /** scroll / maxScroll, clamped. */
  progress: number;
  /** Signed scroll velocity, in pixels per frame. Used for skew and drift. */
  velocity: number;
  /** Seconds since the previous frame, clamped. */
  dt: number;
  /** Milliseconds since the loop started. */
  time: number;
}

type Listener = (frame: Frame) => void;

const listeners = new Set<Listener>();

let current: Frame = {
  scroll: 0,
  viewport: 0,
  maxScroll: 0,
  progress: 0,
  velocity: 0,
  dt: 1 / 60,
  time: 0,
};

/** Called by SmoothScroll, once per frame. */
export function publish(next: Frame): void {
  current = next;
  for (const listener of listeners) listener(next);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Fire immediately with whatever the current frame is, so a component that
  // mounts between frames paints correctly instead of waiting up to 16ms with
  // stale values.
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function frame(): Frame {
  return current;
}

/* ---- imperative controls, bound by SmoothScroll ------------------------- */

interface Controls {
  scrollTo: (target: string | number | HTMLElement, opts?: { offset?: number; immediate?: boolean }) => void;
  stop: () => void;
  start: () => void;
}

let controls: Controls | null = null;

export function bindControls(next: Controls | null): void {
  controls = next;
}

/**
 * Anchor navigation, routed through Lenis.
 *
 * A plain `href="#skills"` would jump instantly while the smooth scroller is
 * running, which looks broken: the page teleports and then Lenis eases back from
 * wherever it thought it was. Routing through the library keeps one source of
 * truth for scroll position. If Lenis has not mounted yet, this falls back to
 * the native behaviour, so links work before hydration.
 */
export function scrollTo(target: string | number | HTMLElement, offset = 0): void {
  if (controls) {
    controls.scrollTo(target, { offset });
    return;
  }
  if (typeof document === "undefined") return;
  const el = typeof target === "string" ? document.querySelector(target) : null;
  if (el instanceof HTMLElement) el.scrollIntoView({ behavior: "auto", block: "start" });
}

/**
 * Freeze the page. Used by the loader and the full-screen menu.
 *
 * `overflow: hidden` on the body is the usual approach and it is worse: it
 * changes the scroll height, so the scrollbar vanishes, the layout jumps by its
 * width, and every pinned section re-measures. Telling the scroller to stop
 * leaves the geometry untouched.
 */
export function lockScroll(): void {
  controls?.stop();
}

export function unlockScroll(): void {
  controls?.start();
}
