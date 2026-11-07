"""The floating islands of the journey: transparent flat PNGs rendered in Blender.

Run:  Blender -b --factory-startup -P blender/world2d.py -- <project_root>
Writes public/world/*.png (2x size for sharp screens).
"""
import sys, os, math
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import bpy
from flat2d import *  # noqa

C = dict(grass="#6fb38a", grass_dark="#5a9c75", rock="#e39c8b", rock_dark="#d48a7a", ink="#2a2a2e",
         red="#b02e2e", peach="#f6c7b8", blue="#8c9ee0", deep="#3d4a7a", white="#ffffff", grey="#e9e7e4",
         wood="#8a5a3c", leaf="#4f9a6b", yellow="#f2c14e")


def island(cx, top, w, depth):
    """Grass slab with a rocky underside pointing down. top = y of the grass surface."""
    l, r = cx - w / 2, cx + w / 2
    shape("rock", f"M{l + 10},{top + 6} C{l + w * 0.18},{top + depth * 0.3} {cx - w * 0.2},{top + depth * 0.75} {cx},{top + depth} "
          f"C{cx + w * 0.2},{top + depth * 0.75} {r - w * 0.18},{top + depth * 0.3} {r - 10},{top + 6} Z", C["rock"])
    shape("strata", f"M{l + w * 0.12},{top + depth * 0.22} C{cx - w * 0.2},{top + depth * 0.3} {cx + w * 0.2},{top + depth * 0.3} {r - w * 0.12},{top + depth * 0.22} "
          f"C{r - w * 0.18},{top + depth * 0.34} {cx + w * 0.2},{top + depth * 0.4} {cx},{top + depth * 0.4} "
          f"C{cx - w * 0.2},{top + depth * 0.4} {l + w * 0.18},{top + depth * 0.34} {l + w * 0.12},{top + depth * 0.22} Z", C["rock_dark"])
    shape("grass", f"M{l},{top} C{l},{top - 40} {r},{top - 40} {r},{top} C{r},{top + 26} {l},{top + 26} {l},{top} Z", C["grass"])
    shape("grass-lip", f"M{l},{top} C{l},{top + 26} {r},{top + 26} {r},{top} C{r},{top + 16} {r - 30},{top + 30} {r - 70},{top + 30} "
          f"C{cx + 40},{top + 30} {cx + 20},{top + 22} {cx},{top + 26} C{cx - 40},{top + 32} {l + 50},{top + 30} {l},{top} Z", C["grass_dark"])


def tree(x, base, h, r):
    shape("trunk", rrect(x - 7, base - h, 14, h, 6), C["wood"])
    shape("crown", ellipse(x, base - h - r * 0.6, r), C["leaf"])


def studio():  # About me: the desk where the work happens.
    flat_scene(900, 760)
    island(450, 470, 700, 270)
    tree(170, 462, 80, 48)
    shape("rug", ellipse(470, 468, 210, 22), C["peach"])
    shape("desk-top", rrect(300, 360, 340, 22, 8), C["wood"])
    shape("leg-l", rrect(318, 380, 16, 88, 6), C["wood"])
    shape("leg-r", rrect(606, 380, 16, 88, 6), C["wood"])
    shape("monitor", rrect(360, 210, 230, 146, 14), C["ink"])
    shape("screen", rrect(372, 222, 206, 118, 8), C["deep"])
    for i, (w, col) in enumerate(((120, C["blue"]), (80, C["peach"]), (150, C["white"]), (60, C["red"]), (100, C["blue"]))):
        shape(f"code{i}", rrect(388 + (20 if i in (2, 3) else 0), 236 + i * 20, w, 9, 4.5), col)
    shape("stand", rrect(460, 352, 30, 12, 4), C["ink"])
    shape("keyboard", rrect(400, 350, 140, 12, 6), C["grey"])
    shape("pad", "M570,346 C570,338 576,334 584,334 L620,334 C628,334 634,338 634,346 L636,356 C636,362 628,364 622,360 L614,354 L590,354 L582,360 C576,364 568,362 568,356 Z", C["grey"])
    shape("mug", rrect(316, 326, 30, 36, 6), C["red"])
    shape("mug-handle", ring(316, 344, 12, 5), C["red"])
    shape("lamp-arm", "M640,360 L652,360 L700,260 L688,254 Z", C["ink"])
    shape("lamp-head", poly([(670, 250), (720, 236), (734, 270), (690, 284)]), C["red"])
    shape("plant-pot", rrect(700, 420, 50, 48, 8), C["white"])
    for a in (-30, 0, 30):
        x = 725 + a * 0.8
        shape("leaf", ellipse(x, 400 - abs(a) * 0.3, 14, 30), C["leaf"])
    shape("chair-back", rrect(430, 330, 90, 110, 20), C["blue"])
    shape("chair-seat", rrect(420, 420, 110, 22, 10), C["blue"])
    shape("chair-post", rrect(468, 440, 14, 28, 4), C["ink"])


