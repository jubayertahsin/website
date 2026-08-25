/* ---------------------------------------------------------------------------
 * NoiseOverlay — grain and a vignette, in two elements and zero bytes of script.
 *
 * A flat #0A0A0A field is not actually what dark looks like. On an OLED phone it
 * is a void, and on a cheap LCD large flat dark areas band into visible steps.
 * A little grain fixes both: it gives the eye something to hold and it dithers
 * the gradient so the banding has nothing to band against.
 *
 * It is one tiled inline SVG, so there is no image request, and it sits at 3.5%
 * opacity. Grain you can see is a texture effect; grain you cannot see is what
 * makes the black look like paper rather than like a switched-off screen. If it
 * reads as "grungy", it is too strong.
 *
 * The vignette is equally quiet, and it earns its place for a reason beyond mood:
 * the signature core drifts near the edges of the viewport, and a slight fall-off
 * keeps it from colliding with the browser chrome and the nav.
 * ------------------------------------------------------------------------- */

export default function NoiseOverlay() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="vig" aria-hidden="true" />
    </>
  );
}
