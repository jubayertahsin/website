"use client";

/* ---------------------------------------------------------------------------
 * scene-channel — how a child learns its parent scene's progress.
 *
 * The obvious approach is a context whose VALUE is the progress number. It is
 * also unusable: the value changes sixty times a second, so every consumer
 * re-renders sixty times a second, and React reconciliation is far too expensive
 * to run per frame for something that only needs to set a style.
 *
 * So the context carries a SUBSCRIPTION instead of a value. The object identity
 * never changes, so nothing re-renders; children register a callback and mutate
 * the DOM directly. Same shape as scroll-store, one level down.
 *
 * This matters most inside a pinned section. A pinned element does not move
 * while the pin holds, so a ScrollTrigger of its own would reach its start,
 * report a constant progress, and never advance. Children of a pin must be driven
 * by the pin.
 * ------------------------------------------------------------------------- */

import { createContext, useContext } from "react";

export interface SceneChannel {
  subscribe(listener: (p: number, e: number) => void): () => void;
  /** Current [raw, eased] progress, for a first paint between frames. */
  read(): [number, number];
}

export interface MutableSceneChannel extends SceneChannel {
  emit(p: number, e: number): void;
}

export function createSceneChannel(): MutableSceneChannel {
  const listeners = new Set<(p: number, e: number) => void>();
  // Starts finished, matching the `--p: 1` default in globals.css, so a child
  // that mounts before the first scroll frame shows the resolved state rather
  // than an empty one.
  let last: [number, number] = [1, 1];
  return {
    emit(p, e) {
      last = [p, e];
      for (const l of listeners) l(p, e);
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(last[0], last[1]);
      return () => {
        listeners.delete(listener);
      };
    },
    read() {
      return last;
    },
  };
}

export const SceneContext = createContext<SceneChannel | null>(null);

export function useSceneChannel(): SceneChannel | null {
  return useContext(SceneContext);
}
