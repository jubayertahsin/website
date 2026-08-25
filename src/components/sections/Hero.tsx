/* ---------------------------------------------------------------------------
 * Hero — the first screen, and the only one that gets to be quiet.
 *
 * The name is the largest thing on the page and it is set in two lines, because
 * "JUBAYER TAHSIN" on one line at display size either overflows a phone or gets
 * shrunk to the point where it is no longer a display element. Two lines also
 * gives the eye a vertical rhythm to fall down, which is the direction the whole
 * page wants it to go.
 *
 * WHAT IS NOT HERE, deliberately:
 *
 *   No "scroll to explore" cue and no bouncing chevron. The reader is looking at
 *   an unfinished screen with a name at the top of it. The affordance is the page.
 *
 *   No portrait. There is no photograph that would not either be a stock image or
 *   a snapshot, and the brief bans the first while the second would undercut the
 *   typography it sits next to.
 *
 *   No decryption. The signature effect is worth using three times on the page and
 *   this is not one of them: a reader who has been on the site for four hundred
 *   milliseconds should be able to read the name of the person whose site it is.
 *
 * THE ONE MOTION IDEA. Everything in this section is a function of the section's
 * own progress, which runs from the top of the document to one viewport down. So
 * scrolling does not slide the hero away, it disassembles it: the two name lines
 * separate at different rates, the meta row and the actions sink, and the whole
 * block loses contrast as the reader leaves. Because it is `--p`-driven rather
 * than time-driven, scrolling back up reassembles it exactly.
 *
 * A SERVER COMPONENT. Nothing here is interactive except the two Ctas, which are
 * their own client components. The section itself ships no JavaScript beyond the
 * Scene wrapper that publishes `--p`.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import Cta from "@/components/ui/Cta";
import { hero, person } from "@/data/portfolio";

export default function Hero() {
  return (
    <Scene
      id="top"
      className="hero"
      // Starts measuring at the very top and ends one screen down. `clamp()` is
      // what makes the end reachable: without it ScrollTrigger's end lands past
      // the maximum scroll on a short document and progress never reaches 1.
      start="clamp(top top)"
      end="clamp(top+=100% top)"
      aria-labelledby="hero-name"
    >
      <div className="hero-in">
        {/* The role line, in mono, above the name. It is the first thing that
            qualifies the name, and it is the honest description: student first. */}
        <Reveal as="p" className="hero-eyebrow label">
          <span className="hero-eyebrow-mark" aria-hidden="true" />
          {hero.eyebrow}
        </Reveal>

        <h1 className="hero-name" id="hero-name">
          <span className="sr-only">{person.name}</span>
          {/* Two independent SplitTexts rather than one two-line block, because
              the lines are given different parallax rates below and a single
              element cannot have two. `aria-hidden` on both is safe: the whole
              name is announced once by the sr-only span above. */}
          <span className="hero-line" data-line="1" aria-hidden="true">
            <SplitText
              text={hero.lines[0]}
              by="char"
              as="span"
              className="hero-word"
              stagger={0.5}
            />
          </span>
          <span className="hero-line" data-line="2" aria-hidden="true">
            <SplitText
              text={hero.lines[1]}
              by="char"
              as="span"
              className="hero-word"
              stagger={0.5}
            />
          </span>
        </h1>

        {/* The tagline is the four verbs the whole site is organised around, so it
            is set in the display serif rather than the text face, and the words
            are separated by a hairline rather than by punctuation. The interlude
            further down the page expands each one into its own beat. */}
        <Reveal as="p" className="hero-tagline" index={0} total={3} stagger={0.3}>
          {person.creed.map((word, i) => (
            <span className="hero-creed" key={word}>
              {i > 0 ? <span className="hero-creed-sep" aria-hidden="true" /> : null}
              {word}
            </span>
          ))}
        </Reveal>

        <Reveal as="p" className="hero-statement" index={1} total={3} stagger={0.3}>
          {hero.statement}
        </Reveal>

        <Reveal className="hero-actions" index={2} total={3} stagger={0.3}>
          <Cta href={hero.primary.href} variant="fill" cue="Work">
            {hero.primary.label}
          </Cta>
          <Cta href={hero.secondary.href} variant="line" cue="Write">
            {hero.secondary.label}
          </Cta>
        </Reveal>
      </div>

      {/* The footer strip: where he is, and what year this is a portfolio for.
          Two small true facts, set at the bottom margin, which is the convention
          a printed title page would use and the reason this reads as editorial
          rather than as an app. */}
      <div className="hero-foot">
        <p className="hero-foot-item label">{person.location}</p>
        <p className="hero-foot-item label" data-align="end">
          Portfolio {person.year}
        </p>
      </div>
    </Scene>
  );
}
