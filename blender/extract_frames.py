# Grab stills from a video with Blender's sequencer (no ffmpeg needed).
# blender -b --factory-startup --python extract_frames.py -- <video> <out_dir> <frame> [<frame> ...]
import os
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
video, out_dir, frames = args[0], args[1], [int(f) for f in args[2:]]
os.makedirs(out_dir, exist_ok=True)

scene = bpy.context.scene
scene.sequence_editor_create()
strip = scene.sequence_editor.strips.new_movie("v", video, channel=1, frame_start=1)
scene.render.resolution_x, scene.render.resolution_y = strip.elements[0].orig_width, strip.elements[0].orig_height
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.frame_end = strip.frame_final_end

for f in frames:
    scene.frame_set(f)
    scene.render.filepath = os.path.join(out_dir, f"frame-{f:03d}.png")
    bpy.ops.render.render(write_still=True)
    print("WROTE", scene.render.filepath)