def idea():  # Process: the idea.
    flat_scene(600, 640)
    island(300, 420, 420, 200)
    shape("glow", ellipse(300, 210, 120), "#fbe3da")
    shape("bulb", "M300,100 C356,100 396,142 396,196 C396,236 372,258 356,282 C348,294 346,304 346,318 L254,318 "
          "C254,304 252,294 244,282 C228,258 204,236 204,196 C204,142 244,100 300,100 Z", C["yellow"])
    shape("shine", "M248,170 C252,140 272,124 296,120 L298,134 C278,138 266,150 262,172 Z", C["white"])
    shape("filament", "M272,300 L272,240 L288,262 L300,236 L312,262 L328,240 L328,300 L318,300 L318,268 L312,280 L300,256 L288,280 L282,268 L282,300 Z", "#e2a53a")
    shape("base1", rrect(256, 318, 88, 22, 8), C["grey"])
    shape("base2", rrect(262, 340, 76, 20, 8), C["ink"])
    shape("base3", rrect(278, 360, 44, 16, 8), C["ink"])
    for a in range(5):
        ang = math.radians(-160 + a * 35)
        x, y = 300 + math.cos(ang) * 150, 200 + math.sin(ang) * 150
        shape("ray", rrect(x - 7, y - 7, 14, 14, 7), C["red"])


def prototipo():  # Process: the prototype (blocks being stacked).
    flat_scene(600, 640)
    island(300, 420, 420, 200)
    blocks = [(170, 330, 110, 90, C["red"]), (290, 330, 140, 90, C["blue"]), (210, 240, 120, 90, C["peach"]),
              (340, 250, 80, 80, C["white"]), (250, 160, 90, 80, C["deep"])]
    for x, y, w, h, col in blocks:
        shape("block", rrect(x, y, w, h, 12), col)
        shape("stud", rrect(x + w / 2 - 18, y - 12, 36, 14, 6), col)
    shape("crane", rrect(452, 120, 12, 300, 4), C["ink"])
    shape("arm", rrect(330, 112, 140, 12, 4), C["ink"])
    shape("hook-line", rrect(358, 124, 4, 60, 2), C["ink"])
    shape("hook-block", rrect(326, 184, 68, 50, 10), C["yellow"])


def pruebas():  # Process: playtesting (controller + check marks).
    flat_scene(600, 640)
    island(300, 420, 420, 200)
    shape("screen", rrect(150, 120, 300, 200, 20), C["ink"])
    shape("screen-in", rrect(166, 136, 268, 168, 10), C["blue"])
    shape("ground", rrect(166, 260, 268, 44, 0), C["grass"])
    shape("player", rrect(220, 222, 30, 38, 8), C["red"])
    shape("coin", ellipse(330, 200, 16), C["yellow"])
    shape("check-bg", ellipse(430, 136, 44), C["grass_dark"])
    shape("check", "M408,136 L422,122 L428,128 L452,104 L464,116 L428,152 Z", C["white"])
    shape("pad", "M200,350 C200,330 216,320 236,320 L364,320 C384,320 400,330 400,350 L412,404 C416,424 398,436 380,428 L346,410 "
          "L254,410 L220,428 C202,436 184,424 188,404 Z", C["grey"])
    shape("dpad-h", rrect(232, 356, 44, 14, 4), C["ink"])
    shape("dpad-v", rrect(247, 341, 14, 44, 4), C["ink"])
    for i, (x, y, col) in enumerate(((350, 348, C["red"]), (372, 368, C["blue"]), (328, 368, C["yellow"]), (350, 388, C["grass_dark"]))):
        shape(f"btn{i}", ellipse(x, y, 10), col)


