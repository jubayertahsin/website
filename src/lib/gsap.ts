/* ---------------------------------------------------------------------------
 * lib/gsap.ts — one place where the plugin gets registered.
 *
 * Registering ScrollTrigger from several components is how a project ends up
 * with two plugin instances and pins that fight each other. Everything imports
 * gsap from here instead of from the package, and registration happens once, on
 * the client only, because ScrollTrigger measures layout and there is no layout
 * during a server render.
 * ------------------------------------------------------------------------- */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function ensureGsap(): typeof gsap {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    // Lenis owns scroll position, so ScrollTrigger must not also try to restore
    // it, and it must not fire while the page is being resized mid-gesture on
    // mobile, which is what ignoreMobileResize prevents. The mobile address bar
    // collapsing counts as a resize, and without this every pinned section
    // re-measures the moment the user starts scrolling on a phone.
    ScrollTrigger.config({ ignoreMobileResize: true });
    registered = true;
  }
  return gsap;
}

export { gsap, ScrollTrigger };
