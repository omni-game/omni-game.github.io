"""Retargets the Quaternius "Universal Animation Library" (CC0) onto Zenith Burst's pose rig.

Run with Blender's Python module (pip install bpy):
    python saga/tools/retarget_ual.py <UAL1_Standard.glb> saga/mocap.js

The game poses every fighter with a few joint angles (see defaultPose in fighter.js):
  chest/twist/head    torso lean, torso twist, head pitch
  aRx/aRs, eR (+ L)   upper-arm raise (about x) and spread (about z), elbow bend
  lRx/lRs, kR (+ L)   thigh raise and spread, knee bend
  hand                finger curl (0 open .. 1 fist), drop = pelvis height change
For each frame of each clip this samples the mannequin's bone directions, expresses them in the frames the game
uses, and solves for those angles, then writes keyframed clips the game's clip player understands. Because the
result is in the game's own parameters, every fighter can use these animations.
"""
import json
import math
import sys

import bpy
import numpy as np
from mathutils import Matrix

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
SRC, OUT = args[0], args[1]
RATE = 20  # samples per second
SCALE = 1.15  # mannequin height -> roster height, for the pelvis drop

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
B2G = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], dtype=float)  # blender (x, y, z) -> game (x, z, -y)


def g(v):
    return B2G @ np.array(v, dtype=float)


def rot_delta(name):
    pb = arm.pose.bones[name]
    m = (arm.matrix_world.to_3x3() @ pb.matrix.to_3x3()) @ (arm.matrix_world.to_3x3() @ pb.bone.matrix_local.to_3x3()).inverted()
    R = np.array(m, dtype=float)
    return B2G @ R @ B2G.T


def direction(name):
    pb = arm.pose.bones[name]
    mw = arm.matrix_world
    d = g((mw @ pb.tail) - (mw @ pb.head))
    return d / (np.linalg.norm(d) + 1e-9)


def pos(name):
    return g(arm.matrix_world @ arm.pose.bones[name].head)


def Rx(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def Ry(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def Rz(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def limb(frame, d, f, s):
    """Solve a two-bone limb: frame = parent rotation, d = upper direction, f = lower direction, s = side (-1 right)."""
    lo = frame.T @ d
    az = math.asin(max(-1.0, min(1.0, lo[0])))
    ax = math.atan2(-lo[2], -lo[1])
    U = frame @ Rx(ax) @ Rz(az)
    fl = U.T @ f
    bend = math.atan2(-fl[2], -fl[1])
    return ax, az * s, bend


def euler_xy(R):
    # three.js Euler 'XYZ' (R = Rx Ry Rz): y = asin(R[0,2]), x = atan2(-R[1,2], R[2,2])
    y = math.asin(max(-1.0, min(1.0, R[0, 2])))
    x = math.atan2(-R[1, 2], R[2, 2])
    return x, y


def curl(side):
    h = direction('hand_' + side)
    f = direction('middle_02_' + side)
    return max(0.0, min(1.0, math.acos(max(-1.0, min(1.0, float(h @ f)))) / 1.9))


bpy.context.scene.frame_set(0)
arm.animation_data_create()
rest_pelvis = None
clips = {}
for act in bpy.data.actions:
    arm.animation_data.action = act
    f0, f1 = act.frame_range
    dur = max(1.0 / fps, (f1 - f0) / fps)
    n = max(2, int(round(dur * RATE)) + 1)
    keys = []
    for i in range(n):
        t = i / (n - 1)
        bpy.context.scene.frame_set(int(round(f0 + t * (f1 - f0))))
        if rest_pelvis is None:
            arm.animation_data.action = None
            for pb in arm.pose.bones:
                pb.matrix_basis = Matrix.Identity(4)
            bpy.context.view_layer.update()
            rest_pelvis = pos('pelvis')[1]
            arm.animation_data.action = act
            bpy.context.scene.frame_set(int(round(f0 + t * (f1 - f0))))
        C = rot_delta('spine_03')
        chest, twist = euler_xy(C)
        Cg = Rx(chest) @ Ry(twist)
        H = Cg.T @ rot_delta('Head')
        head, _ = euler_xy(H)
        p = {'chest': chest, 'twist': twist, 'head': head - chest * 0.0, 'bob': 0}
        for side, s, a, e in (('r', -1, 'aR', 'eR'), ('l', 1, 'aL', 'eL')):
            ax, asp, bend = limb(Cg, direction('upperarm_' + side), direction('lowerarm_' + side), s)
            p[a + 'x'], p[a + 's'], p[e] = ax, asp, bend
        for side, s, l, k in (('r', -1, 'lR', 'kR'), ('l', 1, 'lL', 'kL')):
            ax, lsp, bend = limb(np.eye(3), direction('thigh_' + side), direction('calf_' + side), s)
            p[l + 'x'], p[l + 's'], p[k] = ax, lsp, bend
        p['hand'] = (curl('r') + curl('l')) / 2
        p['drop'] = (pos('pelvis')[1] - rest_pelvis) * SCALE
        keys.append([round(t, 4), {k2: round(v, 3) for k2, v in p.items()}])
    clips[act.name] = {'dur': round(dur, 3), 'loop': act.name.endswith('_Loop'), 'keys': keys}
    print(act.name, round(dur, 2), 's', n, 'keys')

with open(OUT, 'w') as fh:
    fh.write("'use strict';\n// Generated by tools/retarget_ual.py from the Quaternius Universal Animation Library (CC0).\n")
    fh.write('// Keyframes are in the game\'s pose parameters, so any fighter can play them.\n')
    fh.write('globalThis.ZB = globalThis.ZB || {};\nZB.MOCAP = ' + json.dumps(clips, separators=(',', ':')) + ';\n')
print('wrote', OUT, len(clips), 'clips')
