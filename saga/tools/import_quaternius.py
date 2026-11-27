"""Converts a Quaternius "Universal Base Characters" model (CC0) into a Zenith Burst fighter .glb.

Run with Blender's Python module (pip install bpy):
    python saga/tools/import_quaternius.py <character.gltf> <textures_dir> <out.glb> [hair.gltf] [skin_texture.png]

What it does:
- imports the rigged character (65-bone UE-style skeleton with fingers), relinks its textures
- re-poses it from T-pose into the game's A-pose (arms 0.42 rad out, legs 0.09 rad out) and applies that as the rest pose,
  so the game's rig (which assumes that rest pose) drives it correctly
- optionally adds a hairstyle mesh (the pack's "Origin at 0" hair), skinned 100% to the Head bone
- scales it to the roster's height, keeps only base-colour textures (downscaled to 1024px) for the cel shader
- names materials by role (skintex, eyetex, hair) so the game can pick them up
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
SRC, TEXDIR, OUT = args[0], args[1], args[2]
HAIR = args[3] if len(args) > 3 and args[3] != '-' else None
SKIN = args[4] if len(args) > 4 else None
A0, B0 = 0.42, 0.09  # must match sculpt.js joints() for 'normal' bodies
TARGET_HEIGHT = 2.05

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
scene = bpy.context.scene
for o in list(scene.objects):
    if o.type == 'MESH' and not o.vertex_groups:  # helper shapes (e.g. an unskinned Icosphere)
        bpy.data.objects.remove(o, do_unlink=True)
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
meshes = [o for o in scene.objects if o.type == 'MESH']


def relink_images():
    files = {f.lower(): os.path.join(TEXDIR, f) for f in os.listdir(TEXDIR) if f.lower().endswith('.png')}
    for img in bpy.data.images:
        base = os.path.basename(img.filepath or img.name).lower().replace('_png.png', '.png')
        if base in files and not os.path.exists(bpy.path.abspath(img.filepath)):
            img.filepath = files[base]
            img.reload()


relink_images()

# ---- re-pose T-pose -> game A-pose
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')


def aim(name, d):
    pb = arm.pose.bones[name]
    bpy.context.view_layer.update()
    head = pb.head.copy()
    cur = (pb.tail - pb.head).normalized()
    q = cur.rotation_difference(Vector(d).normalized())
    pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
    bpy.context.view_layer.update()


for side, s in (('r', -1), ('l', 1)):
    arm_dir = (s * math.sin(A0), 0, -math.cos(A0))  # blender coords: x right, -y forward, z up
    for b in ('upperarm_', 'lowerarm_', 'hand_'):
        aim(b + side, arm_dir)
    leg_dir = (s * math.sin(B0), 0, -math.cos(B0))
    for b in ('thigh_', 'calf_'):
        aim(b + side, leg_dir)
bpy.ops.object.mode_set(mode='OBJECT')

# bake the pose into the meshes, then make it the rest pose
for o in meshes:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        if m.type == 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=m.name)
    nm = o.modifiers.new('Armature', 'ARMATURE')
    nm.object = arm
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')

# ---- optional hairstyle, rigidly following the Head bone
if HAIR:
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=HAIR)
    relink_images()
    for o in set(scene.objects) - before:
        if o.type != 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        mw = o.matrix_world.copy()
        o.parent = None
        o.data.transform(mw)
        o.matrix_world = Matrix.Identity(4)
        for g in list(o.vertex_groups):
            o.vertex_groups.remove(g)
        g = o.vertex_groups.new(name='Head')
        g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        o.parent = arm
        o.modifiers.new('Armature', 'ARMATURE').object = arm
        o.name = 'hairstyle'
        meshes.append(o)

# ---- scale to the roster's height (uniform, about the origin)
top = max((o.matrix_world @ v.co).z for o in meshes if o.name.lower().startswith('superhero') for v in o.data.vertices)
k = TARGET_HEIGHT / top
for o in meshes:
    o.data.transform(Matrix.Scale(k, 4))
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for eb in arm.data.edit_bones:
    eb.head *= k
    eb.tail *= k
bpy.ops.object.mode_set(mode='OBJECT')

# ---- tailor clothes: offset copies of body regions (picked by their strongest bone), so they share the body's rig
# The free base characters come in underwear; these give every fighter a gi top, trousers, belt, wristbands and boots.
import bmesh  # noqa: E402

body = next(o for o in meshes if o.name.lower().startswith('superhero'))
gname = {g.index: g.name.lower() for g in body.vertex_groups}


def main_bone(v):
    best = max(v.groups, key=lambda g: g.weight, default=None)
    return gname.get(best.group, '') if best else ''


def garment(name, pick, offset, mat_color):
    me = body.data.copy()
    ob = body.copy()
    ob.data = me
    ob.name = name
    scene.collection.objects.link(ob)
    bm = bmesh.new()
    bm.from_mesh(me)
    dvl = bm.verts.layers.deform.active
    keep = set()
    for v in bm.verts:
        groups = v[dvl] if dvl else {}
        bestg = max(groups.items(), key=lambda kv: kv[1])[0] if groups else None
        if pick(gname.get(bestg, ''), v.co):
            keep.add(v.index)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v.index in keep for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * offset
    bm.to_mesh(me)
    bm.free()
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = mat_color
    me.materials.clear()
    me.materials.append(m)
    for poly in me.polygons:
        poly.use_smooth = True
    meshes.append(ob)
    return ob


def zb(co):  # height in blender units after scaling
    return co.z


waist = arm.data.bones['spine_01'].head_local.z
ankle = arm.data.bones['foot_r'].head_local.z
elbow = arm.data.bones['lowerarm_r'].head_local.z
wrist = arm.data.bones['hand_r'].head_local.z
TOP = ('spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r')
garment('top', lambda b, co: (b in TOP or b == 'neck_01' and co.z < waist + 0.62) and co.z > waist - 0.06, 0.012, (0.1, 0.4, 0.45, 1))
garment('pants', lambda b, co: b in ('pelvis', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'spine_01') and ankle + 0.14 < co.z < waist + 0.05, 0.02, (0.1, 0.4, 0.45, 1))
garment('belt', lambda b, co: abs(co.z - (waist + 0.01)) < 0.035 and b in ('pelvis', 'spine_01'), 0.03, (0.05, 0.08, 0.2, 1))
garment('boots', lambda b, co: (b in ('foot_l', 'foot_r', 'ball_l', 'ball_r', 'ball_leaf_l', 'ball_leaf_r') or b in ('calf_l', 'calf_r') and co.z < ankle + 0.2), 0.012, (0.05, 0.05, 0.08, 1))
garment('wrist', lambda b, co: b in ('lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r') and abs(co.z - (wrist + (elbow - wrist) * 0.15)) < 0.045, 0.01, (0.9, 0.9, 0.9, 1))

# ---- materials: base colour only, named by role, textures downscaled
for o in meshes:
    for slot in o.material_slots:
        m = slot.material
        if not m:
            continue
        low = m.name.lower()
        if o.name in ('top', 'pants', 'belt', 'boots', 'wrist'):
            m.name = {'top': 'gi', 'pants': 'gi', 'belt': 'belt', 'boots': 'boots', 'wrist': 'gi2'}[o.name]
            continue
        role = 'eyetex' if 'eye' in low else 'hair' if 'hair' in low or o.name.lower().startswith(('eyebrow', 'hairstyle')) else 'skintex'
        nt = m.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        for inp in ('Normal', 'Roughness', 'Metallic'):
            for l in list(bsdf.inputs[inp].links):
                nt.links.remove(l)
        bsdf.inputs['Roughness'].default_value = 0.7
        base = bsdf.inputs['Base Color'].links
        if role == 'skintex' and SKIN and base:
            img = base[0].from_node.image
            img.filepath = SKIN
            img.reload()
        if role == 'hair':
            for l in list(base):
                nt.links.remove(l)  # hair is recoloured per form in the game
        m.name = role
for img in bpy.data.images:
    if img.size[0] > 1024:
        img.scale(1024, 1024)

# ---- export
for o in scene.objects:
    o.select_set(o in meshes or o == arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                          export_morph=False, export_image_format='JPEG', export_jpeg_quality=85, export_texcoords=True, export_normals=True)
print('exported', OUT, 'scale', round(k, 3), 'meshes', [o.name for o in meshes])
