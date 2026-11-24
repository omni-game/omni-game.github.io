"""Builds a fighter as a rigged glTF (.glb) with Blender (bpy) for Zenith Burst.

Run with Blender's Python module (pip install bpy numpy scikit-image):
    node saga/tools/joints.js kairo > /tmp/kairo.json
    python saga/tools/build_model.py /tmp/kairo.json saga/models/kairo.glb [preview.png]

Pipeline: high-resolution signed-distance anatomy (numpy) -> marching cubes -> Blender meshes (decimated, smooth),
hands with fingers from the Skin modifier, anime hair locks fused by voxel remeshing, mouth cavity + teeth,
facial expression shape keys, clothing as offset shells with wrinkles, an armature whose joints match the game's
rig, automatic (heat) weights, and GLB export. Coordinates are built in game space (x, y up, z forward) and
converted to Blender space (x, -z, y), which the glTF exporter maps back.
"""
import json
import math
import sys

import bpy
import numpy as np
from skimage.measure import marching_cubes

J = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
ARMORED = J['id'] in ('rhen', 'zorath', 'nx9', 'valdris', 'oriel')


def V(p):
    return np.array(p, dtype=np.float32)


W, A, L, SX = J['W'], J['A'], J['L'], J['sx']
HY, HZ = J['head'][1], J['head'][2]


# ------------------------------------------------------------------ SDF primitives (vectorised)
def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def ssub(a, b, k):
    return -smin(-a, b, k)


def ell(P, c, r):
    x, y, z = P
    px, py, pz = (x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]
    k0 = np.sqrt(px * px + py * py + pz * pz)
    k1 = np.sqrt((px / r[0]) ** 2 + (py / r[1]) ** 2 + (pz / r[2]) ** 2) + 1e-9
    return k0 * (k0 - 1.0) / k1


def cone(P, a, b, ra, rb):
    x, y, z = P
    a, b = V(a), V(b)
    bx, by, bz = b - a
    px, py, pz = x - a[0], y - a[1], z - a[2]
    t = np.clip((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, 1)
    dx, dy, dz = px - bx * t, py - by * t, pz - bz * t
    return np.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t)


def E(c, r, k=0.04):
    return ('e', c, r, k)


def C(a, b, ra, rb, k=0.04):
    return ('c', a, b, ra, rb, k)


def evaluate(shapes, P):
    d = None
    for s in shapes:
        sub = s[0] == 'sub'
        s2 = s[1] if sub else s
        e = ell(P, s2[1], s2[2]) if s2[0] == 'e' else cone(P, s2[1], s2[2], s2[3], s2[4])
        k = s2[-1]
        if d is None:
            d = e
        elif sub:
            d = ssub(d, e, k)
        else:
            d = smin(d, e, k)
    return d


def lerp3(a, b, t, o=(0, 0, 0)):
    a, b = V(a), V(b)
    return a + (b - a) * t + V(o)


def add(p, x, y, z):
    return V(p) + V((x, y, z))


# ------------------------------------------------------------------ anatomy (detailed version of sculpt.js)
fem = J['id'] == 'mira'
w = 0.9 if fem else 1.0
torso = [
    E((0, 0.98, 0), (0.15 * W, 0.13, 0.11)),
    E((0.07 * W, 0.93, -0.05), (0.085 * W, 0.09, 0.08), 0.05), E((-0.07 * W, 0.93, -0.05), (0.085 * W, 0.09, 0.08), 0.05),
    E((0, 1.16, 0.01), (0.135 * W * w, 0.17, 0.1), 0.07),
    E((0, 1.43, 0), (0.185 * W * w, 0.19, 0.12), 0.08),
    E((0.085 * W * w, 1.49, 0.065), (0.095 * W * w, 0.07, 0.055), 0.035), E((-0.085 * W * w, 1.49, 0.065), (0.095 * W * w, 0.07, 0.055), 0.035),
    E((0.13 * W, 1.37, -0.02), (0.075 * W, 0.15, 0.075), 0.05), E((-0.13 * W, 1.37, -0.02), (0.075 * W, 0.15, 0.075), 0.05),
    # serratus / obliques
    E((0.15 * W, 1.28, 0.04), (0.04, 0.07, 0.04), 0.03), E((-0.15 * W, 1.28, 0.04), (0.04, 0.07, 0.04), 0.03),
    # traps, collarbones, neck with sternocleidomastoid
    C((0, 1.66, -0.02), (SX * 0.82, 1.6, -0.01), 0.06, 0.045, 0.06), C((0, 1.66, -0.02), (-SX * 0.82, 1.6, -0.01), 0.06, 0.045, 0.06),
    C((0.02, 1.62, 0.07), (SX * 0.75, 1.63, 0.03), 0.012, 0.012, 0.02), C((-0.02, 1.62, 0.07), (-SX * 0.75, 1.63, 0.03), 0.012, 0.012, 0.02),
    C((0, 1.58, -0.005), (0, 1.82, 0.0), 0.078, 0.07, 0.06),
    C((0.035, 1.63, 0.05), (0.06, 1.8, -0.005), 0.018, 0.015, 0.02), C((-0.035, 1.63, 0.05), (-0.06, 1.8, -0.005), 0.018, 0.015, 0.02),
]
for yy in (1.07, 1.17, 1.27):
    for s in (-1, 1):
        torso.append(E((s * 0.028 * W, yy, 0.096), (0.03 * W, 0.034, 0.018), 0.025))
