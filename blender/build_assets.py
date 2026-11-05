# Builds the world pieces of Tidelight in Blender and exports each as a GLB for Three.js.
# blender -b --factory-startup --python build_assets.py -- <out_dir>
# Shapes follow the concept art (refs/key-a.png): flat stepping stones, cliff islands, a red-and-white lighthouse, a cottage.
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector, noise

OUT = sys.argv[sys.argv.index("--") + 1]
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb, rough=0.9):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = rough
    return m


def obj_from_bm(bm, name, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def lumpy(bm, seed, amount, scale, top_flat=None):
    """Push each vertex outwards along its direction from the centre with smooth noise; keep a flat walkable top if asked."""
    off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
    for v in bm.verts:
        n = noise.noise(v.co * scale + off)
        d = Vector((v.co.x, v.co.y, 0))
        if d.length > 1e-4:
            v.co += d.normalized() * n * amount
        if top_flat is not None and v.co.z > top_flat - 0.05:
            v.co.z = top_flat + n * 0.03
        else:
            v.co.z += n * amount * 0.4


def stone(seed, radius=1.0, height=0.5):
    """A flat stepping stone: a squashed, bevelled cylinder with a nearly flat top (the player stands on z = height)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=radius, radius2=radius * 0.9, depth=height + 0.6)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (height - 0.6) / 2))
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if not e.is_boundary], cuts=2, use_grid_fill=True)
    random.seed(seed)
    sx, sy = 1 + random.uniform(-0.12, 0.12), 1 + random.uniform(-0.12, 0.12)
    for v in bm.verts:
        v.co.x *= sx
        v.co.y *= sy
    lumpy(bm, seed, radius * 0.14, 1.6 / radius, top_flat=height)
    return bm


def cliff(seed, radius=6.0, height=5.0):
    """A cliff island: a rock column with ledges and cracks, wider at the foot, with a flat grassy top (its own material)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=radius * 1.25, radius2=radius, depth=height + 2)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (height - 2) / 2))
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=6, use_grid_fill=True)
    off = Vector((seed * 5.3, seed * 2.9, seed * 8.1))
    for v in bm.verts:
        d = Vector((v.co.x, v.co.y, 0))
        if d.length < 1e-4:
            continue
        a = math.atan2(v.co.y, v.co.x)
        # big bays and headlands around the outline, ledges in bands up the side, fine cracks
        bays = noise.noise(Vector((math.cos(a) * 1.3, math.sin(a) * 1.3, 0)) + off) * 0.22
        ledge = math.sin(v.co.z * 2.2 + noise.noise(v.co * 0.4 + off) * 2.0) * 0.035
        crack = noise.noise(v.co * 1.8 + off) * 0.06
        v.co += d.normalized() * radius * (bays + ledge + crack)
        if v.co.z > height - 0.05:
            v.co.z = height + noise.noise(v.co * 0.5 + off) * 0.06
    return bm


def export(name, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = os.path.join(OUT, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_yup=True)
    print("EXPORTED", path)


ROCK = (0.55, 0.52, 0.47)
MOSS = (0.47, 0.5, 0.33)
GRASS = (0.56, 0.6, 0.36)
WHITE = (0.93, 0.9, 0.84)
RED = (0.78, 0.3, 0.25)
BRASS = (0.78, 0.6, 0.3)
ROOF = (0.55, 0.32, 0.28)

# Stepping stones: five variants, unit radius; the game scales them.
for i in range(5):
    reset()
    ob = obj_from_bm(stone(i + 1), f"stone_{i}", mat("rock", ROCK))
    export(f"stone_{i}", [ob])

# Cliff islands: two variants, rock sides with a grass cap.
for i in range(2):
    reset()
    ob = obj_from_bm(cliff(i + 11), f"cliff_{i}", mat("rock", ROCK))
    top = mat("grass", GRASS)
    ob.data.materials.append(top)
    for p in ob.data.polygons:
        if p.normal.z > 0.75 and p.center.z > 4.6:
            p.material_index = 1
    export(f"cliff_{i}", [ob])


def lighthouse(height=7.0, base_r=1.3, top_r=0.9, bands=4):
    """Tower in red and white bands, a gallery ring, the lamp room and a cone roof. Origin at the foot."""
    parts = []
    band_h = height / bands
    for b in range(bands):
        bm = bmesh.new()
        r0 = base_r + (top_r - base_r) * (b / bands)
        r1 = base_r + (top_r - base_r) * ((b + 1) / bands)
        bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=r0, radius2=r1, depth=band_h)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, band_h * (b + 0.5)))
        parts.append(obj_from_bm(bm, f"band_{b}", mat("red" if b % 2 else "white", RED if b % 2 else WHITE)))
    bm = bmesh.new()  # gallery
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=top_r + 0.45, radius2=top_r + 0.45, depth=0.15)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, height + 0.08))
    parts.append(obj_from_bm(bm, "gallery", mat("brass", BRASS, 0.5)))
    bm = bmesh.new()  # lamp room (the game lights this material)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=top_r * 0.75, radius2=top_r * 0.75, depth=1.0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, height + 0.65))
    parts.append(obj_from_bm(bm, "lamp", mat("lamp", (0.95, 0.85, 0.6), 0.3)))
    bm = bmesh.new()  # roof
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=top_r * 0.95, radius2=0.05, depth=0.9)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, height + 1.6))
    parts.append(obj_from_bm(bm, "roof", mat("red", RED)))
    return parts


reset()
export("lighthouse", lighthouse())
reset()
export("lighthouse_tall", lighthouse(height=12.0, base_r=1.8, top_r=1.1, bands=6))


def cottage():
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(3.2, 2.2, 1.8), verts=bm.verts)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.9))
    walls = obj_from_bm(bm, "walls", mat("white", WHITE))
    bm = bmesh.new()  # a gabled roof: a triangular prism
    bmesh.ops.create_cone(bm, cap_ends=True, segments=3, radius1=1.45, radius2=1.45, depth=3.5)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(math.pi / 2, 3, "Y"))
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(-math.pi / 2, 3, "X"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 2.3))
    roof = obj_from_bm(bm, "roof", mat("roof", ROOF))
    return [walls, roof]


reset()
export("cottage", cottage())

# A driftwood plank for level 2's floating platforms.
reset()
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1)
bmesh.ops.scale(bm, vec=(2.4, 1.0, 0.22), verts=bm.verts)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
lumpy(bm, 31, 0.05, 2.0)
export("plank", [obj_from_bm(bm, "plank", mat("wood", (0.55, 0.42, 0.3)))])
