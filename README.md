# Tidelight

An original 3-level watercolour game: a young lighthouse keeper crosses stepping-stone islands to relight the lamps along the
coast. Built to test whether a real AI workflow can be published as a Framiad Frame. The workflow follows the steps Shikhar
(@xikhar) shared for his game Sumiro (X thread, 3 Nov 2026); the world, character and code here are our own.

Everything that becomes the Frame is logged below: what was made, with which tool and model, the prompt, and the cost.

## Workflow log

| Step | What | Tool / model | Credits |
| --- | --- | --- | --- |
| 1 | Reference keyframe (2 variants, A chosen) | Higgsfield · GPT Image 2.6, low, 1k | 0.5 |
| 1 | Reference video from keyframe A, 5 s, silent | Higgsfield · Kling 3.0 std | ~6 |

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
