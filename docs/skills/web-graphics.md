# web-graphics

## What it does

Builds isometric, flat, ASCII, halftone, diagram and social-card graphics in code, with a scene compiler for isometric projection and depth order. Also makes animated sticker icons on a bundled keyframe kit, played live on canvas or exported to looping alpha video.

## When to reach for it

Hero illustrations, explainer visuals, icon sets, animated onboarding and empty-state icons, OG images, anything where stock art would look generic.

## It's working if

You get editable source next to the export, the graphic was inspected at its smallest real size in both themes, and nothing in it pretends to be data the product does not have. A screen that exists is a capture inside the frame, not a screen redrawn to look cleaner.

## Common questions

**Does it use image generation?** Only for photographic or painterly texture, and it says so. Everything else is SVG, CSS or canvas.

**Where do the stickers come from?** The kit is [fun-isometric](https://skills.klvn.dev/fun-isometric) by Kelvin Adithya (MIT). `fi.mjs` checks and exports them with only Chrome and ffmpeg, no install step.

[Skill source](../../skills/web-graphics/SKILL.md)
