#!/usr/bin/env python3
"""
make_dmg_background.py - render the styled DMG installer background.

Design language mirrors the app: instrument-grade monochrome (near-black
canvas, thin white hairlines, mono caption) with the single yellow RSVP
pivot accent on the wordmark, exactly like the reader highlights its
pivot letter.

Output: build/dmg-background.png at 2x (1320x840 px) tagged 144dpi so
Finder draws it retina-crisp at 660x420 pt. Icon slots are at (165,225)
and (495,225) in points; keep build-dmg.sh's osascript positions in sync.
"""
from PIL import Image, ImageDraw, ImageFont

S = 2  # retina scale
W, H = 660 * S, 420 * S

BG = (7, 7, 8)          # app background #070708
INK = (235, 235, 237)   # near-white
DIM = (110, 110, 116)   # dimmed gray
LINE = (46, 46, 50)     # hairline gray
PIVOT = (255, 214, 10)  # RSVP pivot yellow #ffd60a

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

def font(path, size, index=0):
    return ImageFont.truetype(path, size * S, index=index)

sf_bold = font("/System/Library/Fonts/HelveticaNeue.ttc", 44, index=10)  # HelveticaNeue-Bold
mono = font("/System/Library/Fonts/SFNSMono.ttf", 12)
mono_small = font("/System/Library/Fonts/SFNSMono.ttf", 10)

# ---- wordmark: "flashr" with the pivot letter in yellow, like the reader ----
word = "flashr"
pivot_i = 2  # "a" = the RSVP pivot letter
x = 0
widths = []
for ch in word:
    b = d.textbbox((0, 0), ch, font=sf_bold)
    widths.append(b[2] - b[0])
kern = 2 * S
total = sum(widths) + kern * (len(word) - 1)
x = (W - total) // 2
y = 52 * S
for i, ch in enumerate(word):
    d.text((x, y), ch, font=sf_bold, fill=PIVOT if i == pivot_i else INK)
    x += widths[i] + kern

# hairline under the wordmark with a center tick (the reader's focus mark)
ly = y + 64 * S
d.line([(W // 2 - 120 * S, ly), (W // 2 + 120 * S, ly)], fill=LINE, width=S)
d.line([(W // 2, ly - 5 * S), (W // 2, ly + 5 * S)], fill=PIVOT, width=S)

# ---- icon slots: (165,225) and (495,225) pt, 128pt icons ----
# dashed guide ring under the Applications slot so the target reads as a target
def dashed_circle(cx, cy, r, dash=10, gap=8, width=S, fill=LINE):
    import math
    circ = 2 * math.pi * r
    n = int(circ // ((dash + gap) * S))
    for k in range(n):
        a0 = (k * (dash + gap) * S) / r
        a1 = a0 + (dash * S) / r
        d.arc([cx - r, cy - r, cx + r, cy + r],
              math.degrees(a0), math.degrees(a1), fill=fill, width=width)

dashed_circle(495 * S, 225 * S, 84 * S)

# ---- arrow between the slots ----
ax0, ax1, ay = 258 * S, 392 * S, 225 * S
d.line([(ax0, ay), (ax1 - 14 * S, ay)], fill=INK, width=2 * S)
d.polygon([(ax1, ay), (ax1 - 16 * S, ay - 9 * S), (ax1 - 16 * S, ay + 9 * S)], fill=INK)

# ---- captions ----
def center(text, fnt, cy, fill):
    b = d.textbbox((0, 0), text, font=fnt)
    d.text(((W - (b[2] - b[0])) // 2, cy), text, font=fnt, fill=fill)

center("DRAG TO INSTALL", mono, 330 * S, INK)
center("read anything, one word at a time", mono_small, 356 * S, DIM)

img.save("build/dmg-background.png", dpi=(144, 144))
print("wrote build/dmg-background.png", img.size)
