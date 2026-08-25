"use client";

/* ---------------------------------------------------------------------------
 * SkillGraph — eight groups as a system, with no progress bars anywhere.
 *
 * WHY NOT BARS. "Python 87%" is a number nobody can justify and every reader
 * silently discounts. An edge, by contrast, is a claim that can be checked: this
 * group touches that one BECAUSE they share HTML, CSS and JavaScript, or because
 * Pakhi AI uses both. lib/graph.ts derives every edge from the data and carries
 * its own evidence, and this component shows that evidence on hover. The diagram
 * is therefore interrogable rather than decorative.
 *
 * ONE MARKUP TREE, TWO LAYOUTS. The eight groups are a single <ul>. On a phone it
 * is a list, which is what a list of skills should be. On a wide viewport the same
 * items are absolutely positioned at ring coordinates and the edges are drawn
 * behind them. Nothing is duplicated, nothing is conditionally rendered, so there
 * is no hydration mismatch and the no-JavaScript rendering is a readable list.
 *
 * THE SVG IS AN OVERLAY, NOT THE CONTENT. It is aria-hidden and pointer-events
 * none. Every fact it depicts is also in the text: the detail panel names the
 * shared items and the related groups in words. A reader who cannot see the
 * diagram loses the picture and keeps all of the information.
 *
 * STATE, NOT FRAMES. `active` changes on hover and focus, which happens a few
 * times a second at most, so React state is correct here and a subscription
 * channel would be over-engineering. Nothing in this file runs per frame.
 * ------------------------------------------------------------------------- */

import { useMemo, useState } from "react";
import { skillEdges, ringPositions, degrees } from "@/lib/graph";
import { skills, projects } from "@/data/portfolio";
import { vars } from "@/lib/css";

/** Project id to display name, so an edge can say "Pakhi AI" rather than "pakhi". */
const NAMES: Record<string, string> = Object.fromEntries(
  projects.map((p) => [p.id, p.name]),
);

export default function SkillGraph() {
  const [active, setActive] = useState<string | null>(null);

  const { edges, positions, degree } = useMemo(() => {
    const edges = skillEdges(skills);
    return {
      edges,
      positions: ringPositions(skills.length),
      degree: degrees(skills, edges),
    };
  }, []);

  const maxDegree = Math.max(1, ...degree);
  const current = active ? skills.find((g) => g.id === active) ?? null : null;

  // Everything one hop from the active group, with the reason. Computed here
  // rather than in the graph module because it is a presentation concern: the
  // module's job is which edges exist, this is how one node's edges read.
  const links = current
    ? edges
        .filter((e) => e.aId === current.id || e.bId === current.id)
        .map((e) => {
          const otherId = e.aId === current.id ? e.bId : e.aId;
          const other = skills.find((g) => g.id === otherId);
          return { id: otherId, label: other?.label ?? otherId, edge: e };
        })
    : [];

  return (
    <div className="eco" data-active={active ? "1" : "0"}>
      <div className="eco-stage">
        {/* Edges. viewBox is 0-100 in both axes and the container is not square,
            so preserveAspectRatio is off: a line has to land on the node it
            connects, and the nodes are placed in percentages of the same box. */}
        <svg
          className="eco-web"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {edges.map((e) => {
            const a = positions[e.a];
            const b = positions[e.b];
            const touches = active === e.aId || active === e.bId;
            return (
              <line
                key={`${e.aId}-${e.bId}`}
                className="eco-edge"
                x1={a.x * 100}
                y1={a.y * 100}
                x2={b.x * 100}
                y2={b.y * 100}
                data-on={touches ? "1" : "0"}
                data-basis={e.basis[0]}
                style={vars({ "--w": Math.min(e.weight, 4) })}
              />
            );
          })}
        </svg>

        <ul className="eco-nodes">
          {skills.map((group, i) => {
            const pos = positions[i];
            const isActive = active === group.id;
            const isNeighbour =
              active !== null &&
              !isActive &&
              links.some((l) => l.id === group.id);
            return (
              <li
                className="eco-node"
                key={group.id}
                style={vars({
                  "--x": pos.x * 100,
                  "--y": pos.y * 100,
                  // Degree drives size: better connected reads as bigger, which
                  // is the one visual ranking on this page and it is derived, not
                  // asserted. It is never a proficiency claim.
                  "--deg": degree[i] / maxDegree,
                })}
                data-state={isActive ? "on" : isNeighbour ? "near" : "off"}
              >
                <button
                  type="button"
                  className="eco-btn"
                  aria-pressed={isActive}
                  aria-describedby="eco-detail"
                  onMouseEnter={() => setActive(group.id)}
                  onFocus={() => setActive(group.id)}
                  onClick={() => setActive(isActive ? null : group.id)}
                >
                  <span className="eco-index label">{group.index}</span>
                  <span className="eco-label">{group.label}</span>
                </button>

                {/* Always in the DOM, always readable without JavaScript. On
                    desktop it is hidden until the node is active; on a phone it
                    is simply part of the list. */}
                <div className="eco-items">
                  <p className="eco-blurb">{group.blurb}</p>
                  <ul className="eco-terms">
                    {group.items.map((item) => (
                      <li className="eco-term" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                  {group.projects.length > 0 ? (
                    <p className="eco-used label">
                      Used in {group.projects.map((p) => NAMES[p] ?? p).join(", ")}
                    </p>
                  ) : null}
                  {group.unnamed ? <p className="eco-unnamed">{group.unnamed}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The evidence panel. This is the part that makes the diagram an argument
          rather than an illustration: it names WHY each line exists. */}
      <div className="eco-detail" id="eco-detail" aria-live="polite">
        {current ? (
          <>
            <p className="eco-detail-head">
              <span className="label">{current.index}</span> {current.label}
            </p>
            <ul className="eco-links">
              {links.map((l) => {
                const shared = l.edge.sharedItems;
                const sharedProjects = l.edge.sharedProjects;
                const why =
                  shared.length > 0
                    ? `shares ${shared.slice(0, 3).join(", ")}`
                    : sharedProjects.length > 0
                      ? `both used in ${sharedProjects.map((p) => NAMES[p] ?? p).join(", ")}`
                      : "related in practice";
                return (
                  <li className="eco-link" key={l.id}>
                    <span className="eco-link-to">{l.label}</span>
                    <span className="eco-link-why">{why}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="eco-detail-idle">
            Eight groups, connected where they genuinely overlap. Hover or focus one
            to see what it shares and with which project.
          </p>
        )}
      </div>
    </div>
  );
}
