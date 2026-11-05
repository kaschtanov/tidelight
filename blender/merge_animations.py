# Merge the rigged keeper's animations (one GLB per animation from Meshy) into one GLB with all clips.
# blender -b --factory-startup --python merge_animations.py -- <out.glb> <main.glb> <other.glb> [<other.glb> ...]
# The first file supplies the mesh and skeleton; the others only their action. Helper meshes (Icosphere) are dropped.
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
out, main, others = args[0], args[1], args[2:]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=main)
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
keep = set(bpy.context.scene.objects)

for path in others:
    before = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.context.scene.objects) - keep:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in set(bpy.data.actions) - before:
        a.use_fake_user = True

# Every action becomes its own NLA strip, so the exporter writes each as a separate animation.
arm.animation_data_create()
arm.animation_data.action = None
for a in bpy.data.actions:
    name = a.name.split("|")[1] if "|" in a.name else a.name
    a.name = name
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(a.frame_range[0]), a)

for o in list(bpy.context.scene.objects):
    if o.type == "MESH" and o.name.startswith("Icosphere"):
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.export_scene.gltf(filepath=out, export_animations=True, export_animation_mode="NLA_TRACKS", export_yup=True)
print("MERGED", [a.name for a in bpy.data.actions], "->", out)
