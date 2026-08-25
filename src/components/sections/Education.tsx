/* ---------------------------------------------------------------------------
 * Education — one entry that is true now, one that is a plan, and the difference
 * made impossible to miss.
 *
 * This is the section a portfolio like this most often inflates, so the rules are
 * hard: no university names, no admission results, no IELTS score, no scholarship,
 * no acceptance. The intended degree is drawn with a dashed marker and labelled
 * "Intended", the four candidate fields are listed as candidates, and Germany is
 * described as preferred rather than chosen. If any of that changes, the data file
 * changes; the component never guesses.
 *
 * Every field is conditional, because the intended entry legitimately has no
 * institution, no board and no session. An empty label above a blank line is how a
 * section starts looking padded, so nothing renders without content behind it.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import { education } from "@/data/portfolio";

export default function Education() {
  return (
    <Scene
      id="education"
      className="edu"
      start="clamp(top 85%)"
      end="clamp(bottom 45%)"
      aria-labelledby="edu-title"
    >
      <div className="edu-in">
        <div className="edu-head">
          <Reveal as="p" className="label">
            06 — Education
          </Reveal>
          <SplitText
            text="Where I am, and where I am going"
            by="word"
            as="h2"
            id="edu-title"
            className="edu-title"
            stagger={0.45}
          />
        </div>

        <ol className="edu-list">
          {/* The <li> carries the state attribute and the Reveal sits inside it:
              Reveal takes only its own props by design, so a data attribute
              belongs on real markup rather than being threaded through it. */}
          {education.map((entry, i) => (
            <li className="edu-entry" key={entry.id} data-kind={entry.kind}>
              <Reveal
                as="div"
                className="edu-entry-in"
                index={i}
                total={education.length}
                stagger={0.5}
              >
              <div className="edu-mark" aria-hidden="true">
                <span className="edu-dot" />
              </div>

              <div className="edu-body">
                <p className="edu-kind label">
                  {entry.kind === "current" ? "Current" : "Intended"}
                </p>

                <h3 className="edu-level">
                  {entry.level}
                  {entry.stream ? (
                    <span className="edu-stream">{entry.stream}</span>
                  ) : null}
                </h3>

                {entry.institution ? (
                  <p className="edu-institution">{entry.institution}</p>
                ) : null}

                {/* Board, session and outcome as a short definition list, so each
                    fact is labelled rather than run together in a sentence. */}
                <dl className="edu-facts">
                  {entry.board ? (
                    <div className="edu-fact">
                      <dt className="label">Board</dt>
                      <dd>{entry.board}</dd>
                    </div>
                  ) : null}
                  {entry.session ? (
                    <div className="edu-fact">
                      <dt className="label">Session</dt>
                      <dd>{entry.session}</dd>
                    </div>
                  ) : null}
                  {entry.outcome ? (
                    <div className="edu-fact">
                      <dt className="label">Status</dt>
                      <dd>{entry.outcome}</dd>
                    </div>
                  ) : null}
                  {entry.destination ? (
                    <div className="edu-fact">
                      <dt className="label">Preferred</dt>
                      <dd>{entry.destination}</dd>
                    </div>
                  ) : null}
                </dl>

                {entry.detail ? <p className="edu-detail">{entry.detail}</p> : null}

                {/* Four candidate fields, and the heading says candidate. */}
                {entry.fields && entry.fields.length > 0 ? (
                  <div className="edu-fields">
                    <p className="label edu-fields-label">One of four</p>
                    <ul className="edu-field-list">
                      {entry.fields.map((field) => (
                        <li className="edu-field" key={field}>
                          {field}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Scene>
  );
}
