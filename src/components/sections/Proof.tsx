/* ---------------------------------------------------------------------------
 * Proof — the GitHub block.
 *
 * A short section with one job: point at the place where the claims can be
 * checked. The brief asks for GitHub as proof of work, and proof means a link,
 * not a badge grid. No contribution graph, no star counts, no "500+ commits"
 * figure, because none of those numbers were provided and inventing a plausible
 * one is the easiest lie on a portfolio to tell and the hardest to justify.
 *
 * The six categories are the unnamed work, acknowledged rather than dressed up.
 * They are categories, not projects, and the copy says so: the five written-up
 * projects are above, everything else is behind the link.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import Reveal from "@/components/animations/Reveal";
import Cta from "@/components/ui/Cta";
import { github, projectCategories } from "@/data/portfolio";

export default function Proof() {
  return (
    <Scene
      id="proof"
      className="prf"
      start="clamp(top 90%)"
      end="clamp(bottom 55%)"
      aria-labelledby="prf-title"
    >
      <div className="prf-in">
        <div className="prf-copy">
          <Reveal as="p" className="label">
            08 — Proof
          </Reveal>
          {/* A real h2, not a styled paragraph: this section is a peer of the
              others in the document outline even though it is the shortest. */}
          <Reveal>
            <h2 className="prf-title" id="prf-title">
              {github.heading}
            </h2>
          </Reveal>
          <Reveal as="p" className="prf-line">
            {github.line}
          </Reveal>
          <Reveal>
            <Cta href={github.url} variant="line" cue="Open">
              {`github.com/${github.username}`}
            </Cta>
          </Reveal>
        </div>

        {/* Six categories, hairline-separated. Not repository cards: there is no
            repository metadata here to put in one. */}
        <div className="prf-cats">
          <p className="label prf-cats-label">What is in there</p>
          <ul className="prf-cat-list">
            {projectCategories.map((cat, i) => (
              <Reveal
                as="li"
                key={cat}
                className="prf-cat"
                index={i}
                total={projectCategories.length}
                stagger={0.55}
              >
                {cat}
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </Scene>
  );
}
