# Motion

Read this before adding or fixing animation. Motion earns its place by explaining a change: where something came from, what caused it, what is now true. Everything else is decoration, and generated UI has too much of it.

### 1. Write the contract

For each animated thing, one line per field:

- **Purpose**: what the user understands because it moves.
- **Trigger**: input, state change, viewport entry, or a deliberate sequence.
- **From / to**: the resting states. The end state must be complete on its own.
- **Interruption**: what happens on a second click mid-animation: reverse, retarget or finish.
- **Reduced motion**: what shows instead. Always the final state, never an invisible or half-drawn element.

### 2. Use a small timing system

Use the project's motion tokens if they exist. If not, start from these and write them into DESIGN.md:

| Use | Duration | Ease |
| --- | --- | --- |
| Press / toggle feedback | 80–120ms | ease-out |
| Selection indicator, tab underline | 180–240ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Small content shift (6–8px) | 160–200ms | same |
| Panel, sheet, popover enter | 220–300ms | same; exit 20–30% faster |
| Illustration assembly, explainer beat | 400–700ms per beat | same, or linear for continuous travel |

One signature ease for the product. No bounce or overshoot on business UI unless the brand is deliberately playful. Never delay the actual action (navigation, submit) until an animation finishes.

### 3. Build it so it cannot get stuck

- Application state is the source of truth; animation follows it. Keep "open/closed" separate from "entering/exiting".
- Rapid input produces one coherent outcome: no stacked timelines, no element left half-visible and still clickable.
- Cancel frames, timers and observers on unmount and navigation. Do not rely on `animationend`/`transitionend` for essential state; cancelled and reduced-motion paths never fire them.
- Animate `transform` and `opacity`. Measure before claiming smoothness.
- Re-key only the element whose meaning changed. Re-mounting a whole SVG replays its entrance on every click.
- On SVG groups that already have a `transform` attribute, animate CSS `translate`/`scale` properties so the authored transform survives.
- Swapping captions or panels must not move the controls: stack them in one grid cell (see [stable controls](#stable-controls-while-content-swaps) below).
- Ambient loops pause offscreen (`IntersectionObserver`) and when the tab is hidden (`visibilitychange`). At most one ambient effect per screen.
- Respect `prefers-reduced-motion` in CSS and in any JS or canvas timeline.

### 4. Watch it play

Stills cannot prove motion. Capture a filmstrip and look at the frames:

```sh
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/ --widths 390 --themes light --frames 12 --every 50   # from load
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/ --widths 390 --click '[data-tab=pricing]' --frames 10 --every 40   # from the click; filenames carry real ms offsets
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/ --widths 390,1440          # reduced motion: final states
```

Then in a real browser: trigger once; trigger rapidly; reverse mid-way; navigate away mid-animation; use keyboard and touch; enlarge text; switch to reduced motion. Fix flicker, jumps, clipped frames and stranded states, then re-check that case.

### 5. Deliver

Report the contract, the tokens used, what you watched (filmstrip paths, cases exercised) and anything measured with its method. For an exported video, deliver the file and check duration, dimensions, crop and audio sync; a browser preview is not an export.

### Refuse

- Fade-up on every section. Pick one authored moment per page.
- Hover zoom on cards; pulsing dots without live data; marquees; parallax for its own sake.
- Fake progress that is not tied to real progress.
- Long staggers that make an ordinary list feel slow.

## Lifecycle details

### Failure cases to design for

| Situation | Required behaviour |
| --- | --- |
| Second input mid-transition | Retarget or reverse from the current visual position; latest desired state wins. |
| Unmount or navigation | Frames, timers, listeners, observers and renderer resources released. |
| Resize or content change | Geometry recomputed; unrelated motion not restarted. |
| Reduced motion | Final state shown immediately; focus and content intact; no reliance on end events. |
| Hidden tab or offscreen | Continuous work paused; resumes without a jump. |
| Async failure | Usable state restored with the error; no decorative success left on screen. |

### Stable controls while content swaps

```css
.captions { display: grid; }
.caption { grid-area: 1 / 1; visibility: hidden; }
.caption[data-active="true"] { visibility: visible; }
```

All captions contribute height; only the active one shows. Inactive ones are hidden from assistive technology and out of the tab order. Verify by clicking through every option at the narrowest width with enlarged text: the controls must not move (`getBoundingClientRect()` on the controls before and after each change).

### Measured indicators

Sliding tab underlines and selection pills read their target's `offsetLeft/Top/Width/Height` and recompute on resize and when the tab row wraps. Animate `translate` and `width`/`scale`, not `left`.

### Reduced motion wiring

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

This catches CSS only. JS and canvas timelines check `matchMedia("(prefers-reduced-motion: reduce)")` and jump to the end state. Keep immediate feedback (colour, focus) even with motion reduced.

### Scroll-linked vs scroll-triggered

Scroll-linked (progress maps to scroll position) must behave when scrolling backwards and when the page restores mid-way. Scroll-triggered entrances run once and must leave the content visible if JS fails or the observer never fires: default CSS shows the final state; the animation is an enhancement.

### Performance

Animate `transform` and `opacity` by default. Large filters, blurs, shadows and canvas at device pixel ratio cost real frames on phones. When something hitches, record a performance trace in the browser before rewriting; report frame rates only when measured, with device and conditions.

### Verification matrix

1. One trigger: start, middle, end (filmstrip).
2. Rapid triggers, reverse, cancel, navigate away.
3. Keyboard and touch.
4. Narrow width with long content and enlarged text.
5. Reduced motion.
6. Hidden and offscreen, for ambient loops.
7. Console clean throughout.

Repeat the specific case after each fix.
