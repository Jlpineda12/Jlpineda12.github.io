"""Animated flat covers for the projects that have no live demo: 4-second motion-graphics loops.

Run:  Blender -b --factory-startup -P blender/covers2d.py -- <frames_dir> [scene]
Then: sh scripts/encode-covers.sh <frames_dir>   (writes public/video/*.mp4 and public/img/*.jpg)
Add a scene function and list it in SCENES to make a cover for a new project.
"""
import sys, os, math, random
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import bpy
from flat2d import *  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = args[0] if args else "/tmp/cover-frames"
ONLY = args[1] if len(args) > 1 else None
W, H, N = 800, 1000, 96
TAU = math.tau


def bake(fn):
    for f in range(1, N + 1):
        fn((f - 1) / N, f)


# LingoPulse: an English-practice app with a 3D pet companion and XP.
def lingopulse():
    flat_scene(W, H, "#f6c7b8", frames=N)
    shape("phone", rrect(220, 120, 360, 740, 56), "#2a2a2e")
    shape("screen", rrect(238, 150, 324, 680, 40), "#ffffff")
    shape("notch", rrect(350, 160, 100, 22, 11), "#2a2a2e")
    shape("xp-bg", rrect(272, 214, 256, 20, 10), "#e9e7e4")
    xp = group("xp", (272, 224))
    shape("xp", rrect(272, 214, 256, 20, 10), "#6fb38a", xp)
    # The companion: a round blue pet that bounces, blinks and squashes.
    pet = group("pet", (400, 640))
    shape("shadow", ellipse(400, 646, 92, 16), "#e9e7e4")
    body = group("body", (400, 640), pet)
    shape("blob", "M300,640 C300,540 344,470 400,470 C456,470 500,540 500,640 Z", "#8c9ee0", body)
    shape("belly", "M346,640 C346,590 370,560 400,560 C430,560 454,590 454,640 Z", "#c9cfee", body)
    eyes = []
    for x in (368, 432):
        g = group(f"eye{x}", (x, 548), body)
        shape("e", ellipse(x, 548, 13, 15), "#2a2a2e", g)
        shape("s", ellipse(x + 4, 543, 4), "#ffffff", g)
        eyes.append(g)
    shape("cheek-l", ellipse(346, 584, 12, 7), "#f6c7b8", body)
    shape("cheek-r", ellipse(454, 584, 12, 7), "#f6c7b8", body)
    shape("mouth", "M386,580 C392,592 408,592 414,580 Z", "#b02e2e", body)
    shape("antenna", rrect(396, 432, 8, 44, 4), "#3d4a7a", body)
    shape("antenna-tip", ellipse(400, 428, 12), "#f2c14e", body)
    # Chat bubbles: the app's lesson, with typing dots.
    b1 = group("bubble1", (300, 300))
    shape("b1", rrect(262, 262, 200, 64, 28), "#3d4a7a", b1)
    for k in range(3):
        shape("d", ellipse(318 + k * 44, 294, 9), "#ffffff", b1)
    b2 = group("bubble2", (520, 390))
    shape("b2", rrect(330, 352, 200, 64, 28), "#b02e2e", b2)
    shape("l1", rrect(354, 372, 120, 10, 5), "#ffffff", b2)
    shape("l2", rrect(354, 390, 80, 10, 5), "#ffffff", b2)
    stars = []
    for i, (x, y) in enumerate(((170, 300), (640, 250), (660, 640))):
        g = group(f"star{i}", (x, y))
        shape("st", f"M{x},{y - 30} L{x + 9},{y - 9} L{x + 30},{y} L{x + 9},{y + 9} L{x},{y + 30} L{x - 9},{y + 9} L{x - 30},{y} L{x - 9},{y - 9} Z", "#f2c14e", g)
        stars.append(g)

    def anim(t, f):
        hop = abs(math.sin(TAU * t * 2))
        key(body, f, dloc=(0, -36 * hop), scale=(1 + 0.08 * (1 - hop) ** 3, 1 - 0.08 * (1 - hop) ** 3))
        blink = 0.1 if (0.46 < t < 0.5 or 0.93 < t < 0.97) else 1
        for g in eyes:
            key(g, f, scale=(1, blink))
        s1 = ease_out_back(min(1, max(0, (t - 0.05) / 0.12))) if t < 0.9 else max(0.001, 1 - (t - 0.9) / 0.08)
        s2 = ease_out_back(min(1, max(0, (t - 0.35) / 0.12))) if t < 0.9 else max(0.001, 1 - (t - 0.9) / 0.08)
        key(b1, f, scale=(max(s1, 0.001),) * 2)
        key(b2, f, scale=(max(s2, 0.001),) * 2)
        key(xp, f, scale=(max(0.04, smooth(t / 0.85)), 1))
        for i, g in enumerate(stars):
            s = 0.6 + 0.4 * math.sin(TAU * t * 2 + i * 2)
            key(g, f, scale=(s, s), rot=40 * math.sin(TAU * t + i))
    bake(anim)


