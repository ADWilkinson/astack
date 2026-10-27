# Animated stickers

Playful isometric stickers (flat fill, thick ink outline, extruded slab side) that move on After Effects grade keyframe presets, replayed the way lottie-web plays them. They play live on a canvas in any page and export to looping alpha video. Use them for onboarding art, empty states, feature icons and reward moments, where a still icon undersells the moment.

The kit and these rules come from [fun-isometric](https://skills.klvn.dev/fun-isometric) by Kelvin Adithya (MIT, see `kit/LICENSE`), inspired by the stickers in Slush. `scripts/fi.mjs` is a dependency-free port of its renderer.

## Files

`<skill-dir>` is this skill's folder.

- `kit/fun.ts`: runtime and shape kit. Types (`Icon`, `Layer`, `Shape`, `Motion`, `Palette`, `View`), `draw`, `paint`, `play`, the shared `clock`, path builders `rect pill ellipse poly spark rosette ring star line arc`, `view` and `onFace` for 3d models and tilted faces, `VIEWS`, and the colour kit `RISO`, `PALETTES`, `ACCENTS`, `brand`, `mono`, `hue`.
- `kit/motions.ts`: the presets and eases. Read its doc comments before choosing.
- `kit/icons.ts`: 24 worked icons covering every preset. Copy from these; they are the style reference.
- `kit/Sticker.tsx`: the React component.
- `scripts/fi.mjs`: `check`, `sheet`, `frame`, `export`. Node 22.13+ or Bun, Chrome, and ffmpeg for sheets and video. No install step.

## Setup in a project

Copy `kit/fun.ts`, `kit/motions.ts` and, for React, `kit/Sticker.tsx` into one folder (for example `src/stickers/`) and write the project's icons in an `icons.ts` beside them. `fi.mjs` needs `fun.ts` next to the icons file. No dependency, no Lottie player.

## The request

Read a sticker request as: an object and what it does ("a pen scribbling on a square pad"), an optional motion preset, colours, and a facing.

- **Motion**: a preset from the table below. Left out, pick it from the object's verb.
- **Colours**: a named set (`riso`, the default, `candy`, `matcha`, `sunset`, `clay`, `aqua`), `brand #primary [#secondary]`, `mono #hex`, `hue <deg>`, or six hexes for the slots `main gold tint ok hot deep`. Use the product's tokens when it has them: `brand()` with its two main colours is the usual answer.
- **Facing** maps to `VIEWS`: top right is `right` (the default), top left `left`, front `front`, lying flat `flat`. The view's `tilt` goes on every flat face and its `extrude` on the icon. A 3d model mirrors its yaw for `left` (`180 - yaw`).

## Workflow

1. **Name the object and its verb.** A wallet tosses, a lock clasps, a coin bounces, a bell wiggles. Pick the preset by verb, not by object.
2. **Draw** the parts in a 500 unit square with the shape kit or raw path data, facing the asked view. Rules under Drawing.
3. **Rig**: pivot each moving part where it would hinge in life (`a` and `p` set to the same point), parent the parts that ride along, give the root the preset, give followers the lag preset or the same preset delayed (`at`) and scaled (`k`). A tilted icon with sparkles keeps them upright: an untilted root carries the motion and the sparkles, the tilted face is its child, and parts parented to the face swing in its plane (see `padlock`, `gift`, `chat`).
4. **Sparkle** on the beat: `twinkle`, `glint` or `sparkle` started on the action's peak frame (the slam, the landing, the reveal).
5. **Look**: `node <skill-dir>/scripts/fi.mjs sheet src/stickers/icons.ts <name>` and open the PNG, then `fi.mjs frame src/stickers/icons.ts <name> <frame> --px 800` on the peak frames, with the asked colours (`--palette <name>`, `--brand '#a,#b'`, `--mono`, `--hue`).
6. **Check**: `node <skill-dir>/scripts/fi.mjs check src/stickers/icons.ts` until it passes, then the list at the end.
7. **Ship**: live with `<Sticker>` or `play()`, or `fi.mjs export src/stickers/icons.ts <name> --px 400 --out public/stickers` for alpha video and its poster. Then check it in the page with `shoot.mjs`, light and dark, at the smallest size it appears.

## Drawing

- Canvas 500. Subject about 50 to 60% of it, centred, room for the swing.
- Outline 5 (`line: 5`, 4 only for small busy sets), ink, on everything. Fills draw it outside the edge, open paths centre it,
  and it keeps one width on a tilted face. Miter joins and butt caps keep corners sharp; `round: true` only for organic shapes.
- Colours are palette slots, `fill: 'ok'`, never hex, so any palette recolours the icon: `main gold tint ok hot deep` plus
  `white grey paper ink`. Slots are roles a brand palette keeps: `main` for bodies, `deep` the dark second colour, `tint` pale fills,
  `gold` for coins, stars and bells, `ok` for success, `hot` for hearts, alerts and flames. Two accents per icon plus white is the usual budget. No gradients,
  shadows or glow. A fixed hex (`'#1a1a1a'`) is for a colour that must never follow the palette.
- Faces lean, never just rotate: a flat object's layer takes the view's tilt (`VIEWS.right.tilt` is `[-18, 36]`), turned in its
  own plane then leaned back, so rects foreshorten into parallelograms and circles into ellipses. A faceted object (paper
  plane, gem) is modelled in 3d with `view(yaw, pitch)` and its faces drawn with `poly()`, so its proportions are true. Round
  bodies (coins, bells) are drawn foreshortened.
- An upright object (trophy, bulb, pen pad) is one silhouette on one leaned plane, like the calendar. Never a face on slab with
  its side falling straight down, which reads as a shadow, and never a perspective ellipse (a cup's rim) on a front facing slab.
- Every body is a slab: `depth: 1` extrudes it along the icon's `extrude` (the view's), which stays in canvas space while faces
  turn, so the side always falls the same way. Side colour is the fill (`side` for a contrast). Thin parts take .2 to .8.
- Build from parts, each with its own thickness, never one shape with detail painted flat: a raised label, a plate behind the
  keyhole, a collar between lens and handle, a base under a button, side buttons on a phone, a ribbon whose own depth wraps it
  down the box. A hero object is three to six parts, never fewer.
- `poly()` slabs crease themselves down the corner where two visible side faces meet, the line that makes them read solid. Raw
  paths take `edges` for the same line.
- Detail is sparse and ink: one keyhole, two pupils, a few lines. An inset rim (the coin's ellipse, the heart's inner heart) over a highlight.
- Sparkles are `spark()` in `'white'` with the outline, sized 14 to 30.
- Faces with eyes clip their pupils with `clip` so `look` can move them.

## Colours

| Spec | Call | What it does |
| --- | --- | --- |
| `riso` | none, or `RISO` | the default six accents, risograph inks |
| `candy` `matcha` `sunset` `clay` `aqua` | `PALETTES.<name>` | whole named sets: lilac, leaf and pine, orange and plum, terracotta and slate, aqua and teal |
| `brand #a #b` | `brand(a, b)` | two brand colours fill every accent: `a` on bodies, tints and hearts, `b` on dark parts, coins and checks, so no stock yellow; `b` left out is a deep shade of `a` |
| `mono #hex` | `mono(hex)` | every accent on the brand's hue at six lightnesses, parts kept apart by lightness |
| `hue <deg>` | `hue(deg)` | every accent turned around the wheel, each keeping its lightness and strength |
| six hexes | `{ main, gold, tint, ok, hot, deep }` | exact slots |

All are partial palettes over `RISO`, worked in OKLCH and eased into sRGB. Pass one as `palette` to `<Sticker>`, `play()`,
`draw()` or `paint()`; a running sticker takes a new one through `player.set({ palette })` without restarting.

## Motion presets (kit/motions.ts)

| Preset | What it does | Use for |
| --- | --- | --- |
| `toss`, `tossLag`, `tossLag2` | winds up 20 degrees, whips past to 22 on an arc, lands hard; the lags ride inside | containers spilling contents: wallet, folder, bag |
| `hop` | rises tilting 9, slams through rest, two rebounds | badges, hearts, rewards, pins |
| `bounce` | springs up and right to a raised spot, holds, drops back through rest | coins, tokens, chips |
| `wiggle` | rocks back 20, taps twice, slides 12px | bells, thumbs, hands |
| `jolt(v)` | kicked along v with the spring, holds, eases home | cards, calendars, mailboxes |
| `impact(v)` + `latch(v)` | lid slams in on an ease in, body takes the hit with the spring | lids, stamps, caps |
| `clasp` + `shackle` | lifts as the shackle springs open, slams down right | locks, clips, toggles that latch |
| `wobble` | dips and rocks a few degrees, never still | faces, characters, headphones |
| `look` | pupils glance up left, dart down right | any face |
| `drift` | lazy figure of eight with a slow bank | planes, balloons, floating things |
| `twist` | turns home sharp, slow 17 degree twist out and back | keys, magnifiers, wands |
| `nudge`, `flick` | body nudged by a hit, a tab flicks out and back | piggy banks, characters reacting |
| `press` | pushed 23px into its own side, back, pops 13 proud | buttons, keys, shutters |
| `sway`, `float`, `bob` | 5 degree lean, 10px float, small bob, 3s | idle layers, phased 20 frames apart |
| `deal(from, turn, start)`, `fall(to, start)` | dealt in on `0,0,0,1` swooping level, staggered 14 to 20 frames; dropped and cut | scenes that assemble, then clear before the loop; a coin into a slot |
| `slide(to, start)` | to another slot on `.8,0,.2,1`, holds, back | toggles, tiles, sliders, a letter out of a door |
| `spring(to, start, pace)`, `springTurn` | baked spring: 1.448 overshoot, swings halving, 91 frames | any settle the presets do not cover, a flag going up |
| `twinkle`, `glint`, `sparkle` | star pops (10 + 20f), glare swells (71f), sparkle turns 46 degrees (84f) | the beat |
| `erase` (trim), `flicker` (morph) | lines erased and redrawn 5 frames apart; shapes stepped every 40 | text lines, flames |

Eases worth knowing: `EASY` .333,0,.667,1 for every sway and every half swing; `POP` .75,0,.25,1; `SNAP` .8,0,.2,1; `OUT` 0,0,0,1;
`IN` 1,0,.8,1. Loops run 123 to 180 frames at 60fps, the action in the first half and a still hold after it. That hold is the feel;
never fill it with idle wobble.

## Rules

- Motion comes from a preset, a preset builder or `spring()`. Never hand write a sine loop, a CSS keyframe wobble, or new bezier
  numbers. To tune, change amplitude with `k`, timing with `at`, direction with the builder's vector. Never stretch the keys.
- Children follow through: same preset `at` +4 to +6 with `k` .6 to 1.4, or the lag preset. Parts never move in lockstep.
- Pop in and out with scale, never opacity: slabs draw as a stack of copies, and alpha makes the stack show.
- Path morph keys need identical command lists; build them from one function (see `flame` in `kit/icons.ts`).
- Parts that leave the scene use `ip` and `op`, the way the devices loop cuts each part one after another.
- `icon.still` is the frame shown under reduced motion and where a play once stops: set it to a frame where the icon reads whole.

## Check before calling it done

- `fi.mjs check` passes: ids, parents and clips resolve, colours are slots or hex, morph keys share commands, every motion's
  loop divides the icon, nothing touches the canvas edge on any frame, and the loop does not jump at the seam.
- The sheet reads at 160px: silhouette clear, outline even, side falling the same way on every part.
- Beside the worked icons at the same px: same line weight, faces leaning, every part with thickness.
- It reads in the asked colours and in `riso`: render both with `fi.mjs frame`.
- Every moving part pivots where it would hinge, and at least one part lags.

## Using it on the web

```tsx
import { Sticker } from './stickers/Sticker'
import { brand } from './stickers/fun'
import { coins } from './stickers/icons'

<Sticker icon={coins} palette={brand('#0a84ff', '#ff7a1a')} enter={0.2} style={{ width: 160 }} />
<Sticker icon={coins} loop={false} replayOnHover />
```

- `<Sticker>` props: `icon`, `palette`, `loop` (false plays once from when it first shows, then rests on `still`), `offset`
  (frames ahead of the page clock), `enter` (seconds after it first shows to pop in on the bounce entrance), `replayOnHover`,
  `label` (accessible name, the icon's by default), `className`, `style`. The canvas fills its width at 1:1; size it with css.
- Without React: `const player = play(canvas, icon, { palette, loop, offset, enter })` returns `{ stop, replay, set }`. `set`
  swaps the icon or options in place; `replay` restarts the motion from frame 0 on the next tick.
- One rAF loop drives every sticker on the page. It skips stickers off screen and repaints only when the pose, size or colours
  changed, so a still hold or a paused clock costs no paint. Copies along the side are spaced per device pixel, so a 48px sticker
  draws a fraction of a 500px one. A sticker whose icon throws is logged and dropped; the rest keep playing.
- Reduced motion shows `icon.still` and skips the entrance, following the setting live.
- `clock.speed`, `clock.paused` and `clock.frame` steer every sticker at once, for slow motion and scrubbing in review tools.
- SSR safe: nothing touches the DOM until `play()` or `paint()` runs, so mount stickers in effects.
- For a fixed frame (a post, an export): `draw(ctx, icon, frame, palette)` with ctx scaled so the icon's 500 units fill the box.

For video, `fi.mjs export` writes VP9 alpha webm, HEVC alpha mp4 on macOS for Safari, and `<name>.png` at the still frame for the
video's poster and a reduced motion fallback; `--bg '#ffffff'` flattens to H.264 for social. Colour flags apply to every render.
