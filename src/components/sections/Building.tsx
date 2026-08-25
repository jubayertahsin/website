/* ---------------------------------------------------------------------------
 * Building — "Learning through building", which is this page's experience
 * section and deliberately not called one.
 *
 * The brief forbids fabricated employment, and the honest version of that is not
 * an empty section or a euphemism: it is a plain sentence saying there is no
 * formal job history yet, followed by the work that actually exists. The
 * disclaimer therefore sits FIRST and at reading size, not shrunk into a caption.
 * A reader who only reads one line of this section should read that one.
 *
 * Four entries, two columns: what it was on the left, what it taught on the right.
 * No dates, because inventing a date range for "the year I was learning this"
 * would be the same class of fabrication the section exists to avoid. No logos and
 * no client names either — the video editing was for two teachers, and that is
 * exactly as specific as it gets.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import { building } from "@/data/portfolio";

export default function Building() {
  return (
    <Scene
      id="building"
      className="bld"
      start="clamp(top 85%)"
      end="clamp(bottom 45%)"
      aria-labelledby="bld-title"
    >
      <div className="bld-in">
        <div className="bld-head">
          <Reveal as="p" className="label">
            05 — Experience
          </Reveal>
          <SplitText
            text={building.heading}
            by="word"
            as="h2"
            id="bld-title"
            className="bld-title"
            stagger={0.45}
          />
          {/* Stated plainly, at full size, before anything else. */}
          <Reveal as="p" className="bld-disclaimer">
            {building.disclaimer}
          </Reveal>
        </div>

        <ul className="bld-list">
          {building.entries.map((entry, i) => (
            <Reveal
              as="li"
              key={entry.id}
              className="bld-entry"
              index={i}
              total={building.entries.length}
              stagger={0.45}
            >
              <div className="bld-entry-head">
                <p className="bld-entry-num label">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="bld-entry-label">{entry.label}</h3>
                <p className="bld-entry-line">{entry.line}</p>
              </div>
              <p className="bld-entry-detail">{entry.detail}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </Scene>
  );
}