arms, legs = [], []
for side, s in (('R', -1), ('L', 1)):
    sh, el, wr = V(J['sh'][side]), V(J['el'][side]), V(J['wr'][side])
    arms += [
        E(add(sh, s * 0.012, -0.03, 0), (0.075 * A, 0.085 * A, 0.075 * A), 0.05),
        C(sh, el, 0.052 * A, 0.042 * A, 0.04),
        E(lerp3(sh, el, 0.5, (0, 0, 0.025)), (0.042 * A, 0.1, 0.042 * A), 0.035), E(lerp3(sh, el, 0.45, (0, 0, -0.028)), (0.042 * A, 0.11, 0.04 * A), 0.035),
        C(el, lerp3(el, wr, 1.08), 0.043 * A, 0.029 * A, 0.03), E(lerp3(el, wr, 0.28, (s * 0.006, 0, 0.01)), (0.042 * A, 0.085, 0.038 * A), 0.03),
    ]
    hp, kn, an, to = V(J['hip'][side]), V(J['kn'][side]), V(J['ank'][side]), V(J['toe'][side])
    legs += [
        C(hp, kn, 0.083 * L, 0.052 * L, 0.05),
        E(lerp3(hp, kn, 0.48, (s * 0.008, 0, 0.03)), (0.068 * L, 0.17, 0.058 * L), 0.04), E(lerp3(hp, kn, 0.45, (0, 0, -0.03)), (0.062 * L, 0.16, 0.055 * L), 0.04),
        E(add(kn, 0, 0.01, 0.04), (0.035, 0.035, 0.02), 0.02),
        C(kn, an, 0.049 * L, 0.032 * L, 0.03), E(lerp3(kn, an, 0.33, (0, 0, -0.035)), (0.046 * L, 0.11, 0.043 * L), 0.03),
        C(an, to, 0.038, 0.028, 0.03), E(add(an, 0, -0.03, -0.02), (0.035, 0.035, 0.045), 0.03),
    ]
