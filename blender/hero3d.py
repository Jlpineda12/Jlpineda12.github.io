# Hero in 3D: José's name as puffy, glossy letters and the stickers that float around it.
# Every letter and every sticker is rendered on its own (transparent background), so the page can
# lay the name out, put José's face in the "O" and let each piece bounce, wobble and be dragged.
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P blender/hero3d.py -- "$PWD" [letters|stickers|spin|all] [samples]
#
# Writes public/hero/l-<key>.webp, public/hero/s-<name>.webp and src/data/hero3d.json (sizes and
# baselines, in letter units: 1 = the font size).
import bpy, bmesh, json, math, os, sys
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = argv[0] if argv else os.getcwd()
WHAT = argv[1] if len(argv) > 1 else 'all'
SAMPLES = int(argv[2]) if len(argv) > 2 else 96
OUT = os.path.join(ROOT, 'public', 'hero')
FONT = os.path.join(ROOT, 'scripts', 'title-mg', 'fonts', 'TikTokSans-Wide-Black-clean.ttf')
FONT_NAME = os.path.join(ROOT, 'scripts', 'title-mg', 'fonts', 'TikTokSans-Bold-clean.ttf')
PPU = 420           # pixels per letter unit (the name is about 1.2 units tall per line)
PAD = 0.10          # transparent margin around each piece, in units
os.makedirs(OUT, exist_ok=True)

# Name pieces: key → glyph. The O of JOSÉ is José's face, drawn by the page.
LETTERS = {'J': 'J', 'O': 'O', 'S': 'S', 'E-acute': 'É', 'L': 'L', 'U': 'U', 'I': 'I',
           'P': 'P', 'N': 'N', 'E': 'E', 'D': 'D', 'A': 'A'}


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def col(h):
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5)) + (1.0,)


# ---------- Scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = 'GPU'
except Exception as e:  # CPU is fine, just slower
    print('GPU unavailable:', e)
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.render.film_transparent = True
# Standard keeps the palette's colours exact; the lights are set so nothing clips.
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'WEBP'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.image_settings.quality = 88
sc.render.resolution_percentage = 100

world = bpy.data.worlds.new('W')
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
# A cool studio: bluish ambient (the hero is cobalt), so the cream picks up the scene's light.
bg.inputs['Color'].default_value = col('#c9d2ff')
bg.inputs['Strength'].default_value = 0.5


def link(ob):
    sc.collection.objects.link(ob)
    return ob


def area(name, loc, size, energy, color='#ffffff', shape='RECTANGLE', sx=None, sy=None):
    li = bpy.data.lights.new(name, 'AREA')
    li.energy, li.color = energy, col(color)[:3]
    li.shape = shape
    li.size = sx or size
    if shape == 'RECTANGLE':
        li.size_y = sy or size
    ob = link(bpy.data.objects.new(name, li))
    ob.location = loc
    ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


# Softbox key from the top left (the long highlight on every letter), warm fill from the right,
# a cool rim from below so the bottom bevel reads against the blue page.
# The key comes in low, so the rounded edges turn away from it and shade: that is what makes them
# read as round. The front light is a small disk, only there for a glint.
area('key', (-4.5, 5.0, 3.6), 0, 650, '#ffffff', sx=4.0, sy=1.6)
area('fill', (5.0, -1.5, 3.0), 0, 210, '#ffe2c4', sx=3.0, sy=3.0)
area('rim', (0.5, -5.0, 1.0), 0, 260, '#9fb4ff', sx=6.0, sy=1.0)
area('spec', (-1.5, 2.5, 7.5), 0, 40, '#ffffff', shape='DISK', sx=0.5)

cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam = link(bpy.data.objects.new('cam', cam_data))
cam.location = (0, 0, 20)
sc.camera = cam


