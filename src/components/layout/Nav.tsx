"use client";

/* ---------------------------------------------------------------------------
 * Nav — the one piece of chrome that is present the whole way down.
 *
 * It has two states and they are not decorative. At the top of the page the nav
 * is weightless: no bar, no backdrop, no rule, just the monogram and five words
 * sitting on the hero. Past the hero it becomes a compact floating bar with a
 * hairline and a blur behind it, because from that point on there is content
 * underneath it and unbacked text over moving content is unreadable.
 *
 * WHY NOT HIDE IT ON SCROLL DOWN. The pattern is everywhere and it costs more
 * than it saves: the reader loses the ability to jump sections without first
 * scrolling the wrong way, and on a page with pinned scenes the "wrong way"
 * scroll also rewinds the scene they were watching. It stays.
 *
 * THE ACTIVE SECTION is computed from the scroll store, not from an
 * IntersectionObserver. Three reasons. The observer's thresholds fire on
 * intersection, which for a 400vh pinned section means "active" the moment one
 * pixel of a very tall element enters — wrong for most of its life. The bands
 * here are measured once and cached, so per-frame cost is a comparison, not a
 * layout read. And the whole codebase already has exactly one thing that reads
 * scroll position; a second mechanism would be a second source of truth.
 *
 * THE MOBILE MENU is the one place in this file that uses Framer Motion, because
 * it is genuinely React state driving an unmount, which is the job §37 assigns
 * it. Everything else here is a data attribute and a CSS transition.
 * ------------------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nav, person } from "@/data/portfolio";
import ScrollLink from "@/components/ui/ScrollLink";
import MagneticButton from "@/components/effects/MagneticButton";
import { lockScroll, subscribe, unlockScroll } from "@/lib/scroll-store";
import { prefersReducedMotion } from "@/lib/env";

/**
 * How far down the page the nav condenses, as a multiple of viewport height.
 * Just under one screen, so the change happens while the hero is still leaving
 * rather than at the moment the next section arrives — two simultaneous changes
 * read as one janky change.
 */
const CONDENSE_AT = 0.72;
/** Hysteresis band, so a nav parked exactly on the threshold cannot flicker. */
const HYSTERESIS = 0.06;

/**
 * The section ids, derived from the nav data rather than restated here.
 *
 * `nav` is declared `as const`, so its ids are a union of literal strings, not
 * `string`. That matters for more than tidiness: typing a band's id as `string`
 * makes the band type unassignable to what `.map()` actually produces, which is
 * what the `filter` predicate below has to narrow to. Deriving the union keeps the
 * two halves in agreement, and it means adding a section to the data file cannot
 * leave this file quietly out of date.
 */
type SectionId = (typeof nav)[number]["id"];

interface Band {
  id: SectionId;
  top: number;
  bottom: number;
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<SectionId | null>(null);

