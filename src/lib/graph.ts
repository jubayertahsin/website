/* ---------------------------------------------------------------------------
 * lib/graph.ts — the skill graph, derived rather than drawn.
 *
 * The brief asks for skills as an interconnected system instead of a row of
 * progress bars, and rightly: a bar claims a number ("Python 87%") that nobody
 * can justify, whereas an edge claims a relationship that can be checked.
 *
 * So no edge in this graph is decorative. Each one carries its evidence:
 *
 *   items     the two groups literally list the same skill. HTML, CSS and
 *             JavaScript are why Software Development touches Web Development.
 *   projects  the two groups are both used by the same project. Pakhi AI is why
 *             Artificial Intelligence touches Docker.
 *   stated    neither of the above, but the relationship is real and worth
 *             drawing. These come from `related` in the data file, and they are
 *             the ones that keep Cybersecurity and Linux from floating alone.
 *
 * The UI shows that evidence on hover, which turns the diagram into something
 * you can interrogate rather than something you have to take on faith.
 * ------------------------------------------------------------------------- */

import { skills, type SkillGroup } from "../data/portfolio";

export type EdgeBasis = "items" | "projects" | "stated";

export interface SkillEdge {
  /** Group indices into the source array, always a < b. */
  a: number;
  b: number;
  aId: string;
  bId: string;
  /** Everything that justifies this edge, most concrete first. */
  basis: EdgeBasis[];
  /** Shared skill names, in the casing the data uses. */
  sharedItems: string[];
  /** Shared project ids. */
  sharedProjects: string[];
  /** 1 for a stated edge, rising with evidence. Drives line weight only. */
  weight: number;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Every edge in the graph, with its evidence.
 *
 * Deterministic in the order of the input, so the layout is stable between
 * renders and the tests can assert exact counts.
 */
export function skillEdges(groups: readonly SkillGroup[] = skills): SkillEdge[] {
  const edges: SkillEdge[] = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const A = groups[i];
      const B = groups[j];

      const bItems = new Set(B.items.map(norm));
      const sharedItems = A.items.filter((it) => bItems.has(norm(it)));

      const bProjects = new Set(B.projects);
      const sharedProjects = A.projects.filter((p) => bProjects.has(p));

      const stated = A.related.includes(B.id) || B.related.includes(A.id);

      const basis: EdgeBasis[] = [];
      if (sharedItems.length > 0) basis.push("items");
      if (sharedProjects.length > 0) basis.push("projects");
      if (stated) basis.push("stated");
      if (basis.length === 0) continue;

      edges.push({
        a: i,
        b: j,
        aId: A.id,
        bId: B.id,
        basis,
        sharedItems,
        sharedProjects,
        weight: 1 + sharedItems.length * 0.5 + sharedProjects.length * 0.75,
      });
    }
  }
  return edges;
}

/** Edge count per group. Used to size nodes: better connected reads as bigger. */
export function degrees(groups: readonly SkillGroup[] = skills, edges = skillEdges(groups)): number[] {
  const d = new Array(groups.length).fill(0) as number[];
  for (const e of edges) {
    d[e.a]++;
    d[e.b]++;
  }
  return d;
}

export interface NodePosition {
  x: number;
  y: number;
}

/**
 * The largest distance from centre any node may sit, as a fraction of the box.
 *
 * A node is positioned as a zero-sized point with its label centred on it, so a
 * node at 0.5 has half a label hanging past the edge of the container. 0.42 is
 * the widest ring that still leaves room for the longest group name at the three
 * and nine o'clock positions, which are the two that reach furthest.
 */
const RING_MAX = 0.42;

/** How much wider than tall the ring is drawn. */
const RING_STRETCH = 1.18;

/**
 * Where the nodes sit, as fractions of the container.
 *
 * A force simulation was the obvious choice and is the wrong one. It would need
 * to run every frame, it settles differently depending on when it starts, and
 * it cannot be tested. This places the groups on a ring instead, deterministic
 * and identical everywhere, with alternating radii so the edges cross at varied
 * angles rather than forming the flat spoked wheel that a constant radius gives.
 *
 * The ring is wider than it is tall, and it is worth being precise about why,
 * because the obvious version of this function is wrong. The container is wider
 * than it is tall, so equal FRACTIONS already produce an ellipse in pixels; the
 * stretch below is on top of that, and it is what makes the ring read as a
 * horizontal system rather than as a clock face. The horizontal radius is
 * therefore the binding constraint, and it is what RING_MAX limits: an earlier
 * version applied the stretch to the full radius and put the three and nine
 * o'clock nodes at x = 1.04 and x = -0.04, outside the box that clips them.
 */
export function ringPositions(count: number): NodePosition[] {
  const out: NodePosition[] = [];
  // Radii are alternated so consecutive nodes sit at different distances, which
  // is what varies the edge angles. Both are expressed as a share of RING_MAX
  // AFTER the stretch, so no combination can leave the box.
  const rx = RING_MAX;
  const ry = RING_MAX / RING_STRETCH;
  for (let i = 0; i < count; i++) {
    // Start at the top and go clockwise, so reading order matches the numbering
    // in the data (01 at twelve o'clock).
    const a = -Math.PI / 2 + (i / count) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 0.76;
    out.push({ x: 0.5 + Math.cos(a) * rx * k, y: 0.5 + Math.sin(a) * ry * k });
  }
  return out;
}

/** Every group id reachable from `id` in one hop. */
export function neighbours(id: string, edges = skillEdges()): string[] {
  const out: string[] = [];
  for (const e of edges) {
    if (e.aId === id) out.push(e.bId);
    else if (e.bId === id) out.push(e.aId);
  }
  return out;
}

/**
 * Is the graph one connected component?
 *
 * Asserted by the tests. An orphaned node in a diagram about how things connect
 * is not a stylistic wobble, it is the diagram contradicting its own thesis.
 */
export function isConnected(groups: readonly SkillGroup[] = skills, edges = skillEdges(groups)): boolean {
  if (groups.length === 0) return true;
  const adj = new Map<string, string[]>();
  for (const g of groups) adj.set(g.id, []);
  for (const e of edges) {
    adj.get(e.aId)?.push(e.bId);
    adj.get(e.bId)?.push(e.aId);
  }
  const seen = new Set<string>([groups[0].id]);
  const stack = [groups[0].id];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const nx of adj.get(cur) ?? []) {
      if (!seen.has(nx)) {
        seen.add(nx);
        stack.push(nx);
      }
    }
  }
  return seen.size === groups.length;
}