# ---------- Materials ----------
def plastic(name, hexc, rough=0.22, coat=1.0, sss=0.0, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = col(hexc)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = 0.04
    if sss:
        p.inputs['Subsurface Weight'].default_value = sss
        p.inputs['Subsurface Radius'].default_value = (0.4, 0.25, 0.2)
        p.inputs['Subsurface Scale'].default_value = 0.08
    return m


def glass(name, hexc, rough=0.04):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = col(hexc)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = 1.45
    return m


CREAM = plastic('cream', '#fbf0e0', rough=0.3, coat=1.0, sss=0.1)


# ---------- Helpers ----------
def to_mesh(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target='MESH')
    return bpy.context.view_layer.objects.active


def smooth(ob, angle=50):
    for p in ob.data.polygons:
        p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception:
        pass


def bounds(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for ob in objs:
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        mw = ob.matrix_world
        for v in me.vertices:
            w = mw @ v.co
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
        ev.to_mesh_clear()
    return lo, hi


def shoot(objs, path, ppu=PPU, pad=PAD):
    """Frame the camera on these objects (seen from +Z) and render them alone."""
    for ob in sc.objects:
        if ob.type == 'MESH':
            ob.hide_render = ob not in objs
    lo, hi = bounds(objs)
    x0, x1, y0, y1 = lo.x - pad, hi.x + pad, lo.y - pad, hi.y + pad
    w, h = x1 - x0, y1 - y0
    cam.location = ((x0 + x1) / 2, (y0 + y1) / 2, 20)
    cam.data.ortho_scale = max(w, h)
    cam.data.sensor_fit = 'HORIZONTAL' if w >= h else 'VERTICAL'
    sc.render.resolution_x = max(8, round(w * ppu))
    sc.render.resolution_y = max(8, round(h * ppu))
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return {'w': round(w, 4), 'h': round(h, 4), 'x0': round(x0, 4), 'y0': round(y0, 4)}


TILT = Matrix.Rotation(math.radians(-6), 4, 'X') @ Matrix.Rotation(math.radians(5), 4, 'Y')


# ---------- Letters ----------
def inflate(ob, voxel=0.008, passes=24):
    """Blow the flat extruded glyph up like a balloon: remesh to even voxels, then smooth the
    corners away so every edge is round and the faces bulge a little."""
    r = ob.modifiers.new('remesh', 'REMESH')
    r.mode, r.voxel_size, r.use_smooth_shade = 'VOXEL', voxel, True
    sm = ob.modifiers.new('smooth', 'SMOOTH')
    sm.factor, sm.iterations = 0.9, passes
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    for p in ob.data.polygons:
        p.use_smooth = True


def letters(manifest):
    font = bpy.data.fonts.load(FONT_NAME)
    out = {}
    for key, glyph in LETTERS.items():
        cu = bpy.data.curves.new(key, 'FONT')
        cu.body, cu.font, cu.size = glyph, font, 1.0
        cu.extrude = 0.12
        cu.offset = 0.012  # a touch fatter before inflating, so thin joins survive and holes stay open
        cu.resolution_u = 16
        ob = link(bpy.data.objects.new(key, cu))
        ob = to_mesh(ob)
        lo0, hi0 = bounds([ob])
        inflate(ob)
        ob.data.materials.append(CREAM)
        ob.matrix_world = TILT
        meta = shoot([ob], os.path.join(OUT, f'l-{key}'))
        meta['adv'] = round(hi0.x - lo0.x, 4)
        out[key] = meta
        bpy.data.objects.remove(ob)
    manifest['letters'] = out
    manifest['ppu'] = PPU


# ---------- Stickers ----------
def rounded_box(name, size, bevel, mat, loc=(0, 0, 0), segs=6):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    m = ob.modifiers.new('bev', 'BEVEL')
    m.width, m.segments, m.limit_method = bevel, segs, 'NONE'
    smooth(ob, 60)
    ob.data.materials.append(mat)
    return ob


def sphere(name, r, loc, mat, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=48, ring_count=24)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    smooth(ob)
    ob.data.materials.append(mat)
    return ob


def cyl(name, r, depth, loc, mat, rot=(0, 0, 0), bevel=0.02):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=64)
    ob = bpy.context.active_object
    ob.name = name
    m = ob.modifiers.new('bev', 'BEVEL')
    m.width, m.segments, m.limit_method = bevel, 4, 'NONE'
    smooth(ob, 40)
    ob.data.materials.append(mat)
    return ob


def group(objs, rot):
    """Parent the parts to an empty and turn the whole sticker to its three-quarter view."""
    e = link(bpy.data.objects.new('g', None))
    for o in objs:
        o.parent = e
    e.rotation_euler = [math.radians(a) for a in rot]
    bpy.context.view_layer.update()
    return e


def clear():
    for ob in list(sc.objects):
        if ob.type in {'MESH', 'EMPTY', 'FONT', 'CURVE'}:
            bpy.data.objects.remove(ob)


def outline(name, pts, depth, mat, voxel=0.012, passes=20, z=0.0):
    """A smooth closed silhouette (Bézier, automatic handles through the points), extruded and
    then inflated: the clean, pebble-like body every sticker is built on."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = depth
    cu.resolution_u = 24
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for bp, (x, y) in zip(sp.bezier_points, pts):
        bp.co = (x, y, 0)
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    sp.use_cyclic_u = True
    ob = link(bpy.data.objects.new(name, cu))
    ob.location.z = z
    ob = to_mesh(ob)
    inflate(ob, voxel, passes)
    ob.data.materials.append(mat)
    return ob


def mirror_x(half):
    """Right half of a symmetric outline, top to bottom → the whole loop, clockwise."""
    return half + [(-x, y) for x, y in reversed(half) if abs(x) > 1e-6]


def top_z(ob):
    return bounds([ob])[1].z


def dome(name, r, loc, mat, h=0.5):
    return sphere(name, r, loc, mat, (1, 1, h))


def controller():
    """A gamepad: inflated body with two grips, D-pad, two sticks, four face buttons, home button
    and the shoulder bumpers peeking over the top edge."""
    red = plastic('red', '#e5483b', rough=0.2)
    ink = plastic('ink', '#2a2a2e', rough=0.3)
    stick = plastic('stick', '#3a3a40', rough=0.45, coat=0.3)
    cols = [plastic(f'fb{i}', c, rough=0.15) for i, c in enumerate(('#ffd23f', '#7c90da', '#5cc9a0', '#f4a7b9'))]
    half = [(0.0, 0.56), (0.62, 0.6), (1.02, 0.52), (1.28, 0.26), (1.4, -0.12), (1.38, -0.55), (1.22, -0.9),
            (0.98, -1.02), (0.76, -0.88), (0.56, -0.5), (0.3, -0.36), (0.0, -0.36)]
    body = outline('body', mirror_x(half), 0.2, red)
    zt = top_z(body)
    parts = [body]
    # Bumpers: dark pills tucked behind the top edge.
    for sx in (-1, 1):
        parts.append(rounded_box('bump', (0.72, 0.2, 0.26), 0.09, ink, (sx * 0.8, 0.6, 0.05)))
    # D-pad.
    parts += [rounded_box('dx', (0.5, 0.17, 0.14), 0.05, ink, (-0.78, 0.12, zt)),
              rounded_box('dy', (0.17, 0.5, 0.14), 0.05, ink, (-0.78, 0.12, zt))]
    # Face buttons in a diamond.
    for (dx, dy), m in zip(((0, 0.2), (0.2, 0), (0, -0.2), (-0.2, 0)), cols):
        parts.append(dome('fb', 0.11, (0.78 + dx, 0.12 + dy, zt + 0.01), m, 0.6))
    # Sticks: a dark collar and a rounded cap.
    for sx in (-1, 1):
        parts.append(cyl('collar', 0.2, 0.12, (sx * 0.4, -0.3, zt), ink, bevel=0.04))
        parts.append(dome('cap', 0.17, (sx * 0.4, -0.3, zt + 0.08), stick, 0.42))
    # Home button and the two small menu pills.
    parts.append(dome('home', 0.1, (0, 0.2, zt + 0.01), plastic('wht', '#fbf0e0', 0.2), 0.55))
    for sx in (-1, 1):
        parts.append(rounded_box('menu', (0.15, 0.07, 0.07), 0.03, ink, (sx * 0.22, 0.4, zt - 0.01), 3))
    group(parts, (32, -14, 6))
    return parts


def headset():
    """VR goggles in three-quarter view: an inflated goggle shell with a nose arch, a glossy black
    visor of the same outline, the face cushion behind and a strap band around the head."""
    sky = plastic('sky2', '#6f86e8', rough=0.2)
    vis = plastic('visor', '#191c33', rough=0.04, coat=1.0)
    foam = plastic('foam', '#3b3f5c', rough=0.8, coat=0.0)
    pink = plastic('pink', '#f4a7b9', rough=0.35, coat=0.3)
    half = [(0.0, 0.64), (0.9, 0.64), (1.18, 0.5), (1.24, 0.1), (1.18, -0.42), (1.0, -0.6), (0.48, -0.62),
            (0.3, -0.42), (0.0, -0.28)]
    pts = mirror_x(half)
    shell = outline('shell', pts, 0.5, sky, voxel=0.01, passes=12, z=-0.3)
    zt = top_z(shell)
    visor = outline('visor', [(x * 0.88, y * 0.82 + 0.03) for x, y in pts], 0.05, vis, voxel=0.008, passes=10, z=zt - 0.04)
    cushion = outline('cushion', [(x * 0.94, y * 0.92) for x, y in pts], 0.16, foam, voxel=0.01, passes=10, z=-0.62)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.26, minor_radius=0.14, major_segments=96, minor_segments=16,
                                     location=(0, 0.1, -1.4), rotation=(math.radians(90), 0, 0))
    strap = bpy.context.active_object
    strap.scale = (1.0, 1.0, 0.42)
    bpy.ops.object.transform_apply(scale=True)
    smooth(strap)
    strap.data.materials.append(pink)
    w = plastic('w', '#ffffff', 0.1)
    vz = top_z(visor)
    glints = [rounded_box('g1', (0.55, 0.07, 0.02), 0.03, w, (-0.5, 0.36, vz - 0.005), 3),
              rounded_box('g2', (0.16, 0.07, 0.02), 0.03, w, (-0.08, 0.36, vz - 0.005), 3)]
    parts = [shell, visor, cushion, strap] + glints
    group(parts, (16, -30, 4))
    return parts


def gem():
    mint = plastic('mint', '#5cc9a0', rough=0.18)
    yel = plastic('yel2', '#ffd23f')
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.95)
    ico = bpy.context.active_object
    ico.data.materials.append(mint)
    m = ico.modifiers.new('bev', 'BEVEL')
    m.width, m.segments, m.limit_method = 0.05, 3, 'NONE'
    bpy.ops.mesh.primitive_torus_add(major_radius=1.35, minor_radius=0.06, major_segments=96, minor_segments=12)
    ring = bpy.context.active_object
    ring.rotation_euler = (math.radians(70), 0, math.radians(20))
    smooth(ring)
    ring.data.materials.append(yel)
    parts = [ico, ring, sphere('moon', 0.16, (1.25, 0.45, 0.35), yel)]
    group(parts, (10, 20, 0))
    return parts


def chip():
    yel = plastic('yel3', '#ffc93c')
    ink = plastic('ink2', '#2a2a2e', rough=0.3)
    met = plastic('pin', '#d8dbe3', rough=0.25, metal=1.0, coat=0.0)
    parts = [rounded_box('base', (1.7, 1.7, 0.32), 0.18, yel),
             rounded_box('top', (1.05, 1.05, 0.16), 0.12, ink, (0, 0, 0.2))]
    for i in range(4):
        o = -0.48 + i * 0.32
        for x, y, sx, sy in ((o, 1.0, 0.13, 0.36), (o, -1.0, 0.13, 0.36), (1.0, o, 0.36, 0.13), (-1.0, o, 0.36, 0.13)):
            parts.append(rounded_box('p', (sx, sy, 0.1), 0.04, met, (x, y, -0.02), 3))
    font = bpy.data.fonts.load(FONT)
    cu = bpy.data.curves.new('ai', 'FONT')
    cu.body, cu.font, cu.size, cu.align_x, cu.align_y = 'IA', font, 0.5, 'CENTER', 'CENTER'
    cu.extrude, cu.bevel_depth, cu.bevel_resolution = 0.04, 0.015, 4
    t = link(bpy.data.objects.new('ai', cu))
    t.location = (0, 0, 0.32)
    t = to_mesh(t)
    t.data.materials.append(yel)
    parts.append(t)
    group(parts, (-28, 18, -10))
    return parts


def stripes(name, a_hex, b_hex, bands=6):
    """Diagonal two-colour stripes, the clapperboard's sticks."""
    m = plastic(name, a_hex, rough=0.25)
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(35))
    wv = nt.nodes.new('ShaderNodeTexWave')
    wv.wave_profile = 'SAW'
    wv.inputs['Scale'].default_value = bands
    rmp = nt.nodes.new('ShaderNodeValToRGB')
    rmp.color_ramp.interpolation = 'CONSTANT'
    rmp.color_ramp.elements[0].color = col(a_hex)
    rmp.color_ramp.elements[1].position = 0.5
    rmp.color_ramp.elements[1].color = col(b_hex)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], wv.inputs['Vector'])
    nt.links.new(wv.outputs['Fac'], rmp.inputs['Fac'])
    nt.links.new(rmp.outputs['Color'], p.inputs['Base Color'])
    return m