def lanzamiento():  # Process: launch (a rocket leaving the island).
    flat_scene(600, 640)
    island(300, 420, 420, 200)
    shape("smoke1", ellipse(250, 404, 44, 30), C["white"])
    shape("smoke2", ellipse(350, 404, 50, 32), C["white"])
    shape("smoke3", ellipse(300, 386, 46, 34), C["grey"])
    shape("flame", "M276,330 C276,360 290,378 300,396 C310,378 324,360 324,330 Z", C["yellow"])
    shape("flame-in", "M288,330 C288,348 296,362 300,372 C304,362 312,348 312,330 Z", C["red"])
    shape("fin-l", "M262,262 L222,322 L222,340 L268,316 Z", C["red"])
    shape("fin-r", "M338,262 L378,322 L378,340 L332,316 Z", C["red"])
    shape("body", "M300,70 C346,110 352,190 344,330 L256,330 C248,190 254,110 300,70 Z", C["white"])
    shape("nose", "M300,70 C322,88 334,110 340,134 L260,134 C266,110 278,88 300,70 Z", C["red"])
    shape("window", ellipse(300, 196, 28), C["deep"])
    shape("window-rim", ring(300, 196, 34, 7), C["grey"])
    shape("band", rrect(254, 286, 92, 16, 4), C["blue"])
    for x, y in ((130, 150), (470, 110), (500, 260), (110, 300)):
        shape("star", f"M{x},{y - 14} L{x + 4},{y - 4} L{x + 14},{y} L{x + 4},{y + 4} L{x},{y + 14} L{x - 4},{y + 4} L{x - 14},{y} L{x - 4},{y - 4} Z", C["yellow"])


def contacto():  # Contact: a mailbox with a letter on its way.
    flat_scene(700, 660)
    island(330, 450, 480, 210)
    tree(560, 442, 70, 40)
    shape("post", rrect(316, 300, 28, 150, 6), C["wood"])
    shape("box", "M230,220 C230,180 262,150 302,150 L420,150 C460,150 470,180 470,220 L470,310 L230,310 Z", C["red"])
    shape("box-door", "M230,220 C230,180 262,150 302,150 C342,150 374,180 374,220 L374,310 L230,310 Z", "#c94040")
    shape("slot", rrect(262, 228, 80, 12, 6), C["ink"])
    shape("flag-pole", rrect(472, 170, 12, 110, 4), C["ink"])
    shape("flag", poly([(484, 170), (540, 186), (484, 204)]), C["yellow"])
    shape("letter", "M420,60 L560,60 L560,150 L420,150 Z", C["white"])
    shape("letter-v", "M420,60 L490,112 L560,60 L560,72 L490,124 L420,72 Z", C["grey"])
    shape("heart", "M490,96 C490,84 506,82 510,92 C514,82 530,84 530,96 C530,108 510,118 510,122 C510,118 490,108 490,96 Z", C["red"])


def nube():  # Two clouds for parallax.
    flat_scene(520, 220)
    shape("c1", rrect(30, 110, 460, 80, 40), C["white"])
    shape("c2", ellipse(180, 110, 80), C["white"])
    shape("c3", ellipse(310, 100, 100), C["white"])
    shape("c4", ellipse(410, 140, 55), C["white"])


ITEMS = dict(estudio=studio, idea=idea, prototipo=prototipo, pruebas=pruebas, lanzamiento=lanzamiento,
             contacto=contacto, nube=nube)


