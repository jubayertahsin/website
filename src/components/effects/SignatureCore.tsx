"use client";

/* ---------------------------------------------------------------------------
 * SignatureCore — the one motif, mounted once, alive for the whole page.
 *
 * A few hundred points that reorganise as you scroll: a tight shell in the hero,
 * inflating through the opening, snapping into a wired lattice at the skills,
 * spreading into orbital rings around a hub at the projects, and finally
 * converging into the letters J and T at the close. Geometry and the morph
 * schedule live in lib/core-layouts.ts, where they are pure and tested; the
 * monogram is provably a monogram rather than hopefully one.
 *
 * WHY THIS IS A 2D CANVAS AND NOT THREE.JS. Three.js would add roughly 600KB to
 * draw a few hundred points and a few hundred hairlines, and it would invite the
 * page to become a 3D demo, which the brief explicitly rules out. Everything here
 * needs one 4x4-worth of rotation and a perspective divide, which is nine lines of
 * arithmetic. The dependency count stays at four, and the whole effect ships in
 * this file.
 *
 * WHY THERE IS EXACTLY ONE OF THESE. Five separate graphics fading into each other
 * is decoration. One object that never cuts, whose every arrangement is the same
 * point set rearranged, is a through-line: the reader recognises it in the close
 * as the thing they met in the hero. That recognition is the whole point, and it
 * is why point i is deliberately the same point in all five arrangements.
 *
 * It is drawn behind the content at low alpha and it is aria-hidden. It carries no
 * information that is not also written in words somewhere on the page.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef } from "react";
import {
  blendInto,
  buildLayouts,
  CORE_COUNT,
  edgeOpacity,
  latticeEdges,
  layoutAt,
  LAYOUT_STOPS,
  screenY,
  type Edge,
} from "@/lib/core-layouts";
import { lerp } from "@/lib/math";
import { isLowPower, hasFinePointer, pixelRatio, prefersReducedMotion } from "@/lib/env";
import { subscribe } from "@/lib/scroll-store";

/**
 * Where the object sits, how big it is and how bright, per arrangement.
 *
 * It moves out of the way of the copy: right of centre in the hero where the name
 * sits left, hard left through the opening statement, centred and largest at the
 * skills where it IS the content, right again for the projects. Brightest at the
 * monogram, because that is the one moment it is meant to be looked at directly.
 */
const CAM: ReadonlyArray<{ x: number; y: number; s: number; a: number }> = [
  { x: 0.68, y: 0.44, s: 0.3, a: 0.5 }, // seed
  { x: 0.29, y: 0.52, s: 0.44, a: 0.34 }, // expand
  { x: 0.5, y: 0.5, s: 0.5, a: 0.3 }, // lattice
  { x: 0.66, y: 0.52, s: 0.46, a: 0.26 }, // route
  { x: 0.5, y: 0.47, s: 0.4, a: 0.66 }, // monogram
];