def clapper():
    """A film clapperboard, open: slate with chalk lines, a striped bar and the striped stick lifted."""
    ink = plastic('ink3', '#2a2a2e', rough=0.3)
    chalk = plastic('chalk', '#f7e9d6', rough=0.5, coat=0.0)
    sticks = stripes('sticks', '#2a2a2e', '#f7e9d6', bands=0.85)
    slate = rounded_box('slate', (2.2, 1.5, 0.24), 0.1, ink, (0, -0.3, 0))
    bar = rounded_box('bar', (2.2, 0.34, 0.26), 0.07, sticks, (0, 0.62, 0))
    hx, hy, ang = -1.1, 0.79, math.radians(22)
    # The stick, lifted 22° around the hinge at its left end.
    arm = rounded_box('arm', (2.2, 0.34, 0.26), 0.07, sticks,
                      (hx + 1.1 * math.cos(ang) - 0.17 * math.sin(ang), hy + 1.1 * math.sin(ang) + 0.17 * math.cos(ang), 0))
    arm.rotation_euler = (0, 0, ang)
    hinge = cyl('hinge', 0.1, 0.3, (hx + 0.05, hy, 0.0), plastic('pin2', '#d8dbe3', 0.25, metal=1.0, coat=0), rot=(0, 0, 0))
    parts = [slate, bar, arm, hinge]
    for i, wl in enumerate((1.6, 1.6, 0.9)):
        parts.append(rounded_box('line', (wl, 0.07, 0.03), 0.03, chalk, (-0.2 + (1.6 - wl) / -2 + 0.1, -0.05 - i * 0.36, 0.13), 2))
    group(parts, (18, -22, 4))
    return parts


