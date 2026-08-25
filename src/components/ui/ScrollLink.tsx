"use client";

/* ---------------------------------------------------------------------------
 * ScrollLink — an in-page link that hands the jump to Lenis.
 *
 * A bare `href="#projects"` is fine until the page has smooth scrolling, at which
 * point the browser's instant jump and Lenis's interpolation both try to own the
 * scroll position and the result is a lurch. So a plain left click is intercepted
 * and routed through the scroll store, which knows whether Lenis is mounted and
 * falls back to `scrollIntoView` if it is not.
 *
 * IT STAYS A REAL ANCHOR. Middle click, cmd-click, ctrl-click, right-click, "open
 * in new tab" and the browser's own find-link behaviours all keep working, because
 * the handler bails the moment it sees a modifier or a non-primary button. This is
 * the difference between an enhanced link and a div pretending to be one, and it
 * is why this is not a button with a scroll handler.
 *
 * The URL is updated with replaceState so a reader can copy the address of a
 * section they are looking at, without every nav click stacking another entry on
 * the back button.
 * ------------------------------------------------------------------------- */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { scrollTo } from "@/lib/scroll-store";

export interface ScrollLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Must be a fragment: "#projects". */
  href: string;
  children: ReactNode;
}

export default function ScrollLink({ href, children, onClick, ...rest }: ScrollLinkProps) {
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // Anything but an unmodified primary click belongs to the browser.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (!href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        scrollTo(target as HTMLElement);
        // Focus goes to the section so a keyboard user's next Tab continues from
        // where they just travelled, rather than from the link they left. Without
        // this, "skip to projects" moves the viewport and nothing else, which is
        // the most common way an in-page link is half-implemented.
        if (target instanceof HTMLElement) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
        window.history.replaceState(null, "", href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