# GameVault: a video-game library with status and scores.
def gamevault():
    flat_scene(W, H, "#2a2a2e", frames=N)
    shape("panel", rrect(90, 130, 620, 740, 32), "#34343a")
    cols = ["#b02e2e", "#8c9ee0", "#f6c7b8", "#6fb38a", "#f2c14e", "#3d4a7a", "#ffffff", "#e39c8b", "#8c9ee0"]
    motifs = ["circle", "tri", "bars", "tri", "circle", "bars", "circle", "bars", "tri"]
    cases = []
    for k in range(9):
        i, j = k % 3, k // 3
        x, y = 130 + i * 186, 170 + j * 214
        g = group(f"case{k}", (x + 78, y + 96))
        shape("c", rrect(x, y, 156, 192, 14), cols[k], g)
        ink = "#2a2a2e" if cols[k] in ("#ffffff", "#f2c14e", "#f6c7b8") else "#ffffff"
        if motifs[k] == "circle":
            shape("m", ellipse(x + 78, y + 86, 34), ink, g)
        elif motifs[k] == "tri":
            shape("m", poly([(x + 44, y + 118), (x + 78, y + 52), (x + 112, y + 118)]), ink, g)
        else:
            for b in range(3):
                shape("m", rrect(x + 46 + b * 24, y + 70 - b * 10, 14, 48 + b * 10, 4), ink, g)
        shape("label", rrect(x + 20, y + 150, 116, 14, 7), ink, g)
        cases.append(g)
    # The score row under the shelf fills star by star.
    shape("score-bg", rrect(130, 800, 540, 46, 23), "#2a2a2e")
    stars = []
    for i in range(5):
        x, y = 170 + i * 56, 823
        g = group(f"s{i}", (x, y))
        shape("off", f"M{x},{y - 18} L{x + 5},{y - 6} L{x + 18},{y - 5} L{x + 8},{y + 3} L{x + 11},{y + 17} L{x},{y + 9} L{x - 11},{y + 17} L{x - 8},{y + 3} L{x - 18},{y - 5} L{x - 5},{y - 6} Z", "#4a4a52", g)
        on = group(f"son{i}", (x, y))
        shape("on", f"M{x},{y - 18} L{x + 5},{y - 6} L{x + 18},{y - 5} L{x + 8},{y + 3} L{x + 11},{y + 17} L{x},{y + 9} L{x - 11},{y + 17} L{x - 8},{y + 3} L{x - 18},{y - 5} L{x - 5},{y - 6} Z", "#f2c14e", on)
        stars.append(on)
    pill = group("pill", (590, 823))
    shape("pill", rrect(520, 806, 140, 34, 17), "#6fb38a", pill)

    def anim(t, f):
        for k, g in enumerate(cases):
            p = (t * 1.25 - k * 0.07)
            if t > 0.9:
                s = max(0.001, 1 - smooth((t - 0.9) / 0.08))
            elif p <= 0:
                s = 0.001
            else:
                s = ease_out_back(min(1, p / 0.12))
            sel = 1.06 if (k == 4 and 0.55 < t < 0.88) else 1
            key(g, f, scale=(s * sel, s * sel))
        for i, g in enumerate(stars):
            p = (t - 0.5 - i * 0.05) / 0.06
            s = 0.001 if (p <= 0 or t > 0.92) else ease_out_back(min(1, p))
            key(g, f, scale=(s, s))
        ps = 0.001 if (t < 0.78 or t > 0.93) else ease_out_back(min(1, (t - 0.78) / 0.08))
        key(pill, f, scale=(ps, ps))
    bake(anim)


# Three.js lab: procedural geometry turning in wireframe.
def threejs_lab():
    flat_scene(W, H, "#3d4a7a", frames=N)

    def ngon(cx, cy, r, n, a0=-90):
        return [(cx + r * math.cos(math.radians(a0 + 360 * k / n)), cy + r * math.sin(math.radians(a0 + 360 * k / n))) for k in range(n)]

    def outline(cx, cy, r, n, w):
        return poly(ngon(cx, cy, r, n)) + " " + poly(ngon(cx, cy, r - w, n))

    shapes = []
    spec = [((400, 420), 200, 6, "#ffffff", 1), ((210, 760), 90, 3, "#f6c7b8", -2), ((590, 760), 90, 4, "#8c9ee0", 2),
            ((400, 420), 120, 5, "#b02e2e", -1), ((400, 760), 70, 8, "#f2c14e", 3)]
    for i, ((cx, cy), r, n, col, sp) in enumerate(spec):
        g = group(f"g{i}", (cx, cy))
        shape("o", outline(cx, cy, r, n, 10), col, g)
        for (x, y) in ngon(cx, cy, r - 5, n):
            shape("v", ellipse(x, y, 10), col, g)
        shapes.append((g, sp))
    # An axes gizmo in the corner, like the editor's.
    gz = group("gizmo", (130, 170))
    shape("x", rrect(130, 165, 90, 10, 5), "#b02e2e", gz)
    shape("y", rrect(125, 80, 10, 90, 5), "#6fb38a", gz)
    shape("z", poly([(128, 166), (136, 174), (80, 226), (72, 218)]), "#8c9ee0", gz)
    shape("o", ellipse(130, 170, 12), "#ffffff", gz)

    def anim(t, f):
        for i, (g, sp) in enumerate(shapes):
            flip = math.cos(TAU * t * (1 if i % 2 else 0.5))
            key(g, f, rot=360 * t * sp / abs(sp) * (1 if abs(sp) < 3 else 2) / 2, scale=(max(0.08, abs(flip)) if i in (0, 3) else 1, 1))
        key(gz, f, rot=20 * math.sin(TAU * t))
    bake(anim)


SCENES = dict(lingopulse=lingopulse, gamevault=gamevault, threejs_lab=threejs_lab)

if __name__ == "__main__":
    for name, fn in SCENES.items():
        if ONLY and ONLY != name:
            continue
        reset()
        fn()
        folder = os.path.join(OUT, name)
        os.makedirs(folder, exist_ok=True)
        render_frames(folder)
        print("rendered", name)
