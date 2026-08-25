/* ---------------------------------------------------------------------------
 * Skills — the section that wraps the graph, plus the AI stack strip.
 *
 * Two blocks, and the order matters. The graph first, because it is the argument:
 * these are the areas, and here is how they connect. The stack strip second,
 * because it is the evidence — the actual named tools — and evidence should
 * follow the claim rather than lead it.
 *
 * The architecture row at the end is the conceptual shape POGO is built around,
 * stated once here in six words so the project chapter later does not have to
 * explain it from scratch.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import SectionHead from "@/components/ui/SectionHead";
import Reveal from "@/components/animations/Reveal";
import SkillGraph from "@/components/sections/SkillGraph";
import { aiEcosystem, skills } from "@/data/portfolio";

export default function Skills() {
  return (
    <Scene
      id="skills"
      className="skl"
      start="clamp(top 80%)"
      end="clamp(top 20%)"
      aria-labelledby="skl-title"
    >
      <div className="skl-in">
        <SectionHead
          label="02 — Skills"
          title="Eight areas, one system"
          id="skl-title"
          lede={`No percentages and no levels, because there is no honest way to put a number on any of this. ${skills.length} groups, and every line between them is drawn from something they actually share.`}
        />

        <SkillGraph />

        {/* The named tools. A plain list of terms, hairline-separated, because
            each one is a fact and none of them needs a logo. Avoiding brand
            marks here is also what keeps the page free of other people's
            trademarks. */}
        <div className="skl-stack">
          <Reveal as="p" className="label skl-stack-label">
            {aiEcosystem.heading}
          </Reveal>
          <ul className="skl-terms">
            {aiEcosystem.platforms.map((item, i) => (
              <Reveal
                as="li"
                key={item}
                className="skl-term"
                index={i}
                total={aiEcosystem.platforms.length}
                stagger={0.6}
              >
                {item}
              </Reveal>
            ))}
          </ul>
        </div>

        {/* Six words in order: the shape the AI work keeps taking. Rendered as an
            ordered list because the order is the point — local and cloud feed a
            router, the router sits on memory, tools and automation sit on top. */}
        <Reveal className="skl-arch">
          <p className="label skl-arch-label">The shape it keeps taking</p>
          <ol className="skl-arch-list">
            {aiEcosystem.architecture.map((layer, i) => (
              <li className="skl-arch-item" key={layer}>
                <span className="skl-arch-num label">{String(i + 1).padStart(2, "0")}</span>
                {layer}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </Scene>
  );
}
