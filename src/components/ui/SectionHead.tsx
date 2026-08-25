/* ---------------------------------------------------------------------------
 * SectionHead — the typographic opening of a section.
 *
 * A caution up front, because this component is the most likely thing in the
 * codebase to flatten the page: NOT EVERY SECTION SHOULD USE IT. If all six
 * sections open with an eyebrow, a title and a lede in the same place, the page
 * has one layout shown six times, and no amount of scroll choreography rescues
 * that. The hero, the philosophy interlude and the close are all deliberately
 * built without it.
 *
 * What it exists for is the sections that genuinely are conventional in structure,
 * where an unconventional heading would be noise rather than voice. It gives them
 * one shared rhythm: a mono eyebrow, a serif title that assembles from the parent
 * scene's progress, and an optional lede at reading width.
 *
 * `align` is the variety valve. Left is the default; `trail` pushes the block to
 * the right column, which is the cheapest way to make two adjacent sections feel
 * differently composed without inventing a second design language.
 * ------------------------------------------------------------------------- */

import type { ReactNode } from "react";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import { cx } from "@/lib/css";

export interface SectionHeadProps {
  /** The mono eyebrow. Usually a section name; sometimes a number. */
  label?: string;
  title: string | readonly string[];
  /** Break the title across authored lines instead of wrapping it. */
  splitBy?: "word" | "char" | "line";
  /** h2 by default, because the page has exactly one h1 and it is the name. */
  as?: "h1" | "h2" | "h3";
  size?: "title" | "head";
  align?: "lead" | "trail" | "centre";
  /** Standfirst paragraph. Optional, and often better omitted. */
  lede?: ReactNode;
  /** Lands on the heading itself, for the section's aria-labelledby to target. */
  id?: string;
  className?: string;
}

export default function SectionHead({
  label,
  title,
  splitBy = "word",
  as = "h2",
  size = "title",
  align = "lead",
  lede,
  id,
  className,
}: SectionHeadProps) {
  return (
    <header className={cx("head", className)} data-align={align}>
      {label ? (
        <Reveal as="p" className="head-label label">
          {label}
        </Reveal>
      ) : null}
      <SplitText
        text={title}
        by={splitBy}
        as={as}
        id={id}
        className={cx("head-title", size === "head" && "head-title-sm")}
        stagger={splitBy === "char" ? 0.4 : 0.55}
      />
      {lede ? (
        <Reveal as="p" className="head-lede">
          {lede}
        </Reveal>
      ) : null}
    </header>
  );
}
