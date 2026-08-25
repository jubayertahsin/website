/* ---------------------------------------------------------------------------
 * Contact — the close. "Let's build something."
 *
 * The last screen has to resolve rather than trail off, so this section is not a
 * footer with links in six-point type. It is a full screen: the sentence at
 * display scale, one primary action, and the channels stated as facts underneath.
 * The signature core reaches the monogram arrangement over exactly this stretch of
 * the document, so the object the reader met in the hero is what they are looking
 * at when they finish. That is the through-line closing, and it is why this
 * section is deliberately quiet in every other respect.
 *
 * PUBLIC CHANNELS ONLY. Every value here comes from `contact` and `social` in
 * portfolio.ts, which hold the details Jubayer designated public and nothing else.
 * There is no date of birth, no address, no second email, no credential of any
 * kind anywhere in the project, and tools/check_source.mjs fails the build if
 * anything shaped like one appears.
 *
 * The third and last decryption on the page lands here, on the closing line. Three
 * uses across a whole page is the difference between a signature and a gimmick:
 * the About statement introduces it, the POGO line reprises it, and this one
 * closes it.
 * ------------------------------------------------------------------------- */

import Scene from "@/components/animations/Scene";
import ScrollDecrypt from "@/components/animations/ScrollDecrypt";
import SplitText from "@/components/animations/SplitText";
import Reveal from "@/components/animations/Reveal";
import Cta from "@/components/ui/Cta";
import { contact, person, social } from "@/data/portfolio";

export default function Contact() {
  return (
    <Scene
      as="footer"
      id="contact"
      className="cnt"
      start="clamp(top 80%)"
      end="clamp(bottom bottom)"
      aria-labelledby="cnt-title"
    >
      <div className="cnt-in">
        <div className="cnt-head">
          <Reveal as="p" className="label">
            09 — Contact
          </Reveal>
          {/* The heading is the sentence. Char-split, because four words at this
              size assembling letter by letter is the last piece of motion on the
              page and it should feel like a decision. */}
          <SplitText
            text={contact.heading}
            by="char"
            as="h2"
            id="cnt-title"
            className="cnt-title"
            stagger={0.3}
          />
        </div>

        <ScrollDecrypt
          lines={[contact.line]}
          as="p"
          className="cnt-line"
          from={0.18}
          to={0.5}
        />

        <div className="cnt-actions">
          <Cta href={contact.primary.href} variant="fill" cue="Write">
            {contact.primary.label}
          </Cta>
          <Cta href={contact.secondary.href} variant="line" cue="Open">
            {contact.secondary.label}
          </Cta>
        </div>

        {/* The channels, as a definition list of facts. A phone number is a fact,
            not a button, and marking it up as a link is enough. */}
        <dl className="cnt-channels">
          <div className="cnt-channel">
            <dt className="label">Email</dt>
            <dd>
              <a className="ul" href={`mailto:${contact.email}`} data-cursor="Write">
                {contact.email}
              </a>
            </dd>
          </div>
          <div className="cnt-channel">
            <dt className="label">Phone</dt>
            <dd>
              <a className="ul" href={`tel:${contact.phone}`} data-cursor="Call">
                {contact.phone}
              </a>
            </dd>
          </div>
          <div className="cnt-channel">
            <dt className="label">Telegram</dt>
            <dd>
              <a
                className="ul"
                href={contact.telegram.url}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Open"
              >
                {contact.telegram.handle}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </dd>
          </div>
        </dl>

        <nav className="cnt-social" aria-label="Social profiles">
          <ul className="cnt-social-list">
            {social.map((item, i) => (
              <Reveal
                as="li"
                key={item.key}
                className="cnt-social-item"
                index={i}
                total={social.length}
                stagger={0.5}
              >
                <a
                  className="ul"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="Open"
                >
                  {item.label}
                  <span className="cnt-social-handle">{item.handle}</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Reveal>
            ))}
          </ul>
        </nav>

        {/* The last line on the page: the monogram the core has just drawn, in
            type, so it is also there for a reader who cannot see the canvas. */}
        <div className="cnt-foot">
          <p className="cnt-mark" aria-hidden="true">
            {person.monogram}
          </p>
          <p className="cnt-foot-line">
            {person.name} — {person.location}. Portfolio {person.year}.
          </p>
        </div>
      </div>
    </Scene>
  );
}
