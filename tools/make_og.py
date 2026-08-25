#!/usr/bin/env python3
"""tools/make_og.py — draws public/og.png, the 1200x630 share card.

WHY A SCRIPT AND NOT AN IMAGE. The card has to be regenerated every time the
name, the role line or the tagline changes, and a hand-made PNG goes stale
silently: the page says one thing and every link preview of it says another. So
the strings are READ OUT OF src/data/portfolio.ts, the same single source the
components read, and the card is a build artefact rather than an asset someone
has to remember to update.

WHAT IT IS NOT. It is not a stock image and not a generated illustration, both of
which the brief rules out. Everything here is drawn: a ground, a sparse lattice
that echoes the signature object, one accent hairline, and type.

THE TYPEFACES ARE NOT THE SITE'S. Instrument Serif and Space Grotesk are fetched
by next/font at build time and no font registry is reachable from this
environment, so the card is set in DejaVu Serif and DejaVu Sans, which are the
closest locally available pair. That is a real difference between the card and
the page, and it is worth a deliberate re-render with the real faces whenever the
project is next built somewhere with network access.
"""

import math
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = (ROOT / "src/data/portfolio.ts").read_text(encoding="utf8")

W, H = 1200, 630
GROUND = (10, 10, 10)
INK = (245, 245, 240)
INK_SOFT = (148, 144, 138)
ACCENT = (244, 42, 65)

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def field(name: str) -> str:
    """One string field out of the data file. Fails loudly rather than guessing."""
    m = re.search(rf'^\s*{name}:\s*"([^"]+)",', DATA, re.M)
    if not m:
        raise SystemExit(f"{name} not found in src/data/portfolio.ts")
    return m.group(1)


def name_lines() -> list[str]:
    m = re.search(r"nameLines:\s*\[([^\]]+)\]", DATA)
    if not m:
        raise SystemExit("nameLines not found in src/data/portfolio.ts")
    return re.findall(r'"([^"]+)"', m.group(1))


def tracked(draw, xy, text, font, fill, spacing):
    """Letter-spacing, which PIL does not have. Labels need it; headlines do not."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + spacing
    return x


img = Image.new("RGB", (W, H), GROUND)
d = ImageDraw.Draw(img, "RGBA")

# ---- the lattice --------------------------------------------------------------
# A seeded grid with per-point jitter, densest at the optical centre and thinning
# toward the edges, so it reads as a field with depth rather than as wallpaper.
# The seed is fixed, so this file is byte-identical on every run and does not show
# up as a spurious change in a diff.
rng = random.Random(20260825)
CX, CY = W * 0.5, H * 0.46
for gx in range(-40, W + 40, 26):
    for gy in range(-40, H + 40, 26):
        px = gx + rng.uniform(-7, 7)
        py = gy + rng.uniform(-7, 7)
        falloff = 1 - min(1.0, math.hypot(px - CX, py - CY) / (W * 0.62))
        if rng.random() > falloff * 0.75:
            continue
        r = 1.0 if rng.random() > 0.12 else 1.8
        alpha = int(16 + falloff * 44)
        colour = ACCENT + (alpha + 26,) if rng.random() < 0.035 else INK + (alpha,)
        d.ellipse((px - r, py - r, px + r, py + r), fill=colour)

# A wide, very low vignette so the type sits in a pool of quiet rather than on a
# flat field. Drawn as concentric rounded rectangles because a real gradient would
# need numpy for no visible gain at this size.
for i in range(60):
    t = i / 59
    inset = -160 + t * 300
    d.rounded_rectangle(
        (inset, inset * 0.6, W - inset, H - inset * 0.6),
        radius=420,
        outline=GROUND + (int(9 * (1 - t)),),
        width=14,
    )

# ---- type --------------------------------------------------------------------
PAD = 74

label = ImageFont.truetype(SANS, 17)
role_f = ImageFont.truetype(SANS, 24)
tag_f = ImageFont.truetype(SANS, 22)
mono_f = ImageFont.truetype(SERIF, 30)

tracked(d, (PAD, PAD), "PORTFOLIO", label, INK_SOFT, 3.2)
year = field("year")
tracked(d, (PAD + 148, PAD), f"— {year}", label, ACCENT, 3.2)

lines = name_lines()
# Fitted rather than fixed: the longer of the two words decides the size, so a
# different name does not run off the edge of the card.
size = 122
while size > 60:
    f = ImageFont.truetype(SERIF, size)
    if max(d.textlength(w.upper(), font=f) for w in lines) <= W - PAD * 2 - 90:
        break
    size -= 2
name_f = ImageFont.truetype(SERIF, size)

# Set from the top of the cap line, tight, because the two words are one object.
y = 158
for word in lines:
    d.text((PAD - 4, y), word.upper(), font=name_f, fill=INK)
    y += int(size * 0.98)

# The one accent mark on the card, and it is a rule rather than a fill: the same
# hairline the page uses to separate a section from the next one.
rule_y = y + 22
d.rectangle((PAD, rule_y, PAD + 96, rule_y + 2), fill=ACCENT)
d.rectangle((PAD + 96, rule_y, W - PAD, rule_y + 1), fill=INK + (44,))

d.text((PAD, rule_y + 30), field("role"), font=role_f, fill=INK_SOFT)

# The bottom line is one row: the mark at the lead, the tagline at the trail. They
# share a baseline, and the gap above them is what keeps the mark from reading as
# part of the role line, which is what happened when it sat four pixels below it.
base = H - PAD + 6
tagline = field("tagline")
tag_w = d.textlength(tagline, font=tag_f)
d.text((W - PAD - tag_w, base), tagline, font=tag_f, fill=INK)

monogram = field("monogram")
d.text((PAD, base - 6), f"{monogram}.", font=mono_f, fill=INK)

out = ROOT / "public/og.png"
out.parent.mkdir(parents=True, exist_ok=True)
img.save(out, "PNG", optimize=True)
print(f"wrote {out.relative_to(ROOT)} — {W}x{H}, {out.stat().st_size // 1024} KB")
