# Craft floor

The minimum for anything that ships. Check these while building, then once more on the screenshots.

## Type

- Body measure 60 to 75 characters; long-form pages cap the column, they do not stretch to the viewport.
- Line height at least 1.4 for body, 1.05 to 1.2 for large display.
- Negative tracking only on large display text, never tighter than -0.04em. Small caps and labels get slight positive tracking.
- Headings and short UI text use `text-wrap: balance`; paragraphs use `text-wrap: pretty`. Apply as low-specificity defaults (`:where(h1,h2,h3,h4) { text-wrap: balance }`) so components can opt out. Long-form reading pages keep the full measure.
- Never leave a single word on the last line of a heading or button. Fix with balance, a shorter label or a non-breaking space between the last two words.
- No middle-dot strings ("A · B · C") in running text: they strand at line ends. Use separate elements with gaps.
- Tabular numerals (`font-variant-numeric: tabular-nums`) for money, times, counts and any column of numbers.
- Display text no larger than it needs to be: a 120px headline is a layout, not emphasis.

## Colour and contrast

- Text contrast 4.5:1 minimum, 3:1 for large text and UI boundaries, in both themes. Compute it from the tokens; do not eyeball dark mode.
- Neutrals carry a slight tint of the brand (warm or cool); pure grey on colour looks dead.
- Secondary text on a coloured surface is a tint of that surface's ink, not generic grey.
- One accent with a defined job. If everything is accented, nothing is.
- Theme the browser surfaces too: `::selection`, caret, focus ring, scrollbars, `color-scheme`, the `theme-color` meta.

## Space and layout

- More space above a heading than below it, so it belongs to what follows.
- Gaps inside a group smaller than gaps between groups. Accidental near-equal spacing reads as a mistake.
- Grid children get `min-width: 0` (or `minmax(0, 1fr)`) so long content cannot push the grid wider than its frame.
- Reserve space for content that swaps (captions, tabs, validation): stack the variants in one grid cell (`grid-area: 1 / 1`) and hide the inactive ones, so controls never jump.
- A child's z-index cannot escape a parent stacking context; fix the context, not the number.
- Repeated SVGs with `<defs>` need unique ids per instance (e.g. React `useId()`).

## Interaction

- Every interactive element has a visible focus style, a hover style on pointer devices, and a pressed state.
- Tap targets 44 by 44px on touch layouts, including icon buttons and close buttons.
- Hover styles sit inside `@media (hover: hover) and (pointer: fine)`; touch gets `:active` instead.
- Buttons say what happens ("Send invoice"), links say where they go. No "Click here", no bare "Submit" when there is a better verb.
- Disabled controls explain why when it is not obvious.
- Loading shows what is pending without implying success; skeletons match the real layout to avoid shift.

## Motion

- One signature ease and two or three durations, from tokens. Ease-out for anything entering or leaving, never `ease-in`; UI motion under 300ms. No bounce or overshoot unless the brand is playful on purpose.
- Pressable things scale to about 0.97 on `:active`; popovers grow from their trigger; nothing enters from `scale(0)`.
- No animation on keyboard-driven or high-frequency actions.
- Only `transform` and `opacity` animate by default; never `transition: all`.
- Respect `prefers-reduced-motion`: movement goes, the end state is complete, never an invisible or half-animated element.

## Refuse unless the brief asks

- Cards inside cards. Borders and shadows on every container.
- Same-size icon + heading + paragraph tiles in a row of three.
- Decorative glass, glows, blurred blobs and gradient meshes behind content.
- Emoji as icons. Monospace as a costume for "technical".
- Fake live indicators, invented metrics, placeholder testimonials.
- A modal where an inline expansion or a page would do.