STICKERS = {'mando': controller, 'visor': headset, 'gema': gem, 'chip': chip, 'claqueta': clapper}


def stickers(manifest):
    out = {}
    for name, build in STICKERS.items():
        clear()
        parts = build()
        bpy.context.view_layer.update()
        meshes = [p for p in parts if p.type == 'MESH']
        out[name] = shoot(meshes, os.path.join(OUT, f's-{name}'), ppu=200, pad=0.12)
    manifest['stickers'] = out


def spin(manifest, frames=24):
    """The controller on a turntable: the same camera, one frame per angle, so the page can spin
    it under the pointer (public/hero/spin-NN.webp)."""
    clear()
    parts = controller()
    bpy.context.view_layer.update()
    root = parts[0].parent
    turn = link(bpy.data.objects.new('turn', None))
    root.parent = turn
    meshes = [p for p in parts if p.type == 'MESH']
    # Frame every angle with one camera: the bounds over the whole turn.
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for i in range(frames):
        turn.rotation_euler = (0, math.radians(i * 360 / frames), 0)
        bpy.context.view_layer.update()
        a, b = bounds(meshes)
        lo = Vector(map(min, lo, a))
        hi = Vector(map(max, hi, b))
    pad = 0.15
    x0, x1, y0, y1 = lo.x - pad, hi.x + pad, lo.y - pad, hi.y + pad
    w, h = x1 - x0, y1 - y0
    cam.location = ((x0 + x1) / 2, (y0 + y1) / 2, 20)
    cam.data.ortho_scale = max(w, h)
    cam.data.sensor_fit = 'HORIZONTAL' if w >= h else 'VERTICAL'
    sc.render.resolution_x = round(w * 170)
    sc.render.resolution_y = round(h * 170)
    for ob in sc.objects:
        if ob.type == 'MESH':
            ob.hide_render = ob not in meshes
    for i in range(frames):
        turn.rotation_euler = (0, math.radians(i * 360 / frames), 0)
        sc.render.filepath = os.path.join(OUT, f'spin-{i:02d}')
        bpy.ops.render.render(write_still=True)
    manifest['spin'] = {'frames': frames, 'w': sc.render.resolution_x, 'h': sc.render.resolution_y}


