# Review rubric

<!-- slop-scan: ignore-file (this file quotes the patterns it teaches) -->

How to judge a page, a still, a set of cards, a slide or a film frame before it ships. Adapted from the review rubric in LangChain's [Content Studio](https://github.com/langchain-ai/design-agent) (Apache-2.0).

It is a reading aid for judgment, not a scorecard to optimise. A piece that hits every anchor and still reads like generic marketing scores low on Idea.

## Three gates before any score

1. **Accuracy.** Every claim, number, name and quote traces to a source: the brief, the product, a dated query. An invented feature or figure fails the piece however well it is made.
2. **Deterministic gates.** `render-gate.mjs` with `--design` and `--expect` for anything with brand tokens or supplied copy; `shoot.mjs` for pages; `film.mjs` for clips (in `launch`); `slop-scan.mjs` for copy (in `deslop`). Exit 1 is a finding to fix. Exit 2 means the gate did not run, which is never a pass.
3. **The ask.** When someone asked for a specific change, check that change first. It is the bar.

## Make your own evidence

Never score from the maker's screenshots or self-assessment. Render your own views: the full frame at review size, the whole set on one sheet, the smallest view it will get (a 390px phone, a feed thumbnail), zoomed crops of type and fine geometry, and for a restyle the before next to the after.

## Six areas

Score each 1 to 5; 4 and 2 sit between the anchors. Cite the crop, size or number behind every score.

| Area | 5 | 3 | 1 |
| --- | --- | --- | --- |
| **Idea** | One sentence a stranger could repeat; shows the real thing, or bold type carries it | A real message, but the visual idea is generic or decoration | No message; shapes, glows or a node field standing in for a concept |
| **Hierarchy** | One focal element read first, at most two demands on attention, support stepped down hard | Readable, but two elements compete or support is too loud | Flat: everything at one weight, or labels where the headline should be |
| **Copy** | Fewest words; each fact once; supplied copy exact; voice from DESIGN.md | An unrequested sub-line, caption or footer; a word too many | Invented copy, banned hype, or supplied copy changed |
| **Craft** | Type sized for the delivered view, optical spacing, clean geometry, nothing clipped, no stranded words | Correct but stock: default spacing, tight padding, one awkward wrap | Clipped or garbled text, broken connectors, misaligned grid |
| **Brand** | Tokens only, one accent with meaning, the real logo at its size with clear space | A slip: a second accent, an off-scale radius, the logo too small | An invented colour, a redrawn or recoloured logo, off-brand faces |
| **Fit for place** | Right sizes, each recomposed; legible at the smallest view; clear of platform chrome; the set reads as one family | One size scaled rather than recomposed, or small text lost on a phone | Wrong size, cropped subject, text under platform UI |

**Verdict:**
- **ship**: every area scores 4 or more.
- **fix, then ship**: no area below 3, and every must-fix note is concrete.
- **rework**: Idea scores 2 or less, or any area scores 1.

## Notes

At most twelve, ranked by impact. Each gives:
- where: the file and region, or the timestamp;
- what is wrong;
- why it matters to the viewer;
- the concrete fix.

Mark each MUST-FIX or NICE-TO-HAVE. Then name the strengths the next pass must protect, so a fix does not break what works.

## Failure patterns

| Pattern | Looks like | Fix |
| --- | --- | --- |
| Wallpaper | A headline over a field of nodes, dots or glows | Show the real thing, or let bold type carry it |
| Over-full frame | Three or more things to read separately | Split into two frames, or cut the weakest |
| Flat hierarchy | Headline, labels and support at similar sizes | One element big at full contrast; the rest step down hard |
| Extra words | A sub-line, caption, URL or eyebrow nobody asked for | Delete it; put the explanation in the post or reply |
| Scaled, not recomposed | The portrait version is the landscape layout shrunk | Recompose each size; spend extra height on content |
| Template sameness | Six slides or cards that are one layout recoloured | Vary the spatial idea; keep the system |
| Lost on a phone | Proof text that is 7px on a 360px screen | Fewer words, larger type, a narrower canvas |
| Unofficial logo | A typeset stand-in or recoloured mark | The real file, at its minimum size or larger |
| Generic software look | Mono on prose, all-caps mono labels, everything centred, floating columns, glows | Mono only for literal values, labels in the text face, one alignment, real containers, no effects |
| Faked weight | A light face stroked or outlined to look heavier | A real weight of the face, or more size |
| Silent fallback | The brand face never loaded, so the render is in Times or Arial | `render-gate.mjs` reports it; fix the font load, not the screenshot |
| Self-review | "Looks good" from whoever made it | An independent look with fresh evidence |

## Writing the review

Write the verdict, the six scores with their evidence, the ranked notes and the strengths to protect. Put it in the PR body or `review/REVIEW.md` in the project. A reviewer judges and does not fix; the maker fixes and asks again.
