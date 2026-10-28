# Film: demo and changelog clips as code

A clip built as an HTML page on a timeline can be reviewed, diffed and re-rendered. A fix is an edit, not a re-shoot. `film.mjs` pauses the page, seeks every animation to each frame time, captures it and encodes with ffmpeg. The approach follows LangChain's [Content Studio](https://github.com/langchain-ai/design-agent) and [HyperFrames](https://hyperframes.heygen.com); `film.mjs` is a dependency-free take on the same idea.

## The order of work

1. **Storyboard.** Write it in `launch/media/STORYBOARD.md`, one line per beat. Give each: its time, what is on screen, the one thing the viewer should read, and the source (a real screenshot, a real number with its query). 6 to 15 seconds is 3 to 5 beats. Cut any beat that has nothing to read.
2. **Material.** Capture real screens with `shoot.mjs` at the size they will appear, at `--scale 2`. No mock dashboards, no invented numbers.
3. **Animatic.** Build the composition with every beat in place and almost no motion. Render it, and look at a contact sheet (below) before adding motion. Most problems are layout and copy, and they are cheaper to fix here.
4. **Motion.** Add only motion that explains: a cursor that travels to the button, a value that changes, a panel that opens. Ease out, 200 to 600ms per move, one thing moving at a time.
5. **Render and gate.** `film.mjs` must exit 0. Then watch it once at full size and once at feed size, and score it with `web-design`'s review rubric if it is installed.

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

## Look at it

A contact sheet shows the whole film at once:

```sh
ffmpeg -loglevel error -i launch/media/demo.mp4 -vf "fps=1,scale=480:-1,tile=4x2" -frames:v 1 launch/media/sheet.png
```

Read every beat: is the one thing to read legible at 480 wide? Does each beat hold long enough to read it aloud? `film.mjs` notes holds over 2 seconds, which are right for a beat with words and wrong between beats.

## Changelog clip from a pull request

For "make a clip of what shipped":

1. Read the PR: title, description, diff and linked issue. Find the one change a user would notice. A refactor has no clip.
2. Capture before and after with `shoot.mjs` at the same size and state: before from the base revision or production, after from the preview or the merged deploy.
3. Three beats: what changed in the user's words, before and after (side by side or as a wipe), where to try it.
4. Every claim in the clip traces to the PR or a real measurement.

## Sound

Silent by default; feeds autoplay muted. If speech matters, burn the captions into the composition as text. Use `--audio` only for a track you have rights to, and normalise it first: `ffmpeg -i in.wav -af loudnorm=I=-16:TP=-1.5 out.m4a`.

## Heavier jobs

Long films, many scenes or a team review loop may outgrow one HTML file. [HyperFrames](https://hyperframes.heygen.com) (HeyGen, Apache-2.0) is a full framework for the same model, with a CLI, a linter and its own agent skills. It installs third-party code, so ask the user before adding it to a project.
