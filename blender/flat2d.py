"""2D flat-vector toolkit for Blender: filled bezier shapes, flat (unlit) renders, keyframe helpers.

Shapes are written like SVG paths (x right, y down, in pixels) and stored in Blender
at x/100, -y/100 on the XY plane, seen from above by an orthographic camera.
"""
import bpy
import math
import re
from mathutils import Vector

S = 0.01  # pixels -> Blender units
Z_COUNTER = [0]
_mats = {}


def reset():
    _mats.clear()
    Z_COUNTER[0] = 0
    bpy.ops.wm.read_factory_settings(use_empty=True)


def hex_to_srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def flat_mat(hexcol):
    hexcol = hexcol.lower()
    if hexcol not in _mats:
        m = bpy.data.materials.new("fill " + hexcol)
        m.diffuse_color = tuple(lin(c) for c in hex_to_srgb(hexcol)) + (1.0,)
        _mats[hexcol] = m
    return _mats[hexcol]


# ---------- SVG-like path data -> Blender bezier splines ----------

_tok = re.compile(r"[MLCZHV]|-?\d*\.?\d+(?:e-?\d+)?")


def parse_path(d):
    """Absolute M, L, H, V, C, Z. Returns [(points, closed)], points = dict(co, hl, hr)."""
    toks = _tok.findall(d)
    i, cmd, subs, pts, cur = 0, None, [], [], (0.0, 0.0)

    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]; i += 1
            if cmd == "Z":
                subs.append((pts, True)); pts = []
                continue
        if cmd == "M":
            if pts:
                subs.append((pts, False))
            cur = (num(), num()); pts = [dict(co=cur, hl=None, hr=None)]; cmd = "L"
        elif cmd == "L":
            cur = (num(), num()); pts.append(dict(co=cur, hl=None, hr=None))
        elif cmd == "H":
            cur = (num(), cur[1]); pts.append(dict(co=cur, hl=None, hr=None))
        elif cmd == "V":
            cur = (cur[0], num()); pts.append(dict(co=cur, hl=None, hr=None))
        elif cmd == "C":
            c1 = (num(), num()); c2 = (num(), num()); cur = (num(), num())
            pts[-1]["hr"] = c1
            pts.append(dict(co=cur, hl=c2, hr=None))
    if pts:
        subs.append((pts, False))
    out = []
    for p, closed in subs:
        if closed and len(p) > 2 and math.dist(p[0]["co"], p[-1]["co"]) < 1e-3:
            p[0]["hl"] = p[-1]["hl"]
            p = p[:-1]
        out.append((p, closed))
    return out


def _bl(xy):
    return Vector((xy[0] * S, -xy[1] * S, 0.0))


def _attach(o, parent):
    if parent is None:
        return
    bpy.context.view_layer.update()
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()


def shape(name, d, fill, parent=None):
    """A filled 2D shape. Nested subpaths make holes. Shapes stack in creation order."""
    Z_COUNTER[0] += 1
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.resolution_u = 24
    for pts, closed in parse_path(d):
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(len(pts) - 1)
        n = len(pts)
        for k, (bp, p) in enumerate(zip(sp.bezier_points, pts)):
            co = _bl(p["co"])
            bp.co = co
            prv = pts[k - 1] if (k > 0 or closed) else None
            nxt = pts[(k + 1) % n] if (k < n - 1 or closed) else None
            bp.handle_left = _bl(p["hl"]) if p["hl"] else (co.lerp(_bl(prv["co"]), 1 / 3) if prv else co)
            bp.handle_right = _bl(p["hr"]) if p["hr"] else (co.lerp(_bl(nxt["co"]), 1 / 3) if nxt else co)
            bp.handle_left_type = bp.handle_right_type = "FREE"
        sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    cu.materials.append(flat_mat(fill))
    o.location.z = Z_COUNTER[0] * 0.002
    _attach(o, parent)
    return o


def group(name, pivot=(0, 0), parent=None):
    """An empty placed at its pivot (pixels): the origin for moving, turning and scaling its shapes."""
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.3
    bpy.context.collection.objects.link(o)
    o.location = Vector((pivot[0] * S, -pivot[1] * S, 0))
    _attach(o, parent)
    return o


# ---------- Shape builders (path strings) ----------

K = 0.5522847498


