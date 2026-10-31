# Feeling native on a phone

Most "it feels janky on mobile" reports are not design problems. They are a grey flash on tap, a hover that will not let go, a page that zooms into an input, or a button hidden under the URL bar. Each is one declaration. None of them reproduces in desktop device emulation, so a layout that passes at 390px in `shoot.mjs` can still feel like a website in someone's hand.

Adapted from [Emil Kowalski's mobile-native skill](https://github.com/emilkowalski/skills) (MIT).

## Baseline

Ship this before the first component of anything people will use on a phone:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">
```

```css
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
}
input, textarea, select { font-size: 16px; }
button, a, [role="button"] { touch-action: manipulation; }
button, [role="button"], .tab, .chip { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
@media (hover: hover) and (pointer: fine) {
  /* every :hover rule lives here */
}
```

Set the `theme-color` values to the colour at the very top of the page (the header), not the brand colour.

## Symptom table

| Symptom | Fix and why |
| --- | --- |
| Hover state stuck after a tap | Gate hover in `@media (hover: hover) and (pointer: fine)`. Touch fakes `:hover` on first tap and keeps it. Give touch its feedback through `:active`. |
| Grey or blue flash on tap | `-webkit-tap-highlight-color: transparent` once on `html`, then make sure every tappable thing has its own `:active` state. |
| Bottom button under the URL bar, or a hero that overflows | `100dvh` for app shells and bottom-pinned UI; `100svh` for heroes, which must not jump while scrolling. Never `100vh`. |
| Page zooms into an input and stays zoomed | Inputs at 16px or larger. Never `maximum-scale=1` or `user-scalable=no`; that disables zoom for everyone. |
| Wrong keyboard | `inputmode="numeric"` for codes, `inputmode="decimal"` for amounts, `type="email"`/`"tel"`, `autocapitalize="none"` on usernames and codes, `enterkeyhint` naming the action. |
| Taps feel slow | `touch-action: manipulation` removes the double-tap wait; style `:active` (or listen to `pointerdown`) so the response lands when the finger does, not when it lifts. |
| Pull-to-refresh or rubber-banding fights the app | `overscroll-behavior: none` on `html, body` for app-like surfaces; `overscroll-behavior: contain` on inner scrollers such as sheets and chat lists. Keep the default on documents. |
| Content stops short of the notch, or sits under the home bar | `viewport-fit=cover` in the viewport meta, then `env(safe-area-inset-*, 0px)` padding on fixed headers, tab bars, toasts and sheets. Without the meta tag the insets are all zero. |
| Long-press selects a button's label, or iOS shows the copy callout | `user-select: none` and `-webkit-touch-callout: none` on controls only. Never on `body`: people copy addresses, order numbers and errors. |
| Swiping a carousel scrolls the page too | `touch-action: pan-y` on a horizontal gesture surface; prefer native `scroll-snap-type: x mandatory` over a hand-rolled carousel. |
| Status bar the wrong colour in one theme | One `theme-color` per colour scheme; update it from JS if the theme toggles by class. |

## What shoot.mjs can see from a desktop

Device emulation still has a mouse, so it will not show a stuck hover, a rubber-band, a notch or the keyboard. It can read the page and the stylesheets, and `shoot.mjs` now reports the defects that follow from that:

| Line | Means |
| --- | --- |
| `input under 16px` | A text field, textarea or select computes below 16px, so iOS Safari will zoom on focus and stay zoomed. A smaller size is allowed only inside `@media (pointer: fine)`. |
| `viewport disables zoom` | `user-scalable=no` or `maximum-scale=1`. Fix the input size. Leave pinch zoom on. |
| `hover not gated` | A `:hover` rule whose media query does not contain `(hover: hover)` or `(any-hover: hover)`. Width breakpoints do not count. Tailwind v4's `hover:` variant is already gated; v3 is not unless `future.hoverOnlyWhenSupported` is set. |
| `control text selectable` | A button or `[role=button]` on a narrow viewport computes `user-select` to something other than `none`. |
| `tap highlight not disabled` | The page has controls and no `html` / `body` / `*` rule sets `-webkit-tap-highlight-color: transparent`. |

Treat each line as a defect unless the brief asked for it. Rubber-banding, safe areas and a hover that stays stuck after a tap still need a phone. Say which fixes you verified from this report and which you did not.

## Rules

- Detect capability with media queries (`hover`, `pointer`, `env()`, `dvh`), never user-agent sniffing or a width breakpoint standing in for "touch".
- Touch and mouse are not exclusive: tablets with trackpads, laptops with touchscreens. Write for both at once.
- Apply each fix where its reason applies. `user-select: none` on a button is right; on a paragraph it is a defect.
- Real hardware decides. Run the dev server on `0.0.0.0`, open it by LAN IP on a phone, and inspect through Safari's Develop menu or `chrome://inspect`. Say which fixes you verified from code and which still need a phone in the hand.
