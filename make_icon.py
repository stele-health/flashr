#!/usr/bin/env python3
"""Flashr Mac app icon: bold 'F' lettermark + red pivot dot on near-black squircle.
Pure standard library. Usage: make_icon.py [size] [out.png]"""
import os, sys, zlib, struct, math

# Colors
BG_TOP = (18, 18, 21)       # near-black top (slightly lighter)
BG_BOT = (7,  7,  9)        # near-black bottom
FG     = (245, 245, 246)    # white lettermark
DOT    = (231, 76,  60)     # red pivot dot (#e74c3c)

# Bold F lettermark — normalized [0,1] coords (y down).
# Three filled rectangles: vertical bar, top bar, middle bar.
F_RECTS = [
    (0.225, 0.195, 0.370, 0.810),   # vertical bar
    (0.225, 0.195, 0.720, 0.340),   # top horizontal
    (0.225, 0.455, 0.590, 0.595),   # middle horizontal
]

# Red dot — the brand accent that echoes "flashr•"
DOT_CX, DOT_CY, DOT_R = 0.715, 0.720, 0.072


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def in_squircle(x, y, W, r):
    """True if pixel (x,y) is inside the rounded rectangle of size W with corner radius r."""
    if x < r and y < r:
        return (x - r) ** 2 + (y - r) ** 2 <= r * r
    if x > W - r and y < r:
        return (x - (W - r)) ** 2 + (y - r) ** 2 <= r * r
    if x < r and y > W - r:
        return (x - r) ** 2 + (y - (W - r)) ** 2 <= r * r
    if x > W - r and y > W - r:
        return (x - (W - r)) ** 2 + (y - (W - r)) ** 2 <= r * r
    return True


def write_png(path, size, rgba):
    def chunk(typ, data):
        c = zlib.crc32(typ + data) & 0xffffffff
        return struct.pack('>I', len(data)) + typ + data + struct.pack('>I', c)
    raw = bytearray()
    stride = size * 4
    for yy in range(size):
        raw.append(0)
        raw += rgba[yy * stride:(yy + 1) * stride]
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def render(size, S=2):
    W = size * S
    r = 0.224 * W                   # macOS continuous-corner radius

    hi = bytearray(W * W * 4)

    for y in range(W):
        yc = y + 0.5
        ny = yc / W                 # normalized y in [0,1]
        base = y * W * 4
        for x in range(W):
            xc = x + 0.5
            nx = xc / W             # normalized x in [0,1]
            i = base + x * 4

            if not in_squircle(xc, yc, W, r):
                continue            # transparent (alpha stays 0)

            # Background: vertical gradient
            bg = lerp(BG_TOP, BG_BOT, ny)

            # F lettermark
            in_f = any(x1 <= nx < x2 and y1 <= ny < y2
                       for (x1, y1, x2, y2) in F_RECTS)

            # Red dot
            ddx, ddy = nx - DOT_CX, ny - DOT_CY
            in_dot = (ddx * ddx + ddy * ddy) <= DOT_R * DOT_R

            # Soft inner shadow under the dot for depth
            glow_r = DOT_R * 1.7
            in_glow = (ddx * ddx + ddy * ddy) <= glow_r * glow_r

            if in_dot:
                col = DOT
            elif in_f:
                col = FG
            elif in_glow and not in_f:
                # Very subtle warm haze around dot
                dist = math.sqrt(ddx * ddx + ddy * ddy)
                t = 1.0 - (dist - DOT_R) / (glow_r - DOT_R)
                t = t * t * 0.10    # very faint
                col = lerp(bg, DOT, t)
            else:
                col = bg

            hi[i] = col[0]; hi[i+1] = col[1]; hi[i+2] = col[2]; hi[i+3] = 255

    # Downsample S:1 with alpha-weighted averaging
    out = bytearray(size * size * 4)
    area = S * S
    for oy in range(size):
        for ox in range(size):
            ar = ag = ab = aa = 0
            for sy in range(S):
                row = ((oy * S + sy) * W + ox * S) * 4
                for sx in range(S):
                    k = row + sx * 4
                    a = hi[k + 3]
                    ar += hi[k] * a; ag += hi[k+1] * a; ab += hi[k+2] * a; aa += a
            i = (oy * size + ox) * 4
            if aa:
                out[i] = ar // aa; out[i+1] = ag // aa; out[i+2] = ab // aa
                out[i+3] = aa // area
    return out


if __name__ == '__main__':
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
    path = sys.argv[2] if len(sys.argv) > 2 else 'build/icon_1024.png'
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    write_png(path, size, render(size))
    print('wrote', path, size)