def mundo_juegos():  # World: video games (an arcade cabinet).
    flat_scene(600, 640)
    island(300, 430, 440, 200)
    shape("coin-glow", ellipse(470, 170, 34), "#fbe3da")
    shape("coin", ellipse(470, 170, 24), C["yellow"])
    shape("coin-in", rrect(466, 156, 8, 28, 4), "#e2a53a")
    shape("cab-side", "M200,430 L200,140 C200,110 220,96 250,96 L350,96 C380,96 400,110 400,140 L400,430 Z", C["red"])
    shape("marquee", rrect(214, 108, 172, 40, 12), C["yellow"])
    shape("screen-bezel", rrect(214, 160, 172, 132, 14), C["ink"])
    shape("screen", rrect(226, 172, 148, 108, 8), C["deep"])
    for (x, y) in ((262, 196), (270, 196), (286, 196), (294, 196), (258, 204), (266, 204), (274, 204), (282, 204), (290, 204), (298, 204),
                   (254, 212), (262, 212), (278, 212), (294, 212), (302, 212), (254, 220), (302, 220), (262, 228), (294, 228)):
        shape("px", rrect(x + 20, y + 8, 8, 8, 1), C["grass"])
    shape("ship", poly([(300, 266), (316, 256), (332, 266)]), C["peach"])
    shape("panel", "M204,300 L396,300 L408,350 L192,350 Z", "#c94040")
    shape("stick", rrect(244, 300, 8, 30, 4), C["ink"])
    shape("ball", ellipse(248, 298, 13), C["yellow"])
    shape("btn1", ellipse(320, 326, 11), C["blue"])
    shape("btn2", ellipse(352, 320, 11), C["white"])
    shape("slot", rrect(278, 376, 44, 30, 6), C["ink"])
    shape("slot-in", rrect(296, 382, 8, 18, 3), C["yellow"])


def mundo_vr():  # World: virtual reality (a headset and a portal).
    flat_scene(600, 640)
    island(300, 430, 440, 200)
    shape("portal", ring(300, 300, 150, 22), C["blue"])
    shape("portal-in", ellipse(300, 300, 128), "#c9cfee")
    for (x, y, r) in ((250, 250, 10), (360, 230, 6), (330, 360, 8), (230, 340, 5)):
        shape("spark", ellipse(x, y, r), C["white"])
    shape("strap", rrect(140, 268, 320, 34, 17), C["ink"])
    shape("visor", rrect(190, 236, 220, 120, 46), C["white"])
    shape("glass", rrect(208, 254, 184, 70, 30), C["deep"])
    shape("shine", "M226,268 C240,258 262,256 282,258 L280,268 C262,266 244,268 232,276 Z", C["blue"])
    shape("nose", "M276,356 C276,336 288,326 300,326 C312,326 324,336 324,356 Z", C["ink"])
    shape("led", ellipse(386, 250, 6), C["red"])


def mundo_rigging():  # World: 3D modelling and rigging (a posed figure with its bones).
    flat_scene(600, 640)
    island(300, 430, 440, 200)
    sk = C["peach"]
    shape("leg-l", "M276,300 L250,420 L270,424 L298,306 Z", sk)
    shape("leg-r", "M310,300 L352,414 L370,404 L330,296 Z", sk)
    shape("torso", rrect(262, 186, 78, 124, 30), sk)
    shape("arm-l", "M268,200 L196,250 L208,268 L282,222 Z", sk)
    shape("arm-r", "M334,198 L388,130 L404,142 L350,218 Z", sk)
    shape("head", ellipse(300, 150, 40), sk)
    bone = C["ink"]
    joints = {"head": (300, 150), "neck": (300, 196), "hip": (302, 296), "hand-l": (200, 260), "elbow-l": (236, 232),
              "hand-r": (398, 134), "elbow-r": (368, 172), "knee-l": (268, 360), "foot-l": (258, 420), "knee-r": (340, 356), "foot-r": (362, 408)}
    def bone_seg(a, b, w=7):
        (x1, y1), (x2, y2) = joints[a], joints[b]
        dx, dy = x2 - x1, y2 - y1
        l = math.hypot(dx, dy) or 1
        nx, ny = -dy / l * w, dx / l * w
        shape("bone", f"M{x1 + nx},{y1 + ny} L{x2},{y2} L{x1 - nx},{y1 - ny} Z", bone)
    for a, b in (("head", "neck"), ("neck", "hip"), ("neck", "elbow-l"), ("elbow-l", "hand-l"), ("neck", "elbow-r"),
                 ("elbow-r", "hand-r"), ("hip", "knee-l"), ("knee-l", "foot-l"), ("hip", "knee-r"), ("knee-r", "foot-r")):
        bone_seg(a, b)
    for k, (x, y) in joints.items():
        shape("joint", ellipse(x, y, 9), C["yellow"])
        shape("joint-in", ellipse(x, y, 4), bone)
    shape("ctrl", ring(398, 134, 26, 5), C["red"])
    shape("ctrl2", ring(258, 420, 24, 5), C["blue"])


