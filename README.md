# Tidelight

An original 3-level watercolour game: a young lighthouse keeper crosses stepping-stone islands to relight the lamps along the
coast. Built to test whether a real AI workflow can be published as a Framiad Frame. The workflow follows the steps Shikhar
(@xikhar) shared for his game Sumiro (X thread, 3 Nov 2026); the world, character and code here are our own.

**Play it:** <https://kaschtanov.github.io/tidelight/>

Everything that becomes the Frame is logged below: what was made, with which tool and model, the prompt, and the cost.

## Workflow log

| Step | What | Tool / model | Credits |
| --- | --- | --- | --- |
| 1 | Reference keyframe (2 variants, A chosen) | Higgsfield · GPT Image 2.6, low, 1k | 0.5 |
| 1 | Reference video from keyframe A, 5 s, silent | Higgsfield · Kling 3.0 std | ~6 |
| 2 | World pieces (stones, cliffs, lighthouses, cottage, planks) built by script | Blender 5.2 (`blender/build_assets.py`) | 0 |
| 3 | Character sheet, 4 views (2 variants, A chosen) | Higgsfield · GPT Image 2.6, low | 0.5 |
| 3 | 3D model from the 4 views | Higgsfield · Tripo H3.1 Multiview | 9 |
| 3 | Rig + run, rig + idle; merged into one GLB | Higgsfield · Meshy rigging; Blender (`blender/merge_animations.py`) | 16 |
| 4 | Bot playtest of all levels, frame by frame | Claude Code (`tools/playtest.mjs`, `src/bot.js`) | 0 |
| 5 | Concept art, 3 per level (9 images) | Higgsfield · GPT Image 2.6, low | 2.25 |
| 6 | Game: Three.js, three chained levels, watercolour shading, storm | Claude Code + Three.js | 0 |
| 6 | Demo video, Claude plays all three levels | `tools/record.mjs` + Blender (`blender/frames_to_mp4.py`) | 0 |

Total Higgsfield credits: about 34.

## Run it

```
cd web && npm install && npm run dev      # http://localhost:5180
node tools/playtest.mjs                   # the bot plays all levels and reports falls
node tools/record.mjs && blender -b --python blender/frames_to_mp4.py -- tools/out/frames frame/tidelight-demo.mp4
```

## Prompts

### Step 1 · reference keyframe

> Third-person video game screenshot, hand-painted watercolour style on textured paper: a young lighthouse keeper in a long
> yellow oilskin coat and knitted cap, carrying a brass lantern, seen from behind, standing on a wet rock in the sea. Ahead, a
> path of flat stepping-stone rocks leads across calm turquoise water to a small white-and-red lighthouse on a cliff island.
> Soft morning mist, pale peach sky, seagulls, loose watercolour washes, visible paper grain, gentle bleeding edges, muted teal,
> sand and coral palette. Wide cinematic shot, no text, no UI.

### Step 1 · reference video

> Third-person game camera follows the lighthouse keeper in the yellow coat from behind as she hops from stepping stone to
> stepping stone across the calm sea toward the lighthouse, lantern swinging, coat fluttering, gentle water ripples, seagulls
> gliding, slow forward camera dolly, hand-painted watercolour look kept throughout.

## Folders

`refs/` reference images and video · `concept/` level concept art · `character/` character views · `models/` GLB files ·
`blender/` Blender scripts and .blend files · `web/` the Three.js game · `frame/` media prepared for the Framiad Frame.