def rrect(x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    k = r * (1 - K)
    return (f"M{x + r},{y} L{x + w - r},{y} C{x + w - k},{y} {x + w},{y + k} {x + w},{y + r} "
            f"L{x + w},{y + h - r} C{x + w},{y + h - k} {x + w - k},{y + h} {x + w - r},{y + h} "
            f"L{x + r},{y + h} C{x + k},{y + h} {x},{y + h - k} {x},{y + h - r} "
            f"L{x},{y + r} C{x},{y + k} {x + k},{y} {x + r},{y} Z")


def ellipse(cx, cy, rx, ry=None):
    ry = rx if ry is None else ry
    kx, ky = rx * K, ry * K
    return (f"M{cx},{cy - ry} C{cx + kx},{cy - ry} {cx + rx},{cy - ky} {cx + rx},{cy} "
            f"C{cx + rx},{cy + ky} {cx + kx},{cy + ry} {cx},{cy + ry} "
            f"C{cx - kx},{cy + ry} {cx - rx},{cy + ky} {cx - rx},{cy} "
            f"C{cx - rx},{cy - ky} {cx - kx},{cy - ry} {cx},{cy - ry} Z")


def ring(cx, cy, r, w):
    return ellipse(cx, cy, r) + " " + ellipse(cx, cy, r - w)


def poly(points):
    return "M" + " L".join(f"{x},{y}" for x, y in points) + " Z"


# ---------- Flat render setup ----------

def flat_scene(width, height, bg_hex=None, frames=1, fps=24):
    """Workbench, flat colours, orthographic camera framing (0,0)-(width,height).
    bg_hex=None renders a transparent background."""
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = width, height
    sc.render.resolution_percentage = 100
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.fps = fps
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "FLAT"
    sh.color_type = "MATERIAL"
    sh.show_shadows = sh.show_cavity = sh.show_object_outline = sh.show_specular_highlight = False
    sc.display.render_aa = "16"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.world = bpy.data.worlds.new("W")
    if bg_hex:
        sc.world.color = tuple(lin(c) for c in hex_to_srgb(bg_hex))
        sc.render.film_transparent = False
    else:
        sc.render.film_transparent = True
    cd = bpy.data.cameras.new("Cam")
    cd.type = "ORTHO"
    cd.ortho_scale = max(width, height) * S
    cd.clip_end = 100
    cam = bpy.data.objects.new("Cam", cd)
    bpy.context.collection.objects.link(cam)
    cam.location = (width * S / 2, -height * S / 2, 10)
    sc.camera = cam
    return sc


def render_still(path):
    sc = bpy.context.scene
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA" if sc.render.film_transparent else "RGB"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def render_frames(folder):
    sc = bpy.context.scene
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.filepath = folder.rstrip("/") + "/f_"
    bpy.ops.render.render(animation=True)


# ---------- Animation helpers ----------

def key(obj, frame, loc=None, dloc=None, rot=None, scale=None):
    """loc: absolute pixels. dloc: pixels from the rest position. rot: degrees clockwise."""
    if dloc is not None and "_rest" not in obj:
        obj["_rest"] = tuple(obj.location)
    if loc is not None:
        obj.location.x, obj.location.y = loc[0] * S, -loc[1] * S
        obj.keyframe_insert("location", frame=frame)
    if dloc is not None:
        r = obj["_rest"]
        obj.location = (r[0] + dloc[0] * S, r[1] - dloc[1] * S, r[2])
        obj.keyframe_insert("location", frame=frame)
    if rot is not None:
        obj.rotation_euler.z = math.radians(-rot)
        obj.keyframe_insert("rotation_euler", frame=frame)
    if scale is not None:
        obj.scale = (scale[0], scale[1], 1)
        obj.keyframe_insert("scale", frame=frame)


def hide_key(obj, frame, hidden):
    obj.hide_render = hidden
    obj.keyframe_insert("hide_render", frame=frame)


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def ease_out_back(x, s=1.7):
    x -= 1
    return x * x * ((s + 1) * x + s) + 1


def ease_out_bounce(x):
    n, d = 7.5625, 2.75
    if x < 1 / d:
        return n * x * x
    if x < 2 / d:
        x -= 1.5 / d; return n * x * x + 0.75
    if x < 2.5 / d:
        x -= 2.25 / d; return n * x * x + 0.9375
    x -= 2.625 / d; return n * x * x + 0.984375