def reader(manifest):
    """The access reader: a cream plastic box seen a little from above, a slot along the back of
    its top for the card, and a dark glass face with a small screen and a ring light. The page
    draws the light bar, the text and the progress ring over it, at the spots written to the
    manifest (fractions of the image)."""
    from bpy_extras.object_utils import world_to_camera_view
    clear()
    shell = plastic('shell', '#f4efe5', rough=0.28, coat=0.8)
    glassm = plastic('face', '#141a33', rough=0.08, coat=1.0)
    lcd = plastic('lcd', '#1f2a4d', rough=0.2, coat=0.6)
    ringm = plastic('ring', '#d8dbe3', rough=0.22, metal=1.0, coat=0.0)
    padm = plastic('pad', '#232b4a', rough=0.35, coat=0.5)
    hole = plastic('hole', '#0c0f1c', rough=0.6, coat=0.0)
    W, H, D = 3.0, 1.5, 1.1
    body = rounded_box('body', (W, H, D), 0.3, shell)
    # The slot: a dark groove cut along the back of the top face.
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, H / 2, -D * 0.18))
    cut = bpy.context.active_object
    cut.scale = (W * 0.74, 0.6, 0.12)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier='bev')
    bo = body.modifiers.new('slot', 'BOOLEAN')
    bo.object, bo.operation = cut, 'DIFFERENCE'
    bpy.ops.object.modifier_apply(modifier='slot')
    bpy.data.objects.remove(cut)
    smooth(body, 35)
    inner = rounded_box('inner', (W * 0.74, 0.06, 0.12), 0.02, hole, (0, H / 2 - 0.26, -D * 0.18), 2)
    face = rounded_box('face', (W * 0.86, H * 0.66, 0.08), 0.12, glassm, (0, -H * 0.06, D / 2 + 0.01))
    screen = rounded_box('screen', (W * 0.5, H * 0.36, 0.04), 0.06, lcd, (-W * 0.13, -H * 0.06, D / 2 + 0.06))
    ring = None
    bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.05, location=(W * 0.3, -H * 0.06, D / 2 + 0.07),
                                     major_segments=64, minor_segments=16)
    ring = bpy.context.active_object
    smooth(ring)
    ring.data.materials.append(ringm)
    pad = cyl('pad', 0.27, 0.04, (W * 0.3, -H * 0.06, D / 2 + 0.05), padm, bevel=0.015)
    parts = [body, inner, face, screen, ring, pad]
    root = group(parts, (40, 0, 0))
    bpy.context.view_layer.update()
    meshes = parts
    lo, hi = bounds(meshes)
    pad_ = 0.12
    x0, x1, y0, y1 = lo.x - pad_, hi.x + pad_, lo.y - pad_, hi.y + pad_
    w, h = x1 - x0, y1 - y0
    cam.location = ((x0 + x1) / 2, (y0 + y1) / 2, 20)
    cam.data.ortho_scale = max(w, h)
    cam.data.sensor_fit = 'HORIZONTAL' if w >= h else 'VERTICAL'
    sc.render.resolution_x = round(w * 220)
    sc.render.resolution_y = round(h * 220)
    for ob in sc.objects:
        if ob.type == 'MESH':
            ob.hide_render = ob not in meshes
    sc.render.filepath = os.path.join(OUT, 'reader')
    bpy.ops.render.render(write_still=True)

    def at(local):
        """A point given in the reader's own coordinates → fraction of the image (0,0 top left)."""
        co = root.matrix_world @ Vector(local)
        v = world_to_camera_view(sc, cam, co)
        return round(v.x, 4), round(1 - v.y, 4)

    sl0 = at((-W * 0.37, H / 2, -D * 0.18))
    sl1 = at((W * 0.37, H / 2, -D * 0.18))
    s0 = at((-W * 0.13 - W * 0.25, -H * 0.06 + H * 0.18, D / 2 + 0.08))
    s1 = at((-W * 0.13 + W * 0.25, -H * 0.06 - H * 0.18, D / 2 + 0.08))
    rc = at((W * 0.3, -H * 0.06, D / 2 + 0.08))
    re = at((W * 0.3 + 0.32, -H * 0.06, D / 2 + 0.08))
    manifest['reader'] = {
        'w': sc.render.resolution_x, 'h': sc.render.resolution_y,
        'slot': {'x0': sl0[0], 'x1': sl1[0], 'y': round((sl0[1] + sl1[1]) / 2, 4)},
        'screen': {'x0': s0[0], 'y0': s0[1], 'x1': s1[0], 'y1': s1[1]},
        'ring': {'cx': rc[0], 'cy': rc[1], 'r': round(re[0] - rc[0], 4)},
    }


path = os.path.join(ROOT, 'src', 'data', 'hero3d.json')
manifest = json.load(open(path)) if os.path.exists(path) else {}
if WHAT in ('letters', 'all'):
    letters(manifest)
if WHAT in ('stickers', 'all'):
    stickers(manifest)
if WHAT in ('spin', 'all'):
    spin(manifest)
if WHAT in ('reader', 'all'):
    reader(manifest)
json.dump(manifest, open(path, 'w'), indent=2)
print('done', list(manifest.get('letters', {})), list(manifest.get('stickers', {})))
