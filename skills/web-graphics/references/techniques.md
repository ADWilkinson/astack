# Techniques

## Isometric

Projection used by `iso.mjs` (2:1, 30 degrees), with `s` px per world unit:

```
screenX = originX + (x - y) * 0.866 * s
screenY = originY + (x + y) * 0.5   * s - z * s
```

- Ground edges slope at ±0.577 (30 degrees). Vertical edges stay exactly vertical. If anything leans, the maths is wrong.
- Visible box faces from the standard view: top, the +y face (left), the +x face (right). Keep one shading convention for the whole set: top lightest, left mid, right darkest.
- Draw back to front: ground, bases, walls, roofs, openings, small objects, routes, focal pin, labels. `iso.mjs` sorts by depth; split boxes that interpenetrate.
- Compose the whole scene legibly at low detail first (blocks only), check it at the smallest display size, then add detail.
- Keep text out of the projection. Labels sit flat on screen, anchored to a projected point.

Workflow:

```sh
node <skill-dir>/scripts/iso.mjs --example > scene.json   # edit items, palette, unit
node <skill-dir>/scripts/iso.mjs scene.json -o scene.svg
node <skill-dir>/scripts/shoot.mjs scene.svg --widths 360 --height 260 --themes light,dark
```

Post-process by hand when needed (add a `<title>`, group ids for animation, swap fills for `currentColor` or CSS variables).

## Flat illustration and icons

- Grid: icons on 24 units with 2-unit padding; illustrations on a multiple of 8.
- One stroke weight across the set; scale the drawing, not the stroke (`vector-effect: non-scaling-stroke` when the SVG resizes).
- Shared corner radius and terminal style (round or square, not both).
- Check every icon at 16px and 20px: silhouette must still read. Below ~24px, use a simplified variant (a head-only mascot, a filled glyph) rather than shrinking the full drawing.
- Optical alignment: a play triangle sits visually centred only when nudged right; check at 2x.

## ASCII art

- Render in a known monospace stack and line height; ASCII breaks when the font falls back. Set `font-variant-ligatures: none`.
- Verify every line has the intended width (`awk '{ print length }' art.txt | sort -u`).
- Use `white-space: pre`, and an overflow plan for narrow screens: scale with `font-size: clamp()` from container width, or swap to a compact version under a breakpoint. Never let it wrap.
- Check glyph coverage in both themes; box-drawing characters differ between fonts.
- For generated ASCII (images to characters), use a fixed ramp (e.g. ` .:-=+*#%@`) and a fixed seed; commit the output, not just the generator.

## Halftone and dot textures

- Generate deterministically: dot size and opacity from a function of position (e.g. sine of normalised distance), not random. Random during render causes hydration mismatches and flicker.
- Define the dot or hatch once in `<defs>` (`<pattern>` or a `<symbol>`), reuse with `<use>`; clip to the shape.
- Tile around 9 units for dots, 5 for hatch, at low contrast. Re-check at the smallest size: texture that is delicate at 440px becomes noise at 200px.
- Never put texture under text that must be read.

## Diagrams

- Flow in one direction (left to right or top to bottom). Arrows start and end on box edges, not centres.
- Real labels in the product's words. Label lines, not just boxes, when the relationship is the point.
- Group with space before borders. Use the accent once, for the thing the diagram is about.

## Social cards and raster exports

- Author the card as HTML or SVG with real fonts and tokens, render to PNG with a script, commit both. A committed PNG with no source rots when the type or brand changes.
- 1200x630 for Open Graph and X `summary_large_image`. Keep important text inside the central ~1000x500; some clients crop.
- Render via `shoot.mjs`: `node <skill-dir>/scripts/shoot.mjs card.html --widths 1200 --height 630 --themes light --scale 1 --out public/og`.
- Content-hash the filename (or bump a query string) when it changes; social platforms cache aggressively.
- Under 1 MB, PNG for flat art, JPEG/WebP for photographic.

## Image generation (when code is the wrong tool)

Use only for photographic, painterly or organic texture. Give the generator the grammar (palette hex values, composition, what to leave out), generate, then inspect at display size. Record the tool and prompt next to the asset. Edit or composite in code where possible. Check the licence of any reference image you supply; a screenshot of someone's illustration is not a licence.
