/* ---------------------------------------------------------------------------
 * The page.
 *
 * Composition only. Every section is its own module and this file's entire job is
 * to state the order, because the order IS the argument and it should be readable
 * in one screen without scrolling through markup to find it.
 *
 * THE SEQUENCE, AND WHY IT IS THIS ONE
 *
 *   Hero        the name, at the size a name deserves. Calm, one screen, no cue.
 *   About       who is asking. Pinned, because the statement needs the frame to
 *               stop while the paragraphs that qualify it arrive.
 *   Creed       four words, one per screen. The trough: the deliberate rest
 *               between the two densest sections on the page.
 *   Skills      eight areas as a system with the evidence for every connection.
 *   Work        five case studies, travelling sideways, because they are peers.
 *   POGO        the peak. The longest pin, the largest type, the one diagram.
 *   Journey     what is true now, and what is intention, drawn differently.
 *   Building    the work that exists, and a plain sentence about the work that
 *               does not: there is no employment history, and it says so.
 *   Education   one entry that is real, one that is a plan.
 *   Services    what he can build, stated as capability and not as an agency.
 *   Proof       where to go and check.
 *   Contact     the close. The signature object reaches the monogram here.
 *
 * The rhythm alternates on purpose. Two pinned scenes and one lateral rail, never
 * adjacent; a quiet section after every dense one; and exactly one section — POGO —
 * given visibly more scroll room than any other, so the page has one peak instead
 * of six competing ones.
 * ------------------------------------------------------------------------- */

import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Creed from "@/components/sections/Creed";
import Skills from "@/components/sections/Skills";
import Work from "@/components/sections/Work";
import Pogo from "@/components/sections/Pogo";
import Journey from "@/components/sections/Journey";
import Building from "@/components/sections/Building";
import Education from "@/components/sections/Education";
import Services from "@/components/sections/Services";
import Proof from "@/components/sections/Proof";
import Contact from "@/components/sections/Contact";

export default function Page() {
  return (
    <>
      <Hero />
      <About />
      <Creed />
      <Skills />
      <Work />
      <Pogo />
      <Journey />
      <Building />
      <Education />
      <Services />
      <Proof />
      <Contact />
    </>
  );
}