export default function SignatureCore() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const narrow = window.innerWidth < 768;
    // Fewer points on a phone and on anything reporting two cores or less. The
    // object is the same object; it is just drawn with a coarser hand, which
    // nobody will notice and which keeps a mid-range Android at 60fps.
    const count = narrow || isLowPower() ? Math.round(CORE_COUNT * 0.45) : CORE_COUNT;

    const layouts = buildLayouts(count);
    const edges: Edge[] = latticeEdges(layouts.lattice, count, 0.2, narrow ? 260 : 700);
    const buf = new Float32Array(count * 3);
    // Screen-space scratch: x, y, and a depth-derived scale. Allocated once,
    // because allocating per frame is how a smooth page acquires a sawtooth
    // garbage-collection profile.
    const sx = new Float32Array(count);
    const sy = new Float32Array(count);
    const sz = new Float32Array(count);

    let w = 0;
    let h = 0;
    let dpr = 1;
    // Declared before `resize`, because `resize` runs immediately below and
    // touching a `let` from a closure before its initialiser has run is a
    // temporal-dead-zone error rather than an undefined.
    let dirty = true;
    let drawn = -1;
    // Pointer parallax, a few pixels at most. This is the object's only source of
    // life when the page is not being scrolled, and it is deliberately
    // input-driven rather than time-driven: a clock would mean redrawing sixty
    // times a second forever, for a wander nobody asked for.
    const ptr = { x: 0, y: 0 };

    const resize = () => {
      dpr = pixelRatio();
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    };
    resize();
    window.addEventListener("resize", resize);

    // Read once, at mount, rather than per frame: getComputedStyle is a layout
    // read, and the palette does not change while the page is open.
    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue("--color-ink").trim() || "#f5f5f0";
    const accent = styles.getPropertyValue("--color-accent").trim() || "#f42a41";

    const draw = (progress: number) => {
      const blend = layoutAt(progress);
      const from = layouts[blend.from];
      const to = layouts[blend.to];
      blendInto(buf, from, to, blend.t, count);

      const camA = CAM[blend.segment];
      const camB = CAM[Math.min(CAM.length - 1, blend.segment + 1)];
      const cx = lerp(camA.x, camB.x, blend.t) * w + ptr.x * 14;
      const cy = lerp(camA.y, camB.y, blend.t) * h + ptr.y * 10;
      const scale = lerp(camA.s, camB.s, blend.t) * Math.min(w, h);
      const alpha = lerp(camA.a, camB.a, blend.t);

      // How far into the monogram we are. Rotation fades out against it, because
      // a spinning monogram is an illegible monogram, and the letters arriving
      // face-on is what makes the ending feel like a decision rather than a pause.
      const mono = blend.segment >= 4 ? 1 : blend.segment === 3 ? blend.t : 0;
      const settle = 1 - mono;

      // Rotation is a pure function of scroll. No clock anywhere in this file, so
      // the object is in exactly the same attitude every time you return to a
      // given scroll position, and it costs nothing at all while you read.
      const ry = (progress * Math.PI * 1.35 + ptr.x * 0.12) * settle;
      const rx = (0.28 + Math.sin(progress * Math.PI * 2) * 0.16 + ptr.y * 0.08) * settle;

      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      for (let i = 0; i < count; i++) {
        const x0 = buf[i * 3];
        const y0 = buf[i * 3 + 1];
        const z0 = buf[i * 3 + 2];
        // Yaw then pitch. Two rotations is enough: a third axis adds nothing the
        // eye can read on a point cloud and costs a third of the inner loop.
        const x1 = x0 * cosY + z0 * sinY;
        const z1 = z0 * cosY - x0 * sinY;
        const y1 = y0 * cosX - z1 * sinX;
        const z2 = z1 * cosX + y0 * sinX;
        const persp = 1 / (1 + z2 * 0.55);
        sx[i] = cx + x1 * persp * scale;
        // Canvas y grows downward and the geometry grows upward, so this negates.
        // The one line of arithmetic in this loop that is not obvious is therefore
        // the one line that is not written here: screenY lives in core-layouts.ts,
        // where the test suite calls the same function to prove the monogram lands
        // the right way up. It used to be inline, and it used to be a plus.
        sy[i] = screenY(cy, y1, persp, scale);
        sz[i] = persp;
      }

      ctx.clearRect(0, 0, w, h);

      const eo = edgeOpacity(progress);
      if (eo > 0.01) {
        ctx.strokeStyle = ink;
        ctx.globalAlpha = alpha * eo * 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const edge of edges) {
          const dx = sx[edge.a] - sx[edge.b];
          const dy = sy[edge.a] - sy[edge.b];
          // Reject edges that got long in screen space. Perspective can stretch a
          // pair that is close in the lattice into a line right across the object,
          // and a handful of those read as mistakes rather than as structure.
          if (dx * dx + dy * dy > scale * scale * 0.36) continue;
          ctx.moveTo(sx[edge.a], sy[edge.a]);
          ctx.lineTo(sx[edge.b], sy[edge.b]);
        }
        ctx.stroke();
      }

      // Two fill passes rather than a style change per point: switching
      // fillStyle mid-loop is the expensive part of canvas 2D, and batching by
      // colour turns a few hundred state changes into two.
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ink;
      for (let i = 0; i < count; i++) {
        if (i % 23 === 0) continue;
        const s = 0.9 + sz[i] * 1.15;
        ctx.fillRect(sx[i] - s / 2, sy[i] - s / 2, s, s);
      }
      // Roughly one point in twenty-three carries the accent. Enough to give the
      // field a pulse and to tie it to the rest of the page; not enough to become
      // a second colour.
      ctx.globalAlpha = Math.min(1, alpha * 1.9);
      ctx.fillStyle = accent;
      for (let i = 0; i < count; i += 23) {
        const s = 1.1 + sz[i] * 1.5;
        ctx.fillRect(sx[i] - s / 2, sy[i] - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    // Pointer parallax is a desktop affordance. On a touchscreen there is no
    // hovering pointer to follow, so the listener is never attached and the object
    // is driven by scroll alone.
    const onPointer = (e: PointerEvent) => {
      ptr.x = (e.clientX / w - 0.5) * 2;
      ptr.y = (e.clientY / h - 0.5) * 2;
      dirty = true;
    };
    const finePointer = hasFinePointer() && !reduced;
    if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });

    const stop = subscribe((f) => {
      // Quantising to a thousandth of the page: a reader sitting still costs
      // exactly nothing, and a reader scrolling gets every frame. This is the
      // dividend of having no clock in the draw function.
      const key = Math.round(f.progress * 1000);
      if (key === drawn && !dirty) return;
      drawn = key;
      dirty = false;
      draw(f.progress);
    });

    return () => {
      stop();
      if (finePointer) window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="core"
      aria-hidden="true"
      // Named for the reader who opens devtools, and a reminder to future edits
      // that the arrangement schedule is data, not magic numbers in this file.
      data-stops={LAYOUT_STOPS.join(",")}
    />
  );
}
