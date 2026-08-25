/* ---------------------------------------------------------------------------
 * Services — "What I can build", and the framing line is not decoration.
 *
 * The brief forbids claiming agency or company status, so the section is written
 * as capability rather than as an offer: five things he can build, and one
 * sentence saying plainly that this is one student and not a studio. There is no
 * pricing, no packages, no "starting from", no availability calendar, because
 * every one of those implies a business that does not exist yet.
 *
 * The layout is the loudest thing in the back half of the page and that is
 * deliberate: five lines of display type, each one a row that lights on hover.
 * After three dense, factual sections a reader needs something that moves quickly,
 * and a numbered list of large type is read in seconds.
 *
 * It is a list, not a set of links. Nothing here is clickable, because there is
 * nowhere honest for a click to go — the contact section immediately below is the
 * one action on the page.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import { services } from "@/data/portfolio";

export default function Services() {
  return (
    <Scene
      id="services"
      className="srv"
      start="clamp(top 85%)"
      end="clamp(bottom 40%)"
      aria-labelledby="srv-title"
    >
      <div className="srv-in">
        <div className="srv-head">
          <Reveal as="p" className="label">
            07 — Capability
          </Reveal>
          <SplitText
            text={services.heading}
            by="word"
            as="h2"
            id="srv-title"
            className="srv-title"
            stagger={0.45}
          />
          {/* The one sentence that stops this reading as an agency page. */}
          <Reveal as="p" className="srv-framing">
            {services.framing}
          </Reveal>
        </div>

        <ul className="srv-list">
          {services.items.map((item, i) => (
            <Reveal
              as="li"
              key={item.index}
              className="srv-item"
              index={i}
              total={services.items.length}
              stagger={0.5}
            >
              <span className="srv-num label">{item.index}</span>
              <span className="srv-label">{item.label}</span>
              <span className="srv-line">{item.line}</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </Scene>
  );
}