hy, hz = HY, HZ
NECK_LO = HY - 0.2
head = [
    E((0, hy + 0.04, hz - 0.015), (0.165, 0.19, 0.185)),
    E((0, hy - 0.06, hz + 0.04), (0.115 if fem else 0.125, 0.12, 0.13), 0.06),
    E((0, hy - 0.135, hz + 0.1), (0.038 if fem else 0.046, 0.035, 0.04), 0.04),
    E((0.085, hy - 0.005, hz + 0.11), (0.05, 0.035, 0.045), 0.04), E((-0.085, hy - 0.005, hz + 0.11), (0.05, 0.035, 0.045), 0.04),
    E((0, hy + 0.06, hz + 0.13), (0.12, 0.022 if fem else 0.028, 0.05), 0.035),
    # nose: bridge, tip, wings
    C((0, hy + 0.035, hz + 0.165), (0, hy - 0.03, hz + 0.2), 0.011, 0.017, 0.02),
    E((0, hy - 0.038, hz + 0.197), (0.018, 0.016, 0.016), 0.012),
    E((0.017, hy - 0.045, hz + 0.183), (0.012, 0.011, 0.012), 0.01), E((-0.017, hy - 0.045, hz + 0.183), (0.012, 0.011, 0.012), 0.01),
    # lips (cupid's bow) and philtrum
    E((0, hy - 0.083, hz + 0.168), (0.038, 0.011, 0.016), 0.012),
    E((0.012, hy - 0.08, hz + 0.17), (0.014, 0.008, 0.012), 0.006), E((-0.012, hy - 0.08, hz + 0.17), (0.014, 0.008, 0.012), 0.006),
    E((0, hy - 0.101, hz + 0.163), (0.034, 0.012, 0.017), 0.012),
    # jaw angle and temples
    E((0.095, hy - 0.1, hz + 0.0), (0.035, 0.05, 0.06), 0.05), E((-0.095, hy - 0.1, hz + 0.0), (0.035, 0.05, 0.06), 0.05),
    C((0, NECK_LO, -0.005), (0, hy - 0.05, hz), 0.052, 0.068, 0.05),  # tapers inside the body neck so head turns never show a seam
    E((0.163, hy, hz - 0.01), (0.018, 0.05, 0.035), 0.02), E((-0.163, hy, hz - 0.01), (0.018, 0.05, 0.035), 0.02),
    # eye sockets (same centres as the game's eyeballs), nostrils, mouth slit and cavity
    ('sub', E((0.068, hy + 0.015, hz + 0.178), (0.042, 0.028, 0.033), 0.02)), ('sub', E((-0.068, hy + 0.015, hz + 0.178), (0.042, 0.028, 0.033), 0.02)),
    ('sub', E((0.011, hy - 0.05, hz + 0.192), (0.005, 0.004, 0.006), 0.004)), ('sub', E((-0.011, hy - 0.05, hz + 0.192), (0.005, 0.004, 0.006), 0.004)),
    ('sub', E((0, hy - 0.092, hz + 0.17), (0.032, 0.0028, 0.03), 0.003)),
    ('sub', E((0, hy - 0.094, hz + 0.125), (0.036, 0.022, 0.04), 0.008)),
]
MOUTH_CAV = ((0, hy - 0.094, hz + 0.125), (0.036, 0.022, 0.04))


def grid(bmin, bmax, cell):
    xs = np.arange(bmin[0], bmax[0] + cell, cell, dtype=np.float32)
    ys = np.arange(bmin[1], bmax[1] + cell, cell, dtype=np.float32)
    zs = np.arange(bmin[2], bmax[2] + cell, cell, dtype=np.float32)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing='ij')
    return (X, Y, Z), (xs[0], ys[0], zs[0])


def mesh_sdf(fn, bmin, bmax, cell):
    xs = np.arange(bmin[0], bmax[0] + cell, cell, dtype=np.float32)
    ys = np.arange(bmin[1], bmax[1] + cell, cell, dtype=np.float32)
    zs = np.arange(bmin[2], bmax[2] + cell, cell, dtype=np.float32)
    F = np.empty((len(xs), len(ys), len(zs)), dtype=np.float32)
    for i0 in range(0, len(xs), 24):  # evaluate in slabs to bound memory
        X, Y, Z = np.meshgrid(xs[i0:i0 + 24], ys, zs, indexing='ij')
        F[i0:i0 + 24] = fn((X, Y, Z))
    o = (xs[0], ys[0], zs[0])
    verts, faces, _, _ = marching_cubes(F, 0.0, spacing=(cell, cell, cell))
    verts += np.array(o, dtype=np.float32)
    return verts, faces  # skimage winding is already outward for an SDF (negative inside)


rng_cache = {}


def wrinkle(P, a, sx=6, sy=3):
    # soft, irregular fabric folds: low-frequency warped sines, mostly running along the limbs
    x, y, z = P
    wx = x + 0.04 * np.sin(y * 13 + z * 7)
    wz = z + 0.04 * np.sin(y * 11 - x * 9)
    f = np.sin(wx * sx * 6.3 + np.sin(y * 4.0) * 1.5) * 0.55 + np.sin(wz * sx * 5.3 + y * sy * 6.3) * 0.45
    return a * f * (0.6 + 0.4 * np.sin(y * 7.0 + x * 5.0))


fT = lambda P: evaluate(torso, P)
fA = lambda P: evaluate(arms, P)
fL = lambda P: evaluate(legs, P)
fH = lambda P: evaluate(head, P)
NECK = HY - 0.12


def body(P):
    return np.maximum(smin(smin(fT(P), fA(P), 0.03), fL(P), 0.04), P[1] - NECK - 0.02)


# ------------------------------------------------------------------ Blender helpers
def g2b(v):
    v = np.asarray(v, dtype=np.float32)
    return np.stack([v[..., 0], -v[..., 2], v[..., 1]], axis=-1)


