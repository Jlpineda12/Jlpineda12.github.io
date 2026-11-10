# José Luis Pineda — title motion graphic. Run headless:
#   blender -b -P title.py -- <outdir> <pass: name|sub_es|sub_en> <frames: all|test|a,b,c> [pct] [samples]
# Three acts in one loop: 3D (glossy extruded letters drop in), 2D (flat, thick outlines, squash and
# stretch, melt to puddles), stop motion (clay puddles rise, animated on twos with hand jitter, jump out).
import bpy, bmesh, math, random, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PASS, FRAMES = argv[0], argv[1], argv[2]
PCT = int(argv[3]) if len(argv) > 3 else 100
SAMPLES = int(argv[4]) if len(argv) > 4 else 0
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_BLACK = os.path.join(HERE, 'fonts', 'TikTokSans-Wide-Black-clean.ttf')
FONT_BOLD = os.path.join(HERE, 'fonts', 'TikTokSans-Bold-clean.ttf')
SUB = {'sub_es': 'INGENIERO EN MULTIMEDIA', 'sub_en': 'MULTIMEDIA ENGINEER'}

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = 24
sc.frame_start, sc.frame_end = 1, 196
A, B, C = (1, 76), (77, 136), (137, 196)
random.seed(26)


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def col(h):
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5)) + (1.0,)


def link(ob):
    sc.collection.objects.link(ob)
    return ob


fb = bpy.data.fonts.load(FONT_BLACK)
fs = bpy.data.fonts.load(FONT_BOLD)


def text_obj(name, body, font, size):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body, cu.font, cu.size, cu.align_x = body, font, size, 'LEFT'
    cu.resolution_u = 5
    return link(bpy.data.objects.new(name, cu))


