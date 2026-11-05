# Turn a folder of numbered JPEG frames into an H.264 MP4 with Blender's sequencer.
# blender -b --factory-startup --python frames_to_mp4.py -- <frames_dir> <out.mp4> [fps] [scale %] [quality: HIGH | MEDIUM | LOW]
import os
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
frames_dir, out, fps = args[0], args[1], int(args[2]) if len(args) > 2 else 30
scale = int(args[3]) if len(args) > 3 else 100
quality = args[4] if len(args) > 4 else "MEDIUM"
files = sorted(f for f in os.listdir(frames_dir) if f.endswith(".jpg"))

scene = bpy.context.scene
scene.sequence_editor_create()
strip = scene.sequence_editor.strips.new_image("frames", os.path.join(frames_dir, files[0]), channel=1, frame_start=1)
for f in files[1:]:
    strip.elements.append(f)
scene.frame_start, scene.frame_end = 1, len(files)
scene.render.fps = fps
scene.render.resolution_x, scene.render.resolution_y = strip.elements[0].orig_width, strip.elements[0].orig_height
scene.render.resolution_percentage = scale
if hasattr(scene.render.image_settings, "media_type"):  # Blender 5: pick video output first
    scene.render.image_settings.media_type = "VIDEO"
scene.render.image_settings.file_format = "FFMPEG"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = quality
scene.render.ffmpeg.ffmpeg_preset = "GOOD"
scene.render.filepath = out
bpy.ops.render.render(animation=True)
print("WROTE", out, len(files), "frames")