def mundo_software():  # World: software and AI (a laptop, a server and a small network).
    flat_scene(600, 640)
    island(300, 430, 440, 200)
    shape("server", rrect(400, 230, 90, 196, 12), C["ink"])
    for i in range(4):
        shape("bay", rrect(412, 248 + i * 42, 66, 28, 6), "#3a3a40")
        shape("light", ellipse(466, 262 + i * 42, 5), C["grass"] if i % 2 == 0 else C["yellow"])
    nodes = [(170, 150), (250, 110), (330, 150), (210, 210), (300, 220)]
    for a, b in ((0, 1), (1, 2), (0, 3), (3, 4), (2, 4), (1, 3)):
        (x1, y1), (x2, y2) = nodes[a], nodes[b]
        dx, dy = x2 - x1, y2 - y1
        l = math.hypot(dx, dy); nx, ny = -dy / l * 3, dx / l * 3
        shape("edge", f"M{x1 + nx},{y1 + ny} L{x2 + nx},{y2 + ny} L{x2 - nx},{y2 - ny} L{x1 - nx},{y1 - ny} Z", C["white"])
    for i, (x, y) in enumerate(nodes):
        shape("node", ellipse(x, y, 16), (C["red"], C["yellow"], C["blue"], C["peach"], C["grass"])[i])
    shape("lid", rrect(130, 270, 230, 150, 14), C["grey"])
    shape("display", rrect(144, 284, 202, 118, 8), C["deep"])
    for i, (w, col) in enumerate(((110, C["blue"]), (70, C["peach"]), (140, C["white"]), (90, C["yellow"]))):
        shape("code", rrect(160 + (18 if i in (1, 2) else 0), 300 + i * 22, w, 9, 4.5), col)
    shape("base", "M108,420 L382,420 L366,436 L124,436 Z", C["white"])



def diseno():  # Process: design (an easel with a colour wheel, brushes and a palette).
    flat_scene(600, 640)
    island(300, 420, 420, 200)
    shape("leg-l", "M220,420 L270,150 L284,152 L238,420 Z", C["wood"])
    shape("leg-r", "M380,420 L330,150 L316,152 L362,420 Z", C["wood"])
    shape("leg-b", rrect(294, 160, 12, 240, 4), "#6f4630")
    shape("canvas", rrect(196, 120, 208, 190, 10), C["white"])
    wheel = ["#b02e2e", "#e2733a", "#f2c14e", "#6fb38a", "#2fb3a6", "#8c9ee0", "#4b5bd1", "#b45ac9"]
    cx, cy, r = 300, 214, 72
    for i, col in enumerate(wheel):
        a0, a1 = math.radians(i * 45 - 90), math.radians((i + 1) * 45 - 90)
        k = 4 / 3 * math.tan((a1 - a0) / 4) * r
        x0, y0, x1, y1 = cx + r * math.cos(a0), cy + r * math.sin(a0), cx + r * math.cos(a1), cy + r * math.sin(a1)
        c1 = (x0 - k * math.sin(a0), y0 + k * math.cos(a0)); c2 = (x1 + k * math.sin(a1), y1 - k * math.cos(a1))
        shape("slice", f"M{cx},{cy} L{x0},{y0} C{c1[0]},{c1[1]} {c2[0]},{c2[1]} {x1},{y1} Z", col)
    shape("hub", ellipse(cx, cy, 24), C["white"])
    shape("ledge", rrect(206, 306, 188, 14, 6), "#6f4630")
    shape("palette", "M392,380 C392,346 424,330 462,334 C500,338 520,360 514,386 C510,404 488,404 476,398 C466,394 456,402 452,412 C446,424 426,424 410,414 C398,406 392,394 392,380 Z", C["grey"])
    for (x, y, col) in ((420, 360, "#b02e2e"), (446, 350, "#f2c14e"), (474, 352, "#2fb3a6"), (494, 370, "#4b5bd1")):
        shape("dab", ellipse(x, y, 9), col)
    shape("brush", "M150,250 L170,236 L246,330 L234,340 Z", C["ink"])
    shape("bristle", "M140,236 C134,226 140,214 150,216 L172,234 L156,248 Z", C["red"])


