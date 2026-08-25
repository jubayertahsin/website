/* ---------------------------------------------------------------------------
 * ProjectPanel — one case study, as an editorial spread rather than a card.
 *
 * The brief's instruction was "large editorial case studies, not a grid of tiny
 * cards", and the difference is not size. A card is a container: it has a border
 * all the way round, a corner radius, a shadow, and it says "I am a unit in a
 * grid". A spread is a composition: type at three different scales, hairlines
 * only where a column genuinely divides, and a reading order that starts at a
 * number and ends at a status.
 *
 * EVERY FIELD IS CONDITIONAL. Three of the five projects have no goals array, four
 * have no architecture, and all five currently have repo: null and demo: null.
 * Rendering an empty heading over nothing is how a portfolio starts looking
 * padded, so each block asks whether it has content first. The link row does the
 * same in reverse: rather than fabricating a URL, it states plainly that the
 * repository is not published yet, which is a true sentence and a better one than
 * a dead link.
 *
 * NO IMAGE. There is no screenshot of POGO because POGO is not finished, and a
 * generated mockup of a product that does not exist yet would be the single most
 * dishonest thing on this page. The type is the visual.
 * ------------------------------------------------------------------------- */

import Reveal from "@/components/animations/Reveal";
import StatusPip from "@/components/ui/StatusPip";
import type { Project } from "@/data/portfolio";

export interface ProjectPanelProps {
  project: Project;
  /** Position in the rail. Drives the focus-follows-tab target, so it is required. */
  index: number;
}

export default function ProjectPanel({ project, index }: ProjectPanelProps) {
  const headingId = `work-${project.id}`;

  return (
    <article
      className="prj"
      // Both attributes are read by HorizontalScroll: data-panel to find panels,
      // data-index to scroll the document when focus lands inside one.
      data-panel=""
      data-index={index}
      data-tone={project.tone}
      data-hero={project.hero ? "1" : "0"}
      aria-labelledby={headingId}
    >
      <div className="prj-in">
        {/* --- masthead: number, name, what it is, whether it runs --------- */}
        <header className="prj-head">
          <p className="prj-index label">{project.index}</p>

          <h3 className="prj-name" id={headingId}>
            {project.name}
            {project.fullName ? (
              <span className="prj-full">{project.fullName}</span>
            ) : null}
          </h3>

          <p className="prj-type">{project.type}</p>

          {/* The status pip already exists as a component and already encodes the
              three states as shapes rather than as colours, so this does not
              reinvent it. One vocabulary for status across the whole page. */}
          <StatusPip tone={project.tone} className="prj-status">
            {project.status}
          </StatusPip>
        </header>

        <p className="prj-summary">{project.summary}</p>

        {/* --- the argument: what was wrong, what was done about it --------
            Both halves are typed as nullable, and a lone "The problem" with an
            empty column under it looks like a bug rather than an omission, so
            the pair is rendered only when both are present. */}
        {project.problem && project.approach ? (
          <div className="prj-case">
            <Reveal as="div" className="prj-block" index={0} total={2} stagger={0.5}>
              <p className="prj-block-label label">The problem</p>
              <p className="prj-block-text">{project.problem}</p>
            </Reveal>
            <Reveal as="div" className="prj-block" index={1} total={2} stagger={0.5}>
              <p className="prj-block-label label">The approach</p>
              <p className="prj-block-text">{project.approach}</p>
            </Reveal>
          </div>
        ) : null}

        {/* --- the evidence ------------------------------------------------ */}
        <dl className="prj-meta">
          <div className="prj-meta-row">
            <dt className="label">Built with</dt>
            <dd>
              <ul className="prj-terms">
                {project.technologies.map((t) => (
                  <li className="prj-term" key={t}>
                    {t}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="prj-meta-row">
            <dt className="label">Ideas</dt>
            <dd>
              <ul className="prj-terms">
                {project.concepts.map((c) => (
                  <li className="prj-term" key={c}>
                    {c}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        {/* Only POGO has goals, and they are goals: what it is FOR, not what it
            already does. The label says so, because "features" would be a claim
            about a system that is still being built. */}
        {project.goals && project.goals.length > 0 ? (
          <div className="prj-goals">
            <p className="prj-block-label label">What it is meant to do</p>
            <ul className="prj-goal-list">
              {project.goals.map((goal) => (
                <li className="prj-goal" key={goal}>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {project.note ? <p className="prj-note">{project.note}</p> : null}

        {/* --- links, or the honest absence of them ----------------------- */}
        <div className="prj-links">
          {project.repo ? (
            <a
              className="ul"
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="Open"
            >
              Repository <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <p className="prj-pending">Repository not published yet</p>
          )}
          {project.demo ? (
            <a
              className="ul"
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="Open"
            >
              Live <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
