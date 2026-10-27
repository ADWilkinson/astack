# Motion

Read this before adding, fixing or reviewing animation. Motion earns its place by explaining a change: where something came from, what caused it, what is now true. Everything else is decoration, and generated UI has too much of it. Agents also get the small choices wrong (an `ease-in` dropdown, a popover growing from its centre, a toast that restarts when another arrives), and those compound into an interface that feels slightly off.

The decision rules, values and performance diagnosis here draw on [Emil Kowalski's skills](https://github.com/emilkowalski/skills) (MIT).

### 1. Decide whether it animates

How often will someone see it?

| Frequency | Decision |
| --- | --- |
| 100+ times a day (keyboard shortcuts, command palette, list navigation by key) | No animation. |
| Tens of times a day (hovers, tab switches, row selection) | Remove or cut to a fast state change. |
| Occasionally (modals, drawers, toasts, popovers) | Standard animation. |
| Rarely or once (onboarding, first success, celebrations) | Room for delight. |

Never animate a keyboard-initiated action. Then name the purpose; valid ones are spatial consistency (a toast leaves the way it came, so swiping it away makes sense), state indication, explanation, feedback on press, and softening a change that would otherwise feel broken. "It looks nice" on something seen often is not a purpose.

### 2. Write the contract

For each animated thing, one line per field:

- **Purpose**: what the user understands because it moves.
- **Trigger**: input, state change, viewport entry, or a deliberate sequence.
- **From / to**: the resting states. The end state must be complete on its own.
- **Interruption**: what happens on a second click mid-animation: reverse, retarget or finish.
- **Reduced motion**: what shows instead (see [reduced motion](#reduced-motion-wiring)).

### 3. Pick the ease and the duration

Ease by what is happening:

- Entering or leaving: **ease-out**. It starts fast, so the response feels immediate.
- Moving or morphing while on screen: **ease-in-out**.
- Hover and colour changes: **ease**.
- Constant motion (progress, marquee): **linear**.
- Anything else: ease-out.

Never `ease-in` on UI. It spends its first frames barely moving, which is exactly when the user is watching; an ease-in dropdown at 200ms feels slower than an ease-out one at 200ms. The built-in CSS curves are weak. Use the project's tokens, or start from these and write them into DESIGN.md:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* enter, exit, press */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* sheets and drawers */
```

| Use | Duration |
| --- | --- |
| Press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects, tab indicators | 150–250ms |
| Modals, drawers, sheets | 200–500ms (larger travel takes longer) |
| Illustration and explainer beats | 400–700ms per beat |

UI motion stays under 300ms unless it travels far. Exits run faster than enters. Speed reads as performance: a 180ms select feels more responsive than a 400ms one, and a quick spinner makes the same wait feel shorter. One signature ease per product; bounce and overshoot only where the brand is playful on purpose, or for drag-to-dismiss.

Match the motion to the component's character: a dashboard is crisp and fast; a toast library can be a touch slower and softer if everything around it agrees.

### 4. Make it physical

- **Press**: every pressable element gets `:active { transform: scale(0.97) }` with a 100–160ms ease-out transition (0.95–0.98 range). Feedback on press, not on release.
- **Never from nothing**: enter from `scale(0.95)` plus `opacity: 0`, never `scale(0)`.
- **Origin-aware**: popovers, menus and tooltips scale from their trigger (`transform-origin: var(--transform-origin)` in Base UI and Radix, or computed from the trigger side). Modals stay centred.
- **Tooltips**: delay the first one; once one is open, neighbours open instantly with no animation.
- **Percent translates**: `translateY(100%)` moves an element by its own height, which is how sheets and toasts hide without knowing their size.
- **Asymmetric timing**: slow where the user is deciding (hold-to-confirm fills over 1–2s linear), fast where the system answers (release snaps back in 200ms ease-out).
- **Stagger**: 30–80ms between items, for entrances only, and never blocking input.
- **Crossfades that show two states**: add `filter: blur(2px)` for the duration of the swap so the eye reads one transformation. Keep blur small; it is expensive.
- **Hover**: gate hover motion behind `@media (hover: hover) and (pointer: fine)`, or touch screens keep it stuck after a tap.

### 5. Build it so it cannot get stuck

- Application state is the source of truth; animation follows it. Keep "open/closed" separate from "entering/exiting".
- Anything that can fire rapidly (toasts arriving, toggles) uses CSS **transitions**, which retarget from where they are; keyframes restart from zero. Springs keep velocity when interrupted, which makes them right for gestures.
- Enter without a mount flag using `@starting-style`:

  ```css
  .toast { transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);
    @starting-style { opacity: 0; transform: translateY(100%); } }
  ```

- Rapid input produces one coherent outcome: no stacked timelines, no element left half-visible and still clickable.
- Cancel frames, timers and observers on unmount and navigation. Do not rely on `animationend`/`transitionend` for essential state; cancelled and reduced-motion paths never fire them.
- Re-key only the element whose meaning changed. Re-mounting a whole SVG replays its entrance on every click.
- On SVG groups that already have a `transform` attribute, animate CSS `translate`/`scale` properties so the authored transform survives.
- Swapping captions or panels must not move the controls: stack them in one grid cell (see [stable controls](#stable-controls-while-content-swaps)).
- Ambient loops pause offscreen (`IntersectionObserver`) and when the tab is hidden (`visibilitychange`). At most one ambient effect per screen.
- Never delay the actual action (navigation, submit) until an animation finishes.

### 6. Gestures

- Dismiss on velocity as well as distance: `Math.abs(distance) / elapsedMs > 0.11` is a flick, and a flick is enough.
- Past a boundary, apply damping (the further the drag, the less it moves) instead of a hard stop.
- Capture the pointer once a drag starts (`setPointerCapture`), and ignore extra touch points until it ends.
- Declare which axes the gesture owns with `touch-action` (`pan-y` on a horizontal carousel, `none` only on a surface that handles every direction).
- Decorative pointer-following goes through a spring (Motion's `useSpring`, or `{ type: "spring", duration: 0.5, bounce: 0.2 }`), never raw pointer coordinates. Functional readouts follow the pointer directly.

### 7. Keep every frame on time

The budget is 16.7ms a frame at 60Hz and 8ms at 120Hz, which most phones now are. Design against the smaller number and a mid-range phone, not the laptop.

| Symptom | Cause and fix |
| --- | --- |
| Stutters | Animating `width`, `height`, `top`, `left`, `margin` or `padding`. Use `transform` (`scale`, `translate`) and `opacity`. |
| Choppy shadow | `box-shadow` repaints every frame. Animate a `filter: drop-shadow()` or the opacity of a pseudo-element that holds the shadow. |
| Unexpected things animate | `transition: all`. List the exact properties. |
| Janks only during navigation or loading | JS-driven animation on a busy main thread. Move it to CSS or WAAPI (`element.animate`), which can run off the main thread. |
| Motion's `x`/`y`/`scale` drop frames under load | Shorthands run through CSS variables on the main thread. Animate a `transform` string instead. |
| Hand-rolled animation drops frames in React | `setState` per frame. Write to `ref.current.style` or a motion value. |
| Drag slows as the list grows | A CSS variable on the parent drives children's transforms, so every descendant recalculates. Set `transform` on the element directly. |
| Blur transition lags, worst in Safari | Keep animated blur at 2–5px, never above 20px. |
| Element shifts by a pixel at start or end | Only now add `will-change: transform`, on that element alone. |

Name the cause before changing code, and say which findings came from reading code and which from a recording. A performance trace in the browser beats rewriting by feel; report frame rates only when measured, with the device.

### 8. Watch it play

Stills cannot prove motion. Capture a filmstrip and look at the frames:

```sh
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/ --widths 390 --themes light --frames 12 --every 50   # from load
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/ --widths 390 --click '[data-tab=pricing]' --frames 10 --every 40   # from the click; filenames carry real ms offsets
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/ --widths 390,1440          # reduced motion: final states
```

In the frames, check that colours cross cleanly rather than showing two states, the ease does not stop abruptly, the origin is right, and coordinated properties stay in step. Then in a real browser: trigger once; trigger rapidly; reverse mid-way; navigate away mid-animation; use keyboard and touch; enlarge text; switch to reduced motion. Slow it down 2–5x (DevTools Animations panel) when the feel is in doubt. Gestures need a real phone. Fix flicker, jumps, clipped frames and stranded states, then re-check that case.

### 9. Report

Report the contract, the tokens used, what you watched (filmstrip paths, cases exercised) and anything measured with its method. When reviewing someone's motion, give findings as one table:

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms var(--ease-out)` | Name the properties; 300ms is slow for UI |
| Popover `transform-origin: center` | `transform-origin: var(--transform-origin)` | It should grow from its trigger |

For an exported video, deliver the file and check duration, dimensions, crop and audio sync; a browser preview is not an export.

### Refuse

- Fade-up on every section. Pick one authored moment per page.
- Animation on keyboard-driven or high-frequency actions.
- `ease-in` on interface motion; `scale(0)` entrances; `transition: all`.
- Hover zoom on cards; pulsing dots without live data; marquees; parallax for its own sake.
- Fake progress that is not tied to real progress.
- Long staggers that make an ordinary list feel slow.
- `will-change` sprinkled as a fix before the cause is named.

## Lifecycle details

### Failure cases to design for

| Situation | Required behaviour |
| --- | --- |
| Second input mid-transition | Retarget or reverse from the current visual position; latest desired state wins. |
| Unmount or navigation | Frames, timers, listeners, observers and renderer resources released. |
| Resize or content change | Geometry recomputed; unrelated motion not restarted. |
| Reduced motion | Movement removed; the end state shown with focus and content intact; no reliance on end events. |
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

Sliding tab underlines and selection pills read their target's `offsetLeft/Top/Width/Height` and recompute on resize and when the tab row wraps. Animate `translate` and `scale`, not `left` or `width`. For a colour change that has to be exact across the pill, duplicate the tab row styled as active and animate a `clip-path: inset()` over it.

### Reduced motion wiring

Reduced motion means less movement, not a dead interface. Remove travel, scale and parallax; keep short opacity and colour changes that help comprehension, and keep immediate feedback such as focus.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

That blanket rule is the floor for CSS. Components that keep a fade opt back in deliberately. JS and canvas timelines check `matchMedia("(prefers-reduced-motion: reduce)")` and jump to the end state (or a still frame that reads whole).

### Scroll-linked vs scroll-triggered

Scroll-linked (progress maps to scroll position) must behave when scrolling backwards and when the page restores mid-way. Scroll-triggered entrances run once and must leave the content visible if JS fails or the observer never fires: default CSS shows the final state; the animation is an enhancement. `clip-path: inset(0 0 100% 0)` to `inset(0)` is a cheap, compositor-friendly reveal.

### Verification matrix

1. One trigger: start, middle, end (filmstrip).
2. Rapid triggers, reverse, cancel, navigate away.
3. Keyboard and touch.
4. Narrow width with long content and enlarged text.
5. Reduced motion.
6. Hidden and offscreen, for ambient loops.
7. Console clean throughout.

Repeat the specific case after each fix.
