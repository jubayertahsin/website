/* ---------------------------------------------------------------------------
 * Work — the five case studies, travelling sideways.
 *
 * WHY LATERAL, ONCE. Vertical scrolling reads as argument: this, then this,
 * therefore that. Lateral travel reads as survey: a set of things that sit beside
 * each other as peers. The five projects genuinely are peers, which is why this
 * is the only horizontal movement on the page. A second one would make the
 * gesture meaningless.
 *
 * The rail component owns the pin, the transform and the focus-follows-tab
 * behaviour. This file's only jobs are to choose the header, hand over the right
 * panel count, and put POGO first — because it is the hero project, and the one
 * thing a reader should meet before they decide whether to keep going.
 *
 * The count is derived from the array rather than written as 5. There is one place
 * where the number of projects lives and it is portfolio.ts.
 * ------------------------------------------------------------------------- */

import HorizontalScroll from "@/components/animations/HorizontalScroll";
import SectionHead from "@/components/ui/SectionHead";
import ProjectPanel from "@/components/sections/ProjectPanel";
import { projects } from "@/data/portfolio";

export default function Work() {
  return (
    <HorizontalScroll
      id="work"
      className="work"
      count={projects.length}
      aria-labelledby="work-title"
      header={
        <SectionHead
          label="03 — Work"
          title="Five things, built to find out"
          id="work-title"
          size="head"
          lede="Infrastructure more than apps: the layer underneath the model rather than the prompt on top of it. Every status below is the real one."
        />
      }
    >
      {projects.map((project, i) => (
        <ProjectPanel key={project.id} project={project} index={i} />
      ))}
    </HorizontalScroll>
  );
}
