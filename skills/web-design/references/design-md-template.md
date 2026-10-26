# DESIGN.md template

Copy into the project root as `DESIGN.md`. Fill it from the code, not from aspiration: values must match what ships. Keep it under ~150 lines. Tokens here are normative; if code and this file disagree, fix one of them in the same change.

```md
---
# Tokens. Names must match CSS variables / Tailwind theme keys in the repo.
colors:
  bg: "#F6F8FA"          # page
  surface: "#FFFFFF"     # raised panels
  ink: "#0E1726"         # primary text (contrast on bg: 16.9:1)
  muted: "#4E5A6B"       # secondary text (contrast on bg: 6.6:1)
  line: "#DCE3EA"        # hairlines, dividers
  accent: "#2457D6"      # primary action, links, the one focal mark
  danger: "#B42318"
  dark:                   # dark theme overrides
    bg: "#121413"
    ink: "#ECEBE7"
    muted: "#A3A8A6"
typography:
  display: "Söhne Breit, system-ui"   # headings ≥ 28px only
  text: "Söhne, system-ui"
  mono: "Söhne Mono, ui-monospace"    # code and IDs only
  scale: [12, 14, 16, 18, 22, 28, 36, 48]
  numerals: tabular                    # all money, dates, counts in columns
radius: { control: 8, panel: 12, pill: 999 }
space: [4, 8, 12, 16, 24, 32, 48, 64]
motion: { ease: "cubic-bezier(0.2, 0.8, 0.2, 1)", fast: 160ms, base: 240ms }
---

# <Product> design

## Job
Who uses this, the one thing they come for, the next action we want.

## Character
Three to five observable choices and the reason for each.

## Layout
Grid, max widths, density, how pages recompose on mobile.

## Components
The few that define the product (e.g. plan row, listing card) with do/don't.

## Copy
Voice in three rules, words we never use, number and date formats.

## Refusals
Defaults this product does not use, and why.

## Decisions log
- 2026-01-12: Dropped glass header; blurred over photos made nav unreadable.
```

## How to fill it from an existing codebase

1. Colours: read the Tailwind config / CSS custom properties. Group by role, not hue. Compute contrast for ink and muted on bg and surface (WCAG ratio) and write the number next to each.
2. Type: find the font imports and the sizes actually used (`grep -ohE 'text-(xs|sm|base|lg|xl|[0-9]xl)' -r src | sort | uniq -c`). Collapse near-duplicates into a scale.
3. Components: open the three most-used components and describe their rules in a line each.
4. Refusals: note what the product visibly avoids already; that is usually its character.
5. Mark anything you could not confirm with `(inferred)`.