  const panel = useRef<HTMLDivElement | null>(null);
  const toggle = useRef<HTMLButtonElement | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);

  /* --- active section and condensed state, from one subscription ---------- */

  useEffect(() => {
    let bands: Band[] = [];

    // Measured against the document, not the viewport, so the numbers stay valid
    // for the whole session and only a resize or a font swap invalidates them.
    const measure = () => {
      bands = nav
        .map(({ href, id }) => {
          const el = document.querySelector(href);
          if (!(el instanceof HTMLElement)) return null;
          const top = el.getBoundingClientRect().top + window.scrollY;
          return { id, top, bottom: top + el.offsetHeight };
        })
        .filter((band): band is Band => band !== null);
    };

    measure();
    // Fonts change every line box, so every section offset. Without this the
    // bands are measured against the fallback face and drift by tens of pixels.
    if ("fonts" in document) document.fonts.ready.then(measure).catch(() => {});

    let lastActive: SectionId | null = null;
    let lastCondensed = false;

    const off = subscribe(({ scroll, viewport }) => {
      if (viewport <= 0) return;

      // The reading line sits at 42% of the viewport rather than at its top edge,
      // because a reader looking at the middle of the screen considers that
      // section the one they are in. Measuring at the top edge marks a section
      // active while it is still mostly below the fold.
      const line = scroll + viewport * 0.42;
      let next: SectionId | null = null;
      for (const band of bands) {
        if (line >= band.top && line < band.bottom) {
          next = band.id;
          break;
        }
      }
      if (next !== lastActive) {
        lastActive = next;
        setActive(next);
      }

      const threshold = viewport * (lastCondensed ? CONDENSE_AT - HYSTERESIS : CONDENSE_AT);
      const wantCondensed = scroll > threshold;
      if (wantCondensed !== lastCondensed) {
        lastCondensed = wantCondensed;
        setCondensed(wantCondensed);
      }
    });

    window.addEventListener("resize", measure);
    return () => {
      off();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* --- the menu ----------------------------------------------------------- */

  const close = useCallback(() => {
    setOpen(false);
    // Focus returns to the control that opened the menu. Without this, closing
    // drops focus on <body> and the next Tab starts from the top of the document.
    toggle.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      unlockScroll();
      return;
    }
    lockScroll();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      // A full-screen overlay that leaves the page behind it tabbable is a trap
      // in the other direction: focus walks into content the reader cannot see.
      // So Tab cycles inside the panel for as long as the panel is up.
      const focusable = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Focus moves into the panel on open, so a keyboard user is where the menu is.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      panel.current?.querySelector<HTMLElement>("a[href]")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // A width change that crosses into desktop layout leaves an open panel
  // stranded over a nav that no longer has a toggle. Close it.
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const ease = reduced.current ? undefined : ([0.76, 0, 0.24, 1] as const);
  const dur = (value: number) => (reduced.current ? 0 : value);

  return (
    <>
      <header className="nav" data-condensed={condensed ? "1" : "0"}>
        <div className="nav-in">
          {/* The monogram is a link to the top, which is what a reader expects a
              wordmark to be, and it is the same two letterforms the loader shows
              and the close collapses into. One mark, three appearances. */}
          <MagneticButton strength={6} field={10}>
            <ScrollLink href="#top" className="nav-mark" data-cursor="Top">
              {person.monogram}
              <span className="nav-mark-dot" aria-hidden="true">
                .
              </span>
              <span className="sr-only">— back to top</span>
            </ScrollLink>
          </MagneticButton>

          {/* Desktop list. `aria-current="true"` rather than "page", because
              these are sections of one document, not separate pages. */}
          <nav className="nav-list" aria-label="Sections">
            {nav.map((item) => (
              <ScrollLink
                key={item.id}
                href={item.href}
                className="nav-link"
                data-active={active === item.id ? "1" : "0"}
                aria-current={active === item.id ? "true" : undefined}
              >
                <span className="nav-link-text">{item.label}</span>
              </ScrollLink>
            ))}
          </nav>

          {/* The toggle exists only below the desktop breakpoint. It is hidden in
              CSS rather than conditionally rendered, so no hydration mismatch and
              no flash of the wrong control on a narrow first paint. */}
          <button
            ref={toggle}
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span className="nav-toggle-bars" data-open={open ? "1" : "0"} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="nav-menu"
            className="menu"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            // The panel arrives as a clip-path wipe from the top rather than a
            // slide, so nothing moves off-screen and the layout underneath is
            // never scrolled or resized by the transition.
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: dur(0.72), ease }}
          >
            <ul className="menu-list">
              {nav.map((item, i) => (
                <li key={item.id} className="menu-item">
                  <motion.span
                    className="menu-line"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "110%", transition: { duration: dur(0.3), ease } }}
                    transition={{
                      duration: dur(0.68),
                      // Staggered on entry only. On exit everything leaves
                      // together, because a reader who has decided to close a
                      // menu is not waiting to watch it close.
                      delay: dur(0.1 + i * 0.06),
                      ease,
                    }}
                  >
                    <ScrollLink
                      href={item.href}
                      className="menu-link"
                      onClick={() => setOpen(false)}
                    >
                      <span className="menu-index label" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </ScrollLink>
                  </motion.span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
