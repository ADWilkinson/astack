# Film: demo and changelog clips as code

A clip built as an HTML page on a timeline can be reviewed, diffed and re-rendered. A fix is an edit, not a re-shoot. `film.mjs` pauses the page, seeks every animation to each frame time, captures it and encodes with ffmpeg. The approach follows LangChain's [Content Studio](https://github.com/langchain-ai/design-agent) and [HyperFrames](https://hyperframes.heygen.com); `film.mjs` is a dependency-free take on the same idea.

## The order of work

1. **Storyboard.** Write it in `launch/media/STORYBOARD.md`, one line per beat. Give each: its time, what is on screen, the one thing the viewer should read, and the source (a real screenshot, a real number with its query). 6 to 15 seconds is 3 to 5 beats. Cut any beat that has nothing to read. Budget the seconds before building ([beat budget](#beat-budget)): the product is on screen within 3 seconds.
2. **Material.** Capture real screens with `shoot.mjs` at the size they will appear, at `--scale 2`. Place each capture as an image. Do not rebuild the screen in HTML for the clip, and do not invent a number the capture and the brief do not contain. A frame may crop the capture; it may not replace it.
3. **Animatic.** Build the composition with every beat in place and almost no motion. Render it, and look at a contact sheet (below) before adding motion. Most problems are layout and copy, and they are cheaper to fix here.
4. **Motion.** Add only motion that explains: a cursor that travels to the button, a value that changes, a panel that opens. Ease out, 200 to 600ms per move, one thing moving at a time.
5. **Render and gate.** `film.mjs` must exit 0. Then watch it once at full size and once at feed size, read it [as four critics](#read-it-as-four-critics), and score it with `web-design`'s review rubric if it is installed.
6. **One composition per aspect ratio.** 16:9 for a post or a page, 9:16 for stories and shorts, 1:1 or 4:5 for a feed. Each is its own layout at its own size, recomposed like a share card. A cropped or letterboxed 16:9 is not a vertical film.

## The composition contract

- Size the page to the frame: `body { width: 1920px; height: 1080px; margin: 0; overflow: hidden }`.
- Declare the length: `<html data-duration="8">`.
- Drive everything from CSS animations or the Web Animations API, started on load and placed with `animation-delay`. `film.mjs` pauses all of them and sets their time per frame, so they render identically every take.
- `<video>` elements are seeked to the frame time. GSAP's global timeline is seeked if `window.gsap` exists.
- Anything else (canvas loops, counters on `setInterval`, `requestAnimationFrame`) must expose `window.__film = { duration, seek(seconds) }` and draw the exact state for that time. `film.mjs` re-seeks two frames after rendering and fails the film if they changed: that is how clock-driven motion is caught.
- Use the product's real fonts and tokens, and run `render-gate.mjs` on the composition at its frame size to catch font fallback and off-token colours before rendering.

A minimal composition:

```html
<!doctype html>
<html data-duration="8">
<style>
  @font-face { font-family: "Brand"; src: url(../../public/fonts/brand.woff2) }
  body { width: 1920px; height: 1080px; margin: 0; overflow: hidden; background: #F6F8FA; color: #0E1726; font: 600 72px/1.1 Brand, sans-serif }
  .beat { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0 }
  .b1 { animation: leave 2.8s both }
  .b2 { animation: show 3s 2.8s both }
  .b3 { animation: show 2.2s 5.8s both }
  .shot { width: 1400px; border-radius: 16px; box-shadow: 0 24px 60px rgb(14 23 38 / .18) }
  .b2 .shot { animation: rise .5s 2.8s cubic-bezier(.2, .8, .2, 1) both }
  @keyframes leave { 0%, 92% { opacity: 1 } 100% { opacity: 0 } }
  @keyframes show { 0%, 100% { opacity: 0 } 6%, 94% { opacity: 1 } }
  @keyframes rise { from { transform: translateY(40px) } }
</style>
<div class="beat b1">Sell USDC for cash</div>
<div class="beat b2"><img class="shot" src="shots/1440-light.png" alt=""></div>
<div class="beat b3">usdctofiat.xyz</div>
</html>
```

```sh
node <skill-dir>/scripts/film.mjs launch/media/demo.html --size 1920x1080 --out launch/media/demo.mp4 --poster launch/media/demo-poster.png --poster-at 3
```

The first beat is fully visible at 0s and only fades on its way out, so the film opens on words. `film.mjs` fails a film that opens on a flat or black frame.

## Beat budget

A launch film of about 20 seconds, as a starting shape. Shorten every part for a 6 to 15 second clip, and keep the order.

| Beat | Time | On screen |
| --- | --- | --- |
| Hook | 0 to 3s | The problem or the result in words, readable in the first frame |
| Name | 3 to 6s | The product's name and what it does, in under eight words |
| Product | 6 to 14s | The real screen doing the one thing, cursor and all |
| Proof | 14 to 17s | One real number or outcome, with its source in the storyboard |
| Close | 17 to 20s | One headline, one address or action. Nothing else |

Motion that explains, with timings at 30 frames a second:

- Words hold for 1 to 1.5 seconds after they finish arriving. If you cannot read a line aloud in its hold, cut words, not time.
- Disclose in steps: text types on, a number counts up to its real value, cards fill in order. Things arrive in the order the viewer should read them.
- The cursor is an actor. It travels to the control and presses before the change happens. A screen that changes with no cause reads as a slideshow.
- Camera moves (a push into a region of the capture, a pan between two) take 250 to 450ms and settle in 300 to 500ms, with a strong ease-out so the frame is readable as soon as it lands. One move per beat.
- Out and in go together. The outgoing beat leaves as the next arrives, 3 to 6 frames apart. No fade to an empty frame between beats.
- Stagger a group by 100 to 200ms in total, not per item.
- Sentence case, no added letter-spacing, no glow, mesh gradient or blur behind text.

## Look at it

A contact sheet shows the whole film at once:

```sh
ffmpeg -loglevel error -i launch/media/demo.mp4 -vf "fps=1,scale=480:-1,tile=4x2" -frames:v 1 launch/media/sheet.png
```

Read every beat: is the one thing to read legible at 480 wide? Does each beat hold long enough to read it aloud? `film.mjs` notes holds over 2 seconds, which are right for a beat with words and wrong between beats.

## Read it as four critics

After the gate passes, read the contact sheet and the film four times, once for each question, and write one merged list of fixes. Apply it and render again.

1. **Layout**: does each beat have one focal point, a consistent margin and nothing cropped at this aspect ratio?
2. **Readability**: is every line legible at feed size, on screen long enough, and high enough in contrast with the sound off?
3. **Pacing**: does the product appear within 3 seconds, does any beat drag or cut early, does anything move without a reason?
4. **Brand and truth**: the product's faces and colours, real captures, and no label, feature or number that the storyboard cannot source.

## Changelog clip from a pull request

For "make a clip of what shipped":

1. Read the PR: title, description, diff and linked issue. Find the one change a user would notice. A refactor has no clip.
2. Capture before and after with `shoot.mjs` at the same size and state: before from the base revision or production, after from the preview or the merged deploy.
3. Three beats: what changed in the user's words, before and after (side by side or as a wipe), where to try it.
4. Every claim in the clip traces to the PR or a real measurement.

## Sound

Silent by default; feeds autoplay muted. If speech matters, burn the captions into the composition as text. Use `--audio` only for a track you have rights to, and normalise it first: `ffmpeg -i in.wav -af loudnorm=I=-16:TP=-1.5 out.m4a`.

## Heavier jobs

Long films, many scenes or a team review loop may outgrow one HTML file. [HyperFrames](https://hyperframes.heygen.com) (HeyGen, Apache-2.0) is a full framework for the same model, with a CLI, a linter and its own agent skills. It installs third-party code, so ask the user before adding it to a project. A project that already uses [Remotion](https://www.remotion.dev) builds the film there: the storyboard, beat budget, real captures and four readings above apply unchanged, with `npx remotion still` per beat for the contact sheet and one composition per aspect ratio. [snapcn](https://snapcn.dev/) (Shadcn Labs, MIT) is a registry of Remotion scenes installed as source with the shadcn CLI; fill its components' props from the storyboard and keep the claims rule. Remotion has its own licence terms for companies, so check them before adding it.
