import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";

import "@/styles/globals.css";

import SmoothScroll from "@/components/effects/SmoothScroll";
import SignatureCore from "@/components/effects/SignatureCore";
import NoiseOverlay from "@/components/effects/NoiseOverlay";
import ScrollProgress from "@/components/effects/ScrollProgress";
import CustomCursor from "@/components/effects/CustomCursor";
import Loader from "@/components/layout/Loader";
import Nav from "@/components/layout/Nav";
import { person, seo, github } from "@/data/portfolio";

/* ---------------------------------------------------------------------------
 * The document shell.
 *
 * Everything global lives here and nowhere else: the two fonts, the metadata, the
 * skip link, and the five things that are fixed to the viewport rather than part
 * of the page flow. The page itself is `children`, and it is one element deep.
 *
 * ORDER IN THE DOM IS DELIBERATE. The skip link is the first focusable thing on
 * the page, before the loader and before the nav, because a keyboard user pressing
 * Tab on arrival should be offered the content, not the menu. The fixed layers
 * then go behind-to-front, matching the z-index ladder documented in globals.css.
 * ------------------------------------------------------------------------- */

/* Both faces are self-hosted by next/font at build time: no render-blocking
 * request to fonts.googleapis.com, no third-party connection for a European
 * reader to consent to, and no layout shift, because the metrics are known and
 * `display: swap` falls back to a matched system face. */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

const text = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

/* No domain has been chosen yet, and inventing one would put a wrong canonical
 * URL in every share card. So the base comes from the environment and is simply
 * absent until it exists, which is the honest state of affairs. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: seo.title,
  description: seo.description,
  keywords: [...seo.keywords],
  authors: [{ name: person.name, url: github.url }],
  creator: person.name,
  applicationName: `${person.name} — portfolio`,
  openGraph: {
    type: "profile",
    title: seo.title,
    description: seo.description,
    siteName: person.name,
    locale: "en_US",
    images: [{ url: seo.ogImage, width: 1200, height: 630, alt: seo.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: [seo.ogImage],
  },
  robots: { index: true, follow: true },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale and no user-scalable: false. Blocking pinch zoom is a
  // WCAG failure and it is the most common one on a design-led portfolio.
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>

        {/* Fixed layers, back to front. None of them are part of the page flow. */}
        <SmoothScroll />
        <SignatureCore />
        <NoiseOverlay />
        <ScrollProgress />
        <CustomCursor />

        {/* The loader's escape hatch. With JavaScript off, the overlay is in the
            server-rendered HTML and there is no code running to remove it, so the
            entire site would sit behind a black screen forever. A <noscript>
            stylesheet is the one mechanism that applies in exactly that case and
            in no other. Everything else on the page already renders finished
            without JS, because motion reads --p and --e, which default to 1. */}
        <noscript>
          <style>{`.ldr{display:none!important}`}</style>
        </noscript>
        <Loader />
        <Nav />

        <div className="page">
          <main id="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
