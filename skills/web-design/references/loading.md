# Loading without a jump

A settled screenshot hides the jump. The skeleton paints, then the real card arrives at a different height and everything under it moves. People on a slow connection see the skeleton more than the page.

The shape comes from measuring the component, which is what [Skullet](https://skullet.lochie.me/) does by wrapping a React component and drawing bones from its boxes. This skill does not ship that library. It checks the geometry, in whatever the project is built with.

A webfont that swaps in and reflows the same line is the same bug. [Emil Kowalski](https://emilkowal.ski/ui/agents-with-taste) states the fix as a fallback whose x-height and weight match the brand face, so the first paint and the branded paint share line boxes.

## Build the loaded screen first

Use real content, including the [worst case](worst-case-data.md): the longest name, a count of 1 and of 1,284, an empty list. The skeleton is that layout. Text becomes a bone of the same width (or of the longest value, when the length is not known yet). An image becomes a bone of the same aspect ratio. Buttons, rows and the card keep their size. A separate stack of grey bars, shorter than the loaded screen, is the bug.

Give every region that must stay put the same `id` or `data-region` in both states: the card, the title, the primary button, each row slot. A spinner that exists only while loading does not need an id. Regions that exist in both states do.

## Compare

```sh
node <skill-dir>/scripts/shoot.mjs loading.html --shift loaded.html --widths 390 --themes light
```

`<skill-dir>` is the `web-design` skill folder. Run it from the project root.

Exit 1 means a shared region moved by more than 1px, or the document scroll height changed by more than 1px. Fix the bone. Keep the loaded content at its real size. Exit 0 is the pair matching. Exit 2 means no region shared an `id` or `data-region` and the scroll height did not change, so the jump was not measured. Exit 2 is not a pass. Add the ids and run it again. Eighty regions is the cap.

Scroll height stays at the viewport when both states fit on screen, so a quiet scroll line with no region lines is not a pass. The region lines are the check.

Do not gate on the layout-shift entries in the performance timeline. Headless Chrome can report none for a jump that has already painted, including a skeleton that was never the loaded card, and a score of 0 then passes the page. This compare loads each state on its own and measures boxes.

## Fonts

When the brand face is a webfont, give the fallback `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` (or a face you have measured) so text does not move when the brand face arrives. `render-gate.mjs` still fails a face that never loads. Matching metrics covers the other failure: the face loads, and the page moves.

## Done

Both states captured, no region and no document scroll moved by more than 1px at 390px, bones replaced content inside the real layout, and the fallback face cannot reflow the first paint. If you could not reach the real loading state, say so.