def parts_of(ob):
    """Glyph islands of a text object (x0, x1, y0, y1), accents merged into their letter."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    seen, parts = set(), []
    for f in bm.faces:
        if f.index in seen:
            continue
        stack, comp = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop()
            comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index)
                        stack.append(h)
        xs = [v.co.x for g in comp for v in g.verts]
        ys = [v.co.y for g in comp for v in g.verts]
        parts.append([min(xs), max(xs), min(ys), max(ys)])
    bm.free()
    ev.to_mesh_clear()
    parts.sort()
    out = []
    for p in parts:
        if out:
            q = out[-1]
            ov = min(p[1], q[1]) - max(p[0], q[0])
            if ov > 0.3 * min(p[1] - p[0], q[1] - q[0]):
                out[-1] = [min(p[0], q[0]), max(p[1], q[1]), min(p[2], q[2]), max(p[3], q[3])]
                continue
        out.append(p)
    return out


# ---------- Materials: one set per style ----------
def mat_3d(name, hexc, rough=0.28):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = col(hexc)
    p.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in p.inputs:
        p.inputs['Coat Weight'].default_value = 0.35
        p.inputs['Coat Roughness'].default_value = 0.08
    return m


def mat_flat(name, hexc):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = col(hexc)
    e.inputs['Strength'].default_value = 1.0
    nt.links.new(e.outputs[0], out.inputs['Surface'])
    return m


def mat_clay(name, hexc):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = col(hexc)
    p.inputs['Roughness'].default_value = 0.62
    if 'Subsurface Weight' in p.inputs:
        p.inputs['Subsurface Weight'].default_value = 0.25
        p.inputs['Subsurface Radius'].default_value = (0.2, 0.1, 0.06)
        p.inputs['Subsurface Scale'].default_value = 0.05
    # Fingerprints and lumps: a fine noise plus wavy rings.
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 7
    nz.inputs['Detail'].default_value = 8
    nz.inputs['Roughness'].default_value = 0.62
    wv = nt.nodes.new('ShaderNodeTexWave')
    wv.wave_type = 'RINGS'
    wv.inputs['Scale'].default_value = 34
    wv.inputs['Distortion'].default_value = 14
    wv.inputs['Detail Scale'].default_value = 3
    mx = nt.nodes.new('ShaderNodeMixRGB')
    mx.inputs['Fac'].default_value = 0.18
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = 0.22
    bp.inputs['Distance'].default_value = 0.015
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], mx.inputs['Color1'])
    nt.links.new(wv.outputs['Fac'], mx.inputs['Color2'])
    nt.links.new(mx.outputs[0], bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], p.inputs['Normal'])
    return m


INK, RED, GREY = '#2a2a2e', '#b02e2e', '#3c3c44'
M = {
    'A': {'l1': mat_3d('a1', '#1f1f24', 0.32), 'l2': mat_3d('a2', '#a3222a', 0.3), 's': mat_3d('as', GREY, 0.4)},
    'B': {'l1': mat_flat('b1', '#f6f3ea'), 'l2': mat_flat('b2', '#e84a3c'), 's': mat_flat('bs', '#f6f3ea')},
    'C': {'l1': mat_clay('c1', '#e8641f'), 'l2': mat_clay('c2', '#1f8fa3'), 's': mat_clay('cs', '#e9b52c')},
}
OUTLINE = mat_flat('outline', INK)

# ---------- Letters ----------
LETTERS = []


def build_line(body, font, size, z, key):
    full = text_obj('tmp', body, font, size)
    parts = parts_of(full)
    chars = [c for c in body if c != ' ']
    assert len(chars) == len(parts), (body, len(chars), len(parts))
    x0 = -(parts[-1][1] - parts[0][0]) / 2 - parts[0][0]
    bpy.data.objects.remove(full)
    for c, p in zip(chars, parts):
        piv = link(bpy.data.objects.new(f'piv_{key}_{c}', None))
        piv.location = (x0 + (p[0] + p[1]) / 2, 0, z + p[2])
        t = text_obj(f'L_{key}_{c}', c, font, size)
        lb = parts_of(t)
        lb = [min(q[0] for q in lb), max(q[1] for q in lb), min(q[2] for q in lb), max(q[3] for q in lb)]
        off = (-(lb[0] + lb[1]) / 2, 0, -lb[2])
        t.parent, t.rotation_euler, t.location = piv, (math.pi / 2, 0, 0), off
        t.data.materials.append(M['A'][key])
        o = text_obj(f'O_{key}_{c}', c, font, size)
        o.parent, o.rotation_euler = piv, (math.pi / 2, 0, 0)
        o.location = (off[0], 0.025, off[2])
        o.data.offset = 0.065 * size
        o.data.materials.append(OUTLINE)
        LETTERS.append({'piv': piv, 't': t, 'o': o, 'base': piv.location.copy(), 'size': size, 'key': key,
                        'r0': random.uniform(-0.6, 0.6)})


build_line('JOSÉ LUIS', fb, 1.0, 1.2, 'l1')
build_line('PINEDA', fb, 1.0, 0.0, 'l2')
name_n = len(LETTERS)
if PASS in SUB:
    build_line(SUB[PASS], fs, 0.36, -0.78, 's')

# ---------- Animation ----------
def K(ob, f, loc=None, rz=None, s=None):
    if loc is not None:
        ob.location = loc
        ob.keyframe_insert('location', frame=f)
    if rz is not None:
        ob.rotation_euler = (0, 0, rz)
        ob.keyframe_insert('rotation_euler', frame=f)
    if s is not None:
        ob.scale = s
        ob.keyframe_insert('scale', frame=f)


UP = Vector((0, 0, 6))
for i, L in enumerate(LETTERS):
    p, b, h = L['piv'], L['base'], L['size']
    is_name = L['key'] != 's'
    j = i if is_name else i - name_n
    # Act 1 · 3D: drop in with a bounce, hold, then flip edge-on.
    land = 8 + j * 1.6 if is_name else 34 + j * 0.7
    K(p, 1, b + UP, L['r0'], (1, 1, 1))
    K(p, max(2, land - 14), b + UP, L['r0'], (1, 1, 1))
    K(p, land, b, 0, (1.18, 1, 0.72))
    K(p, land + 4, b + Vector((0, 0, 0.18 * h)), None, (0.94, 1, 1.08))
    K(p, land + 9, b, None, (1, 1, 1))
    fo = 50 + j * 0.8 if is_name else 56 + j * 0.45
    K(p, fo, b, 0)
    K(p, fo + 3, None, -0.15)
    K(p, fo + 10, None, math.pi / 2)
    # Act 2 · 2D: flip in flat, a squash-and-stretch wave, melt into puddles.
    fi = 78 + j * 0.8 if is_name else 84 + j * 0.45
    K(p, fi, None, math.pi / 2)
    K(p, fi + 6, None, -0.12)
    K(p, fi + 10, None, 0)
    wj = 96 + j * 1.0 if is_name else 98 + j * 0.55
    K(p, wj, b, None, (1, 1, 1))
    K(p, wj + 2, None, None, (1.12, 1, 0.86))
    K(p, wj + 6, b + Vector((0, 0, 0.45 * h)), None, (0.9, 1, 1.14))
    K(p, wj + 11, b, None, (1.14, 1, 0.84))
    K(p, wj + 15, None, None, (1, 1, 1))
    ps = 124 + j * 0.5 if is_name else 126 + j * 0.3
    K(p, ps, None, None, (1, 1, 1))
    K(p, ps + 5, None, None, (1.35, 1, 0.06))
    # Act 3 · stop motion: clay rises from the puddle, boils, then jumps out of frame.
    rs = 138 + j * 1.0 if is_name else 146 + j * 0.4
    K(p, rs, b, None, (1.35, 1, 0.06))
    K(p, rs + 6, b + Vector((0, 0, 0.1 * h)), None, (0.9, 1, 1.16))
    K(p, rs + 10, b, None, (1.06, 1, 0.94))
    K(p, rs + 14, None, None, (1, 1, 1))
    jo = 176 + j * 0.6 if is_name else 180 + j * 0.3
    K(p, jo, b, 0, (1, 1, 1))
    K(p, jo + 3, None, None, (1.15, 1, 0.82))
    K(p, min(196, jo + 10), b + UP, L['r0'], (0.9, 1, 1.15))
    # Hand jitter on twos, only in act 3.
    p.delta_rotation_euler = (0, 0, 0)
    p.delta_location = (0, 0, 0)
    p.keyframe_insert('delta_rotation_euler', frame=C[0] - 1)
    p.keyframe_insert('delta_location', frame=C[0] - 1)
    for f in range(C[0], C[1] + 1, 2):
        p.delta_rotation_euler = (random.uniform(-0.035, 0.035), random.uniform(-0.03, 0.03), random.uniform(-0.03, 0.03))
        p.delta_location = (random.uniform(-0.012, 0.012), 0, random.uniform(-0.01, 0.01))
        p.keyframe_insert('delta_rotation_euler', frame=f)
        p.keyframe_insert('delta_location', frame=f)

# ---------- Stage: shadow-catching paper behind the letters, camera, lights ----------
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.32, 0.6), rotation=(math.pi / 2, 0, 0))
wall = bpy.context.active_object
wall.scale = (40, 20, 1)
wall.is_shadow_catcher = True

target = link(bpy.data.objects.new('target', None))
target.location = (0, 0, 0.62)
cam = link(bpy.data.objects.new('cam', bpy.data.cameras.new('cam')))
sc.camera = cam
tr = cam.constraints.new('TRACK_TO')
tr.target, tr.track_axis, tr.up_axis = target, 'TRACK_NEGATIVE_Z', 'UP_Y'
cam.data.sensor_width = 36


def area(name, loc, power, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA')
    l.energy, l.size, l.color = power, size, color
    ob = link(bpy.data.objects.new(name, l))
    ob.location = loc
    c = ob.constraints.new('TRACK_TO')
    c.target, c.track_axis, c.up_axis = target, 'TRACK_NEGATIVE_Z', 'UP_Y'
    return ob


LIGHTS = {
    'A': [area('a_key', (-4, -6, 6), 1100, 3), area('a_fill', (5, -5, 1.5), 160, 5), area('a_rim', (2, 4, 5), 600, 2)],
    'C': [area('c_key', (-3.5, -5, 4.5), 950, 5, (1, 0.9, 0.78)), area('c_fill', (4, -4, 1), 160, 6, (0.85, 0.92, 1))],
}
sun = bpy.data.lights.new('b_sun', 'SUN')
sun.energy, sun.angle = 3.0, math.radians(0.6)
sun_ob = link(bpy.data.objects.new('b_sun', sun))
d = Vector((0.45, 0.8, -0.38)).normalized()
sun_ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
LIGHTS['B'] = [sun_ob]

world = bpy.data.worlds.new('w')
world.use_nodes = True
sc.world = world
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (1, 1, 1, 1)

# ---------- Render ----------
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for dv in prefs.devices:
        dv.use = dv.type == 'METAL'
    sc.cycles.device = 'GPU'
except Exception as e:
    print('GPU setup failed', e)
sc.cycles.use_denoising = True
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.03
sc.cycles.max_bounces = 4
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.render.resolution_x, sc.render.resolution_y = 1440, 720
sc.render.resolution_percentage = PCT
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'


def style(s):
    for L in LETTERS:
        h, cu = L['size'], L['t'].data
        cu.materials[0] = M[s][L['key']]
        show = (PASS == 'name') == (L['key'] != 's')
        L['t'].hide_render = not show
        L['o'].hide_render = not (show and s == 'B')
        if s == 'A':
            cu.extrude, cu.bevel_depth, cu.bevel_resolution = 0.13 * h, 0.022 * h, 4
        elif s == 'B':
            cu.extrude, cu.bevel_depth = 0, 0
        else:
            cu.extrude, cu.bevel_depth, cu.bevel_resolution = 0.1 * h, 0.075 * h, 6
    for k, ls in LIGHTS.items():
        for l in ls:
            l.hide_render = k != s
    bg.inputs['Strength'].default_value = {'A': 0.35, 'B': 1.6, 'C': 0.4}[s]
    wall.location.y = 0.12 if s == 'B' else 0.32
    sc.render.use_motion_blur = s == 'A'
    sc.render.motion_blur_shutter = 0.45
    sc.cycles.samples = SAMPLES or {'A': 64, 'B': 16, 'C': 64}[s]
    if s == 'B':
        cam.data.type, cam.data.ortho_scale = 'ORTHO', 7.7
        cam.animation_data_clear()
        cam.location = (0, -20, 0.62)
    else:
        cam.data.type, cam.data.lens = 'PERSP', 50
        cam.animation_data_clear()
        if s == 'A':
            cam.location = (-2.2, -10.2, 0.0)
            cam.keyframe_insert('location', frame=1)
            cam.location = (0.0, -10.7, 0.8)
            cam.keyframe_insert('location', frame=48)
            cam.location = (0.4, -10.8, 0.95)
            cam.keyframe_insert('location', frame=76)
        else:
            cam.location = (1.6, -10.3, 1.4)
            cam.keyframe_insert('location', frame=137)
            cam.location = (0.0, -10.8, 0.8)
            cam.keyframe_insert('location', frame=196)


def act_of(f):
    return 'A' if f <= A[1] else 'B' if f <= B[1] else 'C'


if FRAMES == 'all':
    frames = list(range(1, 197))
elif FRAMES == 'test':
    frames = [40, 112, 163]
else:
    frames = [int(x) for x in FRAMES.split(',')]
# Stop motion is shot on twos: only odd frames of act 3 are rendered, the even ones repeat them.
frames = [f for f in frames if act_of(f) != 'C' or (f - C[0]) % 2 == 0]

os.makedirs(OUT, exist_ok=True)
cur = None
for f in frames:
    s = act_of(f)
    if s != cur:
        style(s)
        cur = s
    sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, f'{f:04d}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', f, flush=True)
