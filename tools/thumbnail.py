# The Frame's video thumbnail: four scenes from the clean recording, crossfaded, with the Frame title set big on top.
# python3 tools/thumbnail.py <font.ttf> <out_dir>   (then blender/frames_to_mp4.py turns out_dir into an mp4)
# Also writes poster.jpg: the last scene with the same text, for places that need a still.
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

FONT, OUT = sys.argv[1], sys.argv[2]
SRC = "tools/out/frames-clean"
SCENES = [(420, 540), (900, 1020), (1650, 1770), (2090, 2210)]  # stones at dawn, the cave, the storm bridge, the beam
FADE = 10
W, H = 1280, 720

TITLE = ["A 3D game,", "built with AI"]
LINE = "Tidelight  ·  6 steps  ·  Higgsfield, Tripo, Blender, Three.js, Claude Code"
KICKER = "WORKFLOW"


def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f


big, small, kick = font(104, "ExtraBold"), font(27, "Medium"), font(21, "Bold")

# A soft dark wash from the lower left, so white text reads on the bright morning scenes too.
shade = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(shade)
for y in range(H):
    d.line([(0, y), (W, y)], fill=int(205 * max(0, (y - H * 0.28) / (H * 0.72)) ** 1.3))
side = Image.new("L", (W, H), 0)
ds = ImageDraw.Draw(side)
for x in range(W):
    ds.line([(x, 0), (x, H)], fill=int(120 * max(0, 1 - x / (W * 0.75)) ** 1.5))
shade = ImageChops.lighter(shade, side)


def overlay(frame, t):
    """t: seconds since start (kept for a later intro; the title is fixed now)."""
    k = 1  # the title stands from the first frame: Frame cards show the video's first frame as its picture
    img = frame.convert("RGB").resize((W, H))
    black = Image.new("RGB", (W, H), (12, 14, 22))
    img = Image.composite(black, img, shade)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dl = ImageDraw.Draw(layer)
    x, y0 = 64, H - 120 - 2 * 100 - 58 + int(28 * (1 - k))  # clear of the player bar the card lays over the bottom
    a = int(255 * k)
    dl.text((x + 2, y0 - 44), KICKER, font=kick, fill=(255, 214, 120, a), spacing=0)
    for i, line in enumerate(TITLE):
        dl.text((x, y0 + i * 100), line, font=big, fill=(255, 255, 255, a))
    dl.text((x + 2, y0 + 2 * 100 + 26), LINE, font=small, fill=(232, 232, 236, int(a * 0.92)))
    # a faint shadow behind the type
    sh = layer.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.45))
    img.paste((0, 0, 0), (0, 0), sh)
    img.paste(layer, (0, 0), layer)
    return img


os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))

frames = []
for a, b in SCENES:
    frames.append([Image.open(f"{SRC}/{i:05d}.jpg") for i in range(a, b)])
n = 0
for s, clip in enumerate(frames):
    for j, fr in enumerate(clip):
        if s > 0 and j < FADE:
            continue  # these frames were mixed into the crossfade
        if s + 1 < len(frames) and j >= len(clip) - FADE:
            nxt = frames[s + 1][j - (len(clip) - FADE)]
            fr = Image.blend(fr.convert("RGB"), nxt.convert("RGB"), (j - (len(clip) - FADE) + 1) / (FADE + 1))
        overlay(fr, n / 30).save(f"{OUT}/{n:05d}.jpg", quality=92)
        n += 1
overlay(frames[-1][40], 9).save("tools/out/poster.jpg", quality=92)
print(n, "frames")