MATS = {}


def mat(name, color, rough=0.7, metal=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    c = ((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255
    b.inputs['Base Color'].default_value = (c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    MATS[name] = m
    return m


def new_obj(name, verts_game, faces, material):
    me = bpy.data.meshes.new(name)
    faces = faces.tolist() if isinstance(faces, np.ndarray) else [list(map(int, q)) for q in faces]
    me.from_pydata(g2b(verts_game).tolist(), [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def decimate(ob, target):
    n = len(ob.data.polygons)
    if n > target:
        m = ob.modifiers.new('dec', 'DECIMATE')
        m.ratio = target / n
        apply_mods(ob)
    for p in ob.data.polygons:
        p.use_smooth = True


def select_only(objs, active=None):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]


# ------------------------------------------------------------------ build
bpy.ops.wm.read_factory_settings(use_empty=True)
c = J['colors']
M = {
    'skin': mat('skin', c['skin'], 0.5),
    'gi': mat('gi', c['gi'], 0.9),
    'gi2': mat('gi2', c['gi2'], 0.32 if ARMORED else 0.85, 0.45 if ARMORED else 0),
    'belt': mat('belt', c['belt'], 0.8),
    'boots': mat('boots', c['boots'], 0.55),
    'hair': mat('hair', J['forms'][0]['hair'], 0.42),
    'mouth': mat('mouth', 0x3a1416, 0.6),
    'teeth': mat('teeth', 0xf2efe6, 0.3),
}
R = J['fist']['L'][0] + 0.14
print('meshing body...')
v, f = mesh_sdf(body, (-R, -0.03, -0.42), (R, NECK + 0.06, 0.42), 0.005)
ob_body = new_obj('body', v, f, M['skin'])
decimate(ob_body, 36000)

print('meshing head...')
v, f = mesh_sdf(lambda P: np.maximum(fH(P), NECK - 0.11 - P[1]), (-0.24, NECK - 0.15, HZ - 0.26), (0.24, HY + 0.26, HZ + 0.28), 0.0025)
ob_head = new_obj('head', v, f, M['skin'])
ob_head.data.materials.append(M['mouth'])
# faces inside the mouth cavity get the dark mouth material
cav_c, cav_r = np.array(MOUTH_CAV[0]), np.array(MOUTH_CAV[1])
for p in ob_head.data.polygons:
    cg = np.array(p.center)
    g = np.array([cg[0], cg[2], -cg[1]])
    if np.sum(((g - cav_c) / (cav_r + 0.004)) ** 2) < 1.0 and g[2] < HZ + 0.172:
        p.material_index = 1
decimate(ob_head, 26000)

# ---- facial expression shape keys on the head
ob_head.shape_key_add(name='Basis')
base = np.array([vv.co[:] for vv in ob_head.data.vertices])  # blender coords
G = np.stack([base[:, 0], base[:, 2], -base[:, 1]], axis=1)  # game coords


def add_key(name, delta_game):
    k = ob_head.shape_key_add(name=name)
    d = g2b(delta_game)
    for i, vv in enumerate(k.data):
        vv.co = (base[i] + d[i]).tolist()


# jaw open: rotate the lower face about a pivot under the ears
piv = np.array([0, HY - 0.035, HZ - 0.06])
ang = 0.2
rel = G - piv
wj = (np.clip((HY - 0.088 - G[:, 1]) / 0.012, 0, 1) * np.clip((G[:, 2] - (HZ - 0.06)) / 0.08, 0, 1)
      * np.clip(1 - (np.abs(G[:, 0]) - 0.1) / 0.05, 0, 1) * np.clip((G[:, 1] - (HY - 0.21)) / 0.03, 0, 1))
ry = rel[:, 1] * math.cos(ang) - rel[:, 2] * math.sin(ang)
rz = rel[:, 1] * math.sin(ang) + rel[:, 2] * math.cos(ang)
add_key('open', np.stack([np.zeros_like(wj), (ry - rel[:, 1]) * wj, (rz - rel[:, 2]) * wj], 1))
# angry brows: inner brows pulled down and in
wb = np.clip(1 - np.abs(G[:, 1] - (HY + 0.06)) / 0.035, 0, 1) * (G[:, 2] > HZ + 0.08) * np.clip(1 - np.abs(G[:, 0]) / 0.12, 0, 1)
add_key('angry', np.stack([-np.sign(G[:, 0]) * wb * 0.004, -wb * 0.009, -wb * 0.004], 1))
# pain: inner brows up, cheeks raised
wp = wb * np.clip(1 - np.abs(G[:, 0]) / 0.07, 0, 1)
wc = np.clip(1 - np.hypot(np.abs(G[:, 0]) - 0.07, G[:, 1] - (HY - 0.03)) / 0.04, 0, 1) * (G[:, 2] > HZ + 0.1)
add_key('pain', np.stack([np.zeros_like(wp), wp * 0.01 + wc * 0.006, wc * 0.002], 1))

# ---- teeth (upper row, visible when the mouth opens)
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.03, depth=0.012, location=tuple(g2b([0, HY - 0.087, HZ + 0.135])))
teeth = bpy.context.active_object
teeth.name = 'teeth'
teeth.scale = (1.0, 0.95, 1.0)
teeth.data.materials.append(M['teeth'])
bpy.ops.object.transform_apply(scale=True)

# ---- hands with fingers (Skin modifier), in each arm's local frame
print('hands...')
hand_objs = []
FINGERS = [('index', 0.026, 0.074), ('middle', 0.008, 0.082), ('ring', -0.01, 0.077), ('pinky', -0.027, 0.062)]
for side, s in (('R', -1), ('L', 1)):
    wr = np.array(J['wr'][side])
    th = s * J['a0']
    rot = np.array([[math.cos(th), -math.sin(th), 0], [math.sin(th), math.cos(th), 0], [0, 0, 1]])
    pts, edges, radii = [], [], []

    def P(p, r):
        pts.append(wr + rot @ np.array(p))
        radii.append(r)
        return len(pts) - 1

    w0 = P((0, 0.02, 0.0), 0.027 * A)
    w1 = P((0, -0.015, 0.0), 0.024 * A)
    edges.append((w0, w1))
    for name, z, ln in FINGERS:
        k = P((s * 0.002, -0.085, z * A), 0.0125 * A)
        edges.append((w1, k))
        segs = [ln * 0.45, ln * 0.32, ln * 0.23]
        prev, y = k, -0.085
        for j, sl in enumerate(segs):
            y -= sl
            q = P((s * (-0.004 * (j + 1)), y, z * A), (0.0105 - 0.0018 * j) * A)
            edges.append((prev, q))
            prev = q
    # thumb: from the base of the palm, toward the front, angled across
    t0 = P((-s * 0.012, -0.02, 0.028 * A), 0.014 * A)
    edges.append((w1, t0))
    prev = t0
    for j, off in enumerate([(-s * 0.016, -0.045, 0.045), (-s * 0.02, -0.07, 0.055), (-s * 0.022, -0.09, 0.06)]):
        q = P((off[0], off[1], off[2] * A), (0.011 - 0.0015 * j) * A)
        edges.append((prev, q))
        prev = q
    me = bpy.data.meshes.new('hand' + side)
    me.from_pydata(g2b(np.array(pts)).tolist(), edges, [])
    ob = bpy.data.objects.new('hand' + side, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(M['skin'])
    ob.modifiers.new('skin', 'SKIN')
    for i, sv in enumerate(me.skin_vertices[0].data):
        sv.radius = (radii[i], radii[i] * 0.85)
    me.skin_vertices[0].data[0].use_root = True
    sub = ob.modifiers.new('sub', 'SUBSURF')
    sub.levels = 2
    apply_mods(ob)
    for p in ob.data.polygons:
        p.use_smooth = True
    hand_objs.append(ob)

# ---- hair: anime locks swept along curved paths, fused by voxel remeshing
print('hair...')
LOCKS = [
    (0, 0.2, -0.05, -0.45, 0, 0.11, 0.46), (0.13, 0.18, -0.05, -0.5, -0.75, 0.1, 0.44), (-0.13, 0.18, -0.05, -0.5, 0.75, 0.1, 0.44),
    (0.2, 0.06, -0.08, -0.95, -1.3, 0.09, 0.38), (-0.2, 0.06, -0.08, -0.95, 1.3, 0.09, 0.38), (0, 0.1, -0.19, -1.45, 0, 0.11, 0.44),
    (0.12, -0.02, -0.2, -1.85, -0.6, 0.09, 0.36), (-0.12, -0.02, -0.2, -1.85, 0.6, 0.09, 0.36), (0.07, 0.15, -0.14, -1.1, -0.35, 0.1, 0.42),
    (-0.07, 0.15, -0.14, -1.1, 0.35, 0.1, 0.42), (0.21, -0.06, -0.02, -0.6, -1.9, 0.06, 0.24), (-0.21, -0.06, -0.02, -0.6, 1.9, 0.06, 0.24),
    (0.06, 0.17, 0.15, 1.15, -0.35, 0.06, 0.24), (-0.05, 0.18, 0.15, 1.05, 0.45, 0.055, 0.2), (0.0, 0.19, 0.14, 1.3, 0.05, 0.05, 0.18),
]
hv, hf = [], []
headc = np.array([0, HY, HZ])


def lock(x, y, z, rx, rz, r, ln, bend=0.25):
    # direction from rotation (rx about x, then rz about z) applied to +y
    d = np.array([0.0, 1.0, 0.0])
    d = np.array([d[0], d[1] * math.cos(rx) - d[2] * math.sin(rx), d[1] * math.sin(rx) + d[2] * math.cos(rx)])
    d = np.array([d[0] * math.cos(rz) - d[1] * math.sin(rz), d[0] * math.sin(rz) + d[1] * math.cos(rz), d[2]])
    k = 0.82
    o = headc + np.array([x, y, z]) * k
    r, ln = r * k, ln * k
    side = np.cross(d, [0, 0, 1.0]) if abs(d[2]) < 0.9 else np.array([1.0, 0, 0])
    side /= np.linalg.norm(side)
    up = np.cross(side, d)
    back = np.array([0, -0.15, -1.0])
    base_i = len(hv)
    N, S = 14, 10
    for i in range(N + 1):
        t = i / N
        c = o + d * ln * t + back * bend * ln * t * t * 0.35
        rad = r * (1 - t) ** 0.85 + 0.0008
        for j in range(S):
            a = j / S * 2 * math.pi
            hv.append(c + side * math.cos(a) * rad + up * math.sin(a) * rad * 0.62)
    for i in range(N):
        for j in range(S):
            a0, a1 = base_i + i * S + j, base_i + i * S + (j + 1) % S
            hf.append((a0, a1, a1 + S, a0 + S))
    # caps
    hv.append(o)
    ci = len(hv) - 1
    for j in range(S):
        hf.append((base_i + (j + 1) % S, base_i + j, ci))
    hv.append(o + d * ln)
    ce = len(hv) - 1
    for j in range(S):
        hf.append((base_i + N * S + j, base_i + N * S + (j + 1) % S, ce))


for l in LOCKS:
    lock(*l)
# scalp shell: cranium sdf offset outward, only the top/back
def scalp(P):
    x, y, z = P
    # hairline: high over the forehead, lower at the temples, down to the nape at the back
    t = np.clip((z - (HZ - 0.06)) / 0.16, 0, 1)
    t = t * t * (3 - 2 * t)
    y_min = (HY - 0.1) * (1 - t) + (HY + 0.095) * t - np.clip(np.abs(x) - 0.11, 0, 0.06) * 1.2 * t
    return np.maximum.reduce([evaluate([head[0]], P) - 0.013, y_min - y, z - (HZ + 0.165)])


v, f = mesh_sdf(scalp, (-0.22, HY - 0.15, HZ - 0.25), (0.22, HY + 0.25, HZ + 0.2), 0.004)
ob_hair = new_obj('hair', np.vstack([v, np.array(hv)]), f.tolist() + [[int(i) + len(v) for i in q] for q in hf], M['hair'])
rm = ob_hair.modifiers.new('remesh', 'REMESH')
rm.mode = 'VOXEL'
rm.voxel_size = 0.0035
sm = ob_hair.modifiers.new('smooth', 'SMOOTH')
sm.iterations = 6
sm.factor = 0.6
apply_mods(ob_hair)
decimate(ob_hair, 14000)

# ---- clothing shells
print('clothes...')
wrinkle_top = lambda P: wrinkle(P, 0.0045)
sh_l = np.array(J['sh']['L'])
el_l = np.array(J['el']['L'])


def armT(P):
    x, y, z = P
    s = np.where(x < 0, -1.0, 1.0)
    ax, ay = s * sh_l[0], sh_l[1]
    bx, by = s * el_l[0] - ax, el_l[1] - ay
    l2 = bx * bx + by * by
    return ((x - ax) * bx + (y - ay) * by) / l2, np.sqrt(l2)


def top(P):
    x, y, z = P
    d = smin(fT(P), fA(P), 0.03) - 0.024 + wrinkle_top(P)
    d = np.maximum(np.maximum(d, 1.0 - y), y - 1.7)
    t, ln = armT(P)
    sleeveT = 1.62 if ARMORED else 0.55
    cut = (np.abs(x) > SX * 0.78) & (y < sh_l[1] + 0.05)
    d = np.where(cut, np.maximum(d, (t - sleeveT) * ln), d)
    if not ARMORED:
        d = ssub(d, ell(P, (0, 1.63, 0.15), (0.07 * W, 0.2, 0.12)), 0.02)
    return d


R2 = R + 0.05
clothes = []
v, f = mesh_sdf(top, (-R2, 0.95, -0.36), (R2, 1.76, 0.36), 0.006)
clothes.append(('top', v, f, 'gi', 26000))
if not ARMORED:
    v, f = mesh_sdf(lambda P: np.maximum.reduce([fT(P) - 0.012, 1.3 - P[1], P[1] - 1.68, np.abs(P[0]) - 0.12 * W]), (-0.2, 1.25, -0.3), (0.2, 1.72, 0.3), 0.006)
    clothes.append(('under', v, f, 'gi2', 5000))
v, f = mesh_sdf(lambda P: np.maximum.reduce([smin(fT(P), fL(P), 0.04) - 0.038 + wrinkle(P, 0.006, 5, 2), P[1] - 1.04, 0.22 - P[1], np.abs(P[0]) - 0.29 * W]), (-0.36, 0.15, -0.3), (0.36, 1.1, 0.3), 0.006)
clothes.append(('pants', v, f, 'gi', 24000))
v, f = mesh_sdf(lambda P: np.maximum(fT(P) - 0.05, np.abs(P[1] - 1.02) - 0.03), (-0.32, 0.96, -0.3), (0.32, 1.08, 0.3), 0.005)
clothes.append(('belt', v, f, 'belt', 4000))
# belt knot + tails
knot = [E((0.05, 1.02, 0.175), (0.035, 0.028, 0.025), 0.01), C((0.04, 1.0, 0.18), (0.02, 0.86, 0.19), 0.016, 0.012, 0.01), C((0.06, 1.0, 0.18), (0.085, 0.87, 0.19), 0.016, 0.012, 0.01)]
v, f = mesh_sdf(lambda P: evaluate(knot, P), (-0.02, 0.82, 0.13), (0.13, 1.06, 0.23), 0.004)
clothes.append(('knot', v, f, 'belt', 3000))
wrR, elR = np.array(J['wr']['L']), np.array(J['el']['L'])


def wristband(P):
    x, y, z = P
    s = np.where(x < 0, -1.0, 1.0)
    ax, ay = s * wrR[0], wrR[1]
    dx, dy = s * (wrR[0] - elR[0]), wrR[1] - elR[1]
    ln = math.hypot(wrR[0] - elR[0], dy)
    return np.maximum(fA(P) - 0.016, np.abs(((x - ax) * dx + (y - ay) * dy) / ln + 0.04) - 0.042)


v, f = mesh_sdf(wristband, (-R2, wrR[1] - 0.12, -0.15), (R2, wrR[1] + 0.16, 0.15), 0.004)
clothes.append(('wrist', v, f, 'gi2', 6000))
v, f = mesh_sdf(lambda P: np.maximum(fL(P) - 0.022 + wrinkle(P, 0.002, 8, 4), P[1] - 0.27), (-0.36, -0.03, -0.2), (0.36, 0.32, 0.3), 0.005)
clothes.append(('boots', v, f, 'boots', 8000))
cloth_objs = []
for name, v, f, m, tgt in clothes:
    ob = new_obj(name, v, f, M[m])
    decimate(ob, tgt)
    cloth_objs.append(ob)

# ------------------------------------------------------------------ armature (joint names match the game rig)
print('rig...')
arm_data = bpy.data.armatures.new('rig')
arm = bpy.data.objects.new('rig', arm_data)
bpy.context.scene.collection.objects.link(arm)
select_only([arm])
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones


def bone(name, head_g, tail_g, parent=None):
    b = eb.new(name)
    b.head = tuple(g2b(head_g))
    b.tail = tuple(g2b(tail_g))
    if parent:
        b.parent = eb[parent]
    return b


T0 = np.array(J['tilt'])
bone('tilt', T0 - [0, 0.18, 0], T0 + [0, 0.02, 0])
bone('chest', T0 + [0, 0.05, 0], [0, 1.6, 0], 'tilt')
bone('neck', [0, 1.6, 0], [0, NECK, HZ], 'chest')
bone('head', [0, NECK, HZ], [0, HY + 0.2, HZ], 'neck')
for side in ('R', 'L'):
    s = -1 if side == 'R' else 1
    sh, el, wr = J['sh'][side], J['el'][side], J['wr'][side]
    bone('clav.' + side, [s * 0.03, 1.6, 0.0], sh, 'chest')
    bone('sh.' + side, sh, el, 'clav.' + side)
    bone('el.' + side, el, wr, 'sh.' + side)
    th = s * J['a0']
    rot = np.array([[math.cos(th), -math.sin(th), 0], [math.sin(th), math.cos(th), 0], [0, 0, 1]])
    wrv = np.array(wr)
    bone('fist.' + side, wr, wrv + rot @ np.array([0, -0.085, 0]), 'el.' + side)
    for name, z, ln in FINGERS:
        k = wrv + rot @ np.array([s * 0.002, -0.085, z * A])
        m1 = wrv + rot @ np.array([-s * 0.004, -0.085 - ln * 0.45, z * A])
        tip = wrv + rot @ np.array([-s * 0.012, -0.085 - ln, z * A])
        bone(f'{name}1.' + side, k, m1, 'fist.' + side)
        bone(f'{name}2.' + side, m1, tip, f'{name}1.' + side)
    t0 = wrv + rot @ np.array([-s * 0.012, -0.02, 0.028 * A])
    t1 = wrv + rot @ np.array([-s * 0.02, -0.07, 0.055 * A])
    t2 = wrv + rot @ np.array([-s * 0.022, -0.095, 0.06 * A])
    bone('thumb1.' + side, t0, t1, 'fist.' + side)
    bone('thumb2.' + side, t1, t2, 'thumb1.' + side)
    hp, kn, an, to = J['hip'][side], J['kn'][side], J['ank'][side], J['toe'][side]
    bone('hip.' + side, hp, kn, 'tilt')
    bone('kn.' + side, kn, an, 'hip.' + side)
    bone('foot.' + side, an, to, 'kn.' + side)
bpy.ops.object.mode_set(mode='OBJECT')

# skin everything with Blender's automatic (bone heat) weights
skinned = [ob_body, ob_head, teeth, ob_hair] + hand_objs + cloth_objs
for ob in skinned:
    select_only([ob, arm], arm)
    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    except Exception as e:  # noqa
        print('auto weights failed for', ob.name, e)
    if not ob.vertex_groups or all(len([1 for v in ob.data.vertices if v.groups]) == 0 for _ in [0]):
        print('no weights on', ob.name)
# clothes copy the body's weights so cloth and skin deform identically (no poke-through)
for ob in cloth_objs:
    for g in list(ob.vertex_groups):
        ob.vertex_groups.remove(g)
    dt = ob.modifiers.new('wt', 'DATA_TRANSFER')
    dt.object = ob_body
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    select_only([ob])
    bpy.ops.object.datalayout_transfer(modifier=dt.name)
    bpy.ops.object.modifier_move_to_index(modifier=dt.name, index=0)
    bpy.ops.object.modifier_apply(modifier=dt.name)
# head, teeth and hair follow only the head bone
for ob in (ob_head, teeth, ob_hair):
    for g in list(ob.vertex_groups):
        ob.vertex_groups.remove(g)
    g = ob.vertex_groups.new(name='head')
    g.add(list(range(len(ob.data.vertices))), 1.0, 'REPLACE')
for ob in skinned:
    n0 = sum(1 for v in ob.data.vertices if len(v.groups) == 0)
    print(ob.name, len(ob.data.vertices), 'verts', len(ob.data.polygons), 'faces', 'unweighted', n0)

# ------------------------------------------------------------------ export
select_only(skinned + [arm], arm)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_morph=True, export_yup=True,
                          export_apply=False, export_animations=False, export_materials='EXPORT', export_normals=True, export_texcoords=False)
print('exported', OUT)

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x, sc.render.resolution_y = 900, 1200
    cam_d = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_d)
    sc.collection.objects.link(cam)
    cam.location = (1.2, -4.2, 1.35)
    cam.rotation_euler = (math.radians(88), 0, math.radians(16))
    cam_d.lens = 50
    sc.camera = cam
    sc.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    print('preview', PREVIEW)
