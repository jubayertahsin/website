/* ---------------------------------------------------------------------------
 * About — "Who is Jubayer?"
 *
 * A pinned scene, and one of only two on the page. It is pinned because the beat
 * needs the frame to stop: a short statement resolves out of noise while the
 * paragraphs that qualify it arrive underneath. If the section scrolled normally
 * the statement would be leaving the screen as it became readable.
 *
 * The decryption is used here and in exactly two other places. This is the one
 * that gets the instrument readout, because this is where the effect is
 * introduced and the readout is the argument that it is real arithmetic rather
 * than a random shuffle.
 *
 * The facts row is four true things with no adjectives. It is deliberately not a
 * grid of cards: the same information as hairline-separated columns takes a third
 * of the vertical space and does not make a student's status look like a product
 * feature list.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import ScrollDecrypt from "@/components/animations/ScrollDecrypt";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import Parallax from "@/components/animations/Parallax";
import { about } from "@/data/portfolio";

export default function About() {
  return (
    <Scene
      id="about"
      className="abt"
      pin
      start="clamp(top top)"
      end="clamp(+=180%)"
      aria-labelledby="abt-title"
    >
      <div className="abt-in">
        <div className="abt-head">
          <Reveal as="p" className="label">
            01 — About
          </Reveal>
          <SplitText
            text={about.heading}
            by="word"
            as="h2"
            id="abt-title"
            className="abt-title"
            stagger={0.4}
          />
        </div>

        {/* The one sentence the section exists to deliver, and the reason it is
            pinned. `from`/`to` place the reveal in the middle third of the
            scene, so it resolves after the heading has landed and before the
            reader starts looking for the way out. */}
        <ScrollDecrypt
          lines={[about.keyStatement]}
          as="p"
          className="abt-key"
          from={0.22}
          to={0.62}
          showReadout
        />

        <div className="abt-body">
          {about.body.map((para, i) => (
            <Reveal
              as="p"
              key={i}
              className="abt-para"
              index={i}
              total={about.body.length}
              stagger={0.5}
            >
              {para}
            </Reveal>
          ))}
        </div>

        <dl className="abt-facts">
          {about.facts.map((fact, i) => (
            <Reveal
              as="div"
              key={fact.key}
              className="abt-fact"
              index={i}
              total={about.facts.length}
              stagger={0.4}
            >
              <dt className="label">{fact.label}</dt>
              <dd className="abt-fact-value">{fact.value}</dd>
            </Reveal>
          ))}
        </dl>

        {/* How he learns, as a row of terms rather than a bulleted list. These
            are the six words he used; nothing is added and nothing is ranked.

            The parallax is deliberately tiny. This block sits at the bottom of a
            pinned scene, and drifting it a few pixels against the paragraphs
            above gives the section depth while the frame is held still. Anything
            larger stops being a depth cue and starts being an effect. */}
        <Parallax depth={34}>
          <Reveal className="abt-method">
            <p className="label abt-method-label">How</p>
            <ul className="abt-method-list">
              {about.method.map((item) => (
                <li className="abt-method-item" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </Parallax>
      </div>
    </Scene>
  );
}
