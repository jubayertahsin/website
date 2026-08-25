/* ---------------------------------------------------------------------------
 * Journey — "What I'm building toward".
 *
 * Five stages, and the honesty of this section is entirely in the two states.
 * `now` is what is true today: HSC, and the hours already spent building. `ahead`
 * is intention. They are drawn differently — solid marker against dashed, ink
 * against ink-soft — so nobody can read this as a CV of things already done. That
 * distinction is the whole reason this section is not a timeline of achievements.
 *
 * The dream role is stated, because the user asked for it, and immediately framed,
 * because the brief is explicit that CEO is a destination and not a title he
 * holds. The framing sits on the same line as the word, not in a footnote where a
 * skim-reader would miss it.
 *
 * A rail rather than a list: the accent line grows through the stages as the
 * section is read, keyed to the scene's own progress. It is the one place on the
 * page where progress is drawn as literal progress, which is appropriate here and
 * nowhere else.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import { objective } from "@/data/portfolio";
import { vars } from "@/lib/css";

export default function Journey() {
  const stages = objective.stages;

  return (
    <Scene
      id="journey"
      className="jrn"
      start="clamp(top 85%)"
      end="clamp(bottom 40%)"
      aria-labelledby="jrn-title"
    >
      <div className="jrn-in">
        <div className="jrn-head">
          <Reveal as="p" className="label">
            04 — Direction
          </Reveal>
          <SplitText
            text={objective.heading}
            by="word"
            as="h2"
            id="jrn-title"
            className="jrn-title"
            stagger={0.45}
          />
          <Reveal as="p" className="jrn-direction">
            {objective.direction}
          </Reveal>
        </div>

        <ol className="jrn-list">
          {stages.map((stage, i) => (
            <li
              className="jrn-stage"
              key={stage.key}
              data-state={stage.state}
              style={vars({ "--i": i, "--n": stages.length })}
            >
              {/* The marker carries the state: filled for now, hairline ring for
                  ahead. Not a colour difference, because there is one accent. */}
              <span className="jrn-dot" aria-hidden="true" />
              <p className="jrn-stage-label">{stage.label}</p>
              <p className="jrn-stage-line">{stage.line}</p>
              {/* Said in words as well as in form, because the marker is
                  decorative and a screen reader gets nothing from it. */}
              <p className="jrn-stage-state label">
                {stage.state === "now" ? "Now" : "Ahead"}
              </p>
            </li>
          ))}
        </ol>

        {/* The aspiration, and the qualifier that keeps it one. */}
        <Reveal className="jrn-dream">
          <p className="jrn-dream-role">
            <span className="label jrn-dream-label">The long game</span>
            {objective.dream.role}
          </p>
          <p className="jrn-dream-framing">{objective.dream.framing}</p>
        </Reveal>
      </div>
    </Scene>
  );
}