def empatizar():  # Design thinking: empathise (a conversation and a heart).
    flat_scene(600, 640)
    island(300, 420, 420, 200)
    shape("chair-l", rrect(150, 330, 70, 90, 16), C["deep"])
    shape("chair-l-back", rrect(140, 270, 24, 150, 10), C["deep"])
    shape("chair-r", rrect(380, 330, 70, 90, 16), C["red"])
    shape("chair-r-back", rrect(436, 270, 24, 150, 10), C["red"])
    shape("table", rrect(262, 340, 76, 14, 6), C["wood"])
    shape("table-leg", rrect(293, 352, 14, 68, 4), C["wood"])
    shape("mug", rrect(282, 318, 22, 24, 5), C["white"])
    shape("b1", rrect(110, 110, 190, 96, 40), C["white"])
    shape("b1-tail", poly([(170, 200), (196, 200), (160, 240)]), C["white"])
    for k in range(3):
        shape("d", ellipse(160 + k * 45, 158, 10), C["blue"])
    shape("b2", rrect(316, 150, 180, 86, 38), C["yellow"])
    shape("b2-tail", poly([(420, 232), (446, 232), (456, 270)]), C["yellow"])
    shape("l1", rrect(346, 178, 110, 12, 6), C["ink"])
    shape("l2", rrect(346, 202, 74, 12, 6), C["ink"])
    shape("heart", "M300,64 C300,40 330,34 340,56 C350,34 380,40 380,64 C380,92 340,112 340,124 C340,112 300,92 300,64 Z", C["red"])


def definir():  # Design thinking: define (a board of sticky notes and a target).
    flat_scene(600, 640)
    island(300, 420, 420, 200)
    shape("leg-l", rrect(170, 300, 12, 120, 4), C["wood"])
    shape("leg-r", rrect(330, 300, 12, 120, 4), C["wood"])
    shape("board", rrect(120, 110, 272, 200, 14), C["white"])
    notes = [(140, 130, C["yellow"]), (210, 126, C["peach"]), (280, 132, C["blue"]), (146, 206, C["blue"]),
             (214, 210, C["yellow"]), (300, 216, C["peach"])]
    for i, (x, y, col) in enumerate(notes):
        shape("note", rrect(x, y, 60, 60, 6), col)
        shape("line", rrect(x + 10, y + 18, 40, 6, 3), "#00000022" if False else C["ink"])
    shape("circle", ring(244, 240, 38, 6), C["red"])
    shape("target-o", ellipse(452, 300, 70), C["white"])
    shape("target-m", ellipse(452, 300, 50), C["red"])
    shape("target-i", ellipse(452, 300, 30), C["white"])
    shape("target-c", ellipse(452, 300, 12), C["red"])
    shape("stand", rrect(446, 360, 12, 60, 4), C["wood"])
    shape("arrow", "M380,250 L452,298 L446,306 L374,258 Z", C["ink"])
    shape("fletch", poly([(366, 240), (386, 246), (378, 262), (360, 256)]), C["yellow"])


ITEMS.update(empatizar=empatizar, definir=definir, diseno=diseno, juegos=mundo_juegos, vr=mundo_vr, rigging=mundo_rigging, software=mundo_software)


if __name__ == "__main__":
    root = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()
    out = os.path.join(root, "public", "world")
    os.makedirs(out, exist_ok=True)
    only = sys.argv[sys.argv.index("--") + 2:] if "--" in sys.argv else []
    for name, fn in ITEMS.items():
        if only and name not in only:
            continue
        reset()
        fn()
        sc = bpy.context.scene
        sc.render.resolution_percentage = 200  # retina
        render_still(os.path.join(out, name + ".png"))
        print("rendered", name)
