/* ---------------------------------------------------------------------------
 * Cta — the one button on this site.
 *
 * There is a single control component because a page with three differently
 * behaved buttons has no design system, it has three accidents. Everything is
 * expressed by props: `variant` chooses filled or hairline, `arrow` adds the
 * travelling chevron, `cue` is the word the custom cursor shows over it.
 *
 * It routes itself by inspecting the href, which is the only honest place to make
 * that decision:
 *
 *   "#skills"          in-page, so it goes through Lenis via ScrollLink
 *   "https://…"        leaves the site, so target and rel are set, and the reader
 *                      is TOLD it opens a new tab rather than discovering it
 *   "mailto:" / "tel:" hands off to the OS, so it is a plain anchor
 *
 * `rel="noopener noreferrer"` is not decoration on a `target="_blank"` link: without
 * noopener the opened page gets a handle on this one through window.opener.
 *
 * A server component. It composes two client components, so none of this logic
 * ends up in the bundle.
 * ------------------------------------------------------------------------- */

import type { ReactNode } from "react";
import MagneticButton from "@/components/effects/MagneticButton";
import ScrollLink from "@/components/ui/ScrollLink";
import { cx } from "@/lib/css";

export interface CtaProps {
  href: string;
  children: ReactNode;
  /** "fill" is the primary action. There is one per screen, at most. */
  variant?: "fill" | "line" | "bare";
  arrow?: boolean;
  /** Word shown inside the custom cursor on hover. Keep it a verb. */
  cue?: string;
  /** Magnetism off for controls inside a dense list, where it reads as jitter. */
  magnetic?: boolean;
  className?: string;
}

export default function Cta({
  href,
  children,
  variant = "line",
  arrow = true,
  cue,
  magnetic = true,
  className,
}: CtaProps) {
  const internal = href.startsWith("#");
  const external = /^https?:\/\//i.test(href);

  const classes = cx(
    variant === "bare" ? "ul" : "btn",
    variant === "fill" && "btn-fill",
    className,
  );

  const body = (
    <>
      <span>{children}</span>
      {arrow ? (
        <span className="arrow" aria-hidden="true">
          {external ? "↗" : "→"}
        </span>
      ) : null}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </>
  );

  const link = internal ? (
    <ScrollLink href={href} className={classes} data-cursor={cue}>
      {body}
    </ScrollLink>
  ) : (
    <a
      href={href}
      className={classes}
      data-cursor={cue}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {body}
    </a>
  );

  return magnetic ? <MagneticButton>{link}</MagneticButton> : link;
}
