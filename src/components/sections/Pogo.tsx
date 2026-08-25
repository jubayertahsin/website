/* ---------------------------------------------------------------------------
 * Pogo — the hero project gets its own chapter.
 *
 * The brief asks for POGO to be visually dominant, and dominance on a page with
 * no imagery has to be built out of scale, scroll room and structure rather than
 * out of a bigger picture. So this is the second of only two pinned scenes with a
 * long span, it holds the largest type on the page after the name itself, and it
 * is the one place where a diagram is drawn rather than described.
 *
 * WHAT THE DIAGRAM IS. Six layers in three tiers, and the tiers are the argument:
 * local and cloud models are the EDGE, the router and the memory are the CORE
 * everything else depends on, and tools and automation are the SURFACE the
 * assistant actually acts through. That shape is why POGO is called an operating
 * system rather than a chat app, and it is stated once here so the rest of the
 * page never has to.
 *
 * HOW IT ASSEMBLES. Each layer owns a slice of the scroll: `--from` is derived in
 * CSS from `--i`, and the layer fades and rises as `--p` crosses it. The order is
 * the data's own order — models, then router and memory, then tools and
 * automation — so the reader watches the system get built in the order it depends
 * on itself. Visual order and DOM order are identical, so nothing here reads
 * differently to a screen reader than it looks. Nothing runs per frame in
 * JavaScript; the whole assembly is arithmetic on one inherited custom property.
 *
 * WHAT IT DOES NOT CLAIM. Status is "Developing", and it says so in the same
 * breath as the diagram. Nothing here says the layers are finished, there are no
 * user counts, no latency figures, no uptime. The layer copy is Jubayer's own
 * description of what each part is FOR.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import ScrollDecrypt from "@/components/animations/ScrollDecrypt";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import StatusPip from "@/components/ui/StatusPip";
import { projects } from "@/data/portfolio";
import { vars } from "@/lib/css";

/** The three tiers, bottom to top, with the word that explains each one. */
const TIERS = [
  { key: "edge", label: "Edge", note: "Where the models live" },
  { key: "core", label: "Core", note: "What everything else depends on" },
  { key: "surface", label: "Surface", note: "Where it acts" },
] as const;

export default function Pogo() {
  // Found rather than indexed: `hero: true` is the marker, so reordering the
  // array cannot silently promote a different project into this chapter.
  const pogo = projects.find((p) => p.hero);
  // Typed as possibly absent, and a chapter about nothing should render nothing
  // rather than crash the page.
  if (!pogo || !pogo.architecture) return null;

  const layers = pogo.architecture;

  return (
    <Scene
      id="pogo"
      className="pogo"
      pin
      start="clamp(top top)"
      end="clamp(+=260%)"
      aria-labelledby="pogo-title"
    >
      <div className="pogo-in">
        <div className="pogo-head">
          <Reveal as="p" className="label pogo-eyebrow">
            The one it is all pointing at
          </Reveal>

          <SplitText
            text={pogo.name}
            by="char"
            as="h2"
            id="pogo-title"
            className="pogo-name"
            stagger={0.35}
          />

          <p className="pogo-type">{pogo.category}</p>

          {/* Ring, not fill: POGO is being built, and the pip says so in exactly
              the vocabulary the rail panels already used. */}
          <StatusPip tone={pogo.tone} className="pogo-status">
            {pogo.status}
          </StatusPip>
        </div>

        {/* The second of the page's three decryptions. It resolves early in the
            scene so the sentence is readable long before the diagram finishes
            assembling underneath it. */}
        <ScrollDecrypt
          lines={["One assistant that knows the whole context."]}
          as="p"
          className="pogo-line"
          from={0.08}
          to={0.34}
        />

        {/* The diagram. A definition list, because that is what it is: six terms
            and what each one is for. The tier rails are decorative and marked so;
            every fact they group is also in the visible copy. */}
        <div className="pogo-stack">
          {TIERS.map((tier) => {
            const rows = layers.filter((l) => l.tier === tier.key);
            if (rows.length === 0) return null;
            return (
              <section
                className="pogo-tier"
                key={tier.key}
                data-tier={tier.key}
                aria-label={`${tier.label}: ${tier.note}`}
              >
                <p className="pogo-tier-label label" aria-hidden="true">
                  <span className="pogo-tier-name">{tier.label}</span>
                  <span className="pogo-tier-note">{tier.note}</span>
                </p>

                <dl className="pogo-layers">
                  {rows.map((layer, r) => {
                    // Global order across all three tiers, so the stack builds
                    // strictly bottom to top rather than two tiers at once.
                    const i = layers.findIndex((l) => l.key === layer.key);
                    return (
                      <div
                        className="pogo-layer"
                        key={layer.key}
                        style={vars({ "--i": i, "--n": layers.length })}
                        data-row={r}
                      >
                        <dt className="pogo-layer-label">{layer.label}</dt>
                        <dd className="pogo-layer-blurb">{layer.blurb}</dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            );
          })}
        </div>

        {/* The historical name, because it is true and because someone who saw
            the earlier work will search for it. One line, no drama. */}
        {pogo.note ? <p className="pogo-note">{pogo.note}</p> : null}
      </div>
    </Scene>
  );
}
