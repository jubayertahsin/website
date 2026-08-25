"use client";

/* ---------------------------------------------------------------------------
 * Creed — the interlude between About and Skills.
 *
 * Four words, one per screen-height of scroll, and nothing else. No heading, no
 * eyebrow, no paragraph. It exists to do something no other section on the page
 * does: give the reader a rest.
 *
 * A page where every section is dense is exhausting regardless of how good the
 * density is, and the sections either side of this one are the two densest on the
 * page. So this is the trough in the feeling curve, deliberately placed, and its
 * only job is to make the skill graph after it feel like an arrival.
 *
 * THE MECHANISM. One Scene and four spans whose opacity is a window function of
 * the scene's progress: each word is at full strength for a quarter of the scroll
 * and absent outside it. It is computed entirely in CSS from --p and --i, so the
 * animation itself ships no JavaScript.
 *
 * WHY THIS IS A CLIENT COMPONENT ANYWAY. A window function has exactly one
 * output at any single value of --p, and --p defaults to 1 before hydration and
 * with JavaScript off. Under that default the window would land on the last word
 * and the other three would compute to opacity 0 — three words of content
 * silently gone in precisely the cases the whole design floor exists to protect.
 * So the static layout is the DEFAULT: four words in a row, all legible, no
 * transform. Mounting sets data-live, and only then does the CSS switch to the
 * stacked cross-fade. Same shape as HorizontalScroll's data-mode: the degraded
 * state is the one you get for free, not the one you have to remember to add.
 * ------------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import Scene from "@/components/animations/Scene";
import { person } from "@/data/portfolio";
import { vars } from "@/lib/css";

export default function Creed() {
  const words = person.creed;
  // Set in an effect rather than during render, so the server HTML and the first
  // client render agree and there is no hydration mismatch.
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);

  return (
    <Scene
      className="creed"
      pin
      start="clamp(top top)"
      end="clamp(+=240%)"
      aria-label={`${person.tagline} — the four stages this portfolio is organised around`}
    >
      <p className="creed-stack" data-live={live ? "1" : "0"}>
        {/* The four words as one accessible string, read once. The visible
            spans are hidden from the tree so a screen reader does not get four
            unconnected verbs. */}
        <span className="sr-only">{person.tagline}</span>
        {words.map((word, i) => (
          <span
            className="creed-word"
            key={word}
            aria-hidden="true"
            style={vars({ "--i": i, "--n": words.length })}
          >
            {word}
            <span className="creed-dot" aria-hidden="true">
              .
            </span>
          </span>
        ))}
      </p>

      {/* A hairline that fills across the whole interlude: the only indication of
          how much of it is left, and the same 1px accent rule the nav and the
          loader use. Progress, stated once, without a percentage. */}
      <span className="creed-rule" aria-hidden="true">
        <span className="creed-rule-fill" />
      </span>
    </Scene>
  );
}
