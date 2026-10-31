# Launch kit

## Folder

```
launch/
  README.md          what is launching, date, links, owner
  card/
    card.html        share card source (real fonts and tokens)
    og.png           1200x630 render
    og-square.png    1200x1200 for platforms that crop square (optional)
  media/
    01-home-390.png  real screenshots, named by order and width
    02-flow-1440.png
    demo.mp4         6-15s, no audio required, captions burned in if speech matters
    demo-poster.png  first meaningful frame
  copy.md            every piece of copy, by channel
  tracker.csv        where it goes and what happened
```

## Share card

- Author in HTML or SVG at 1200x630 with the product's fonts and colours; render and gate with `node <skill-dir>/scripts/render-gate.mjs launch/card/card.html --size 1200x630 --size 1200x1200 --design DESIGN.md --expect-file launch/card/copy.txt --out launch/card`. Rename the outputs to `og.png` and `og-square.png`. Each size is a fresh layout; recompose the square, never scale it.
- One message: the product name, what it does in under eight words, and either the product itself (a real screenshot crop) or one strong graphic. No paragraphs.
- Keep important content inside the central ~1000x500; platforms crop edges.
- Test it on a dark and a light feed background; a white card with no border disappears on a white feed.
- Under 1 MB. Change the filename or add `?v=` when it changes; platforms cache cards for days.

## Screenshots

- Real product. Capture at the size people will see: 390 wide for mobile shots, 1440 for desktop, at 2x.
- Hide personal data, tokens, real customer names.
- Crop to the point; the first shot shows the core action, not the login page.

## Framing a real screen

A bento, a device, a crop or a caption may surround the product. The product region is an `<img>` of a capture: from `shoot.mjs`, or a file someone took of the live product. Drawing that screen in HTML or CSS makes a claim the product may not back, including when the drawing looks cleaner than the capture.

Frame the capture on purpose. A whole window shrunk into a centred card, with even margins and every cell filled, reads as a pasted screenshot. Crop to the action, let the capture run off an edge when the story is inside it, and keep one gutter. [Stageshow](https://benji.org/stageshow) names that pasted-window failure "boxed", and the opposite failure "too much": real words in every cell. Both apply to a real capture. Placeholder lines and a redrawn inbox do not. Those belong to a faux demo, and a launch still is not one.

Every number outside the capture is copied from the agreed file (`copy.md`, NOTES, the brief). If it is not in that file, it is not on the card. A note that asks for a rounder number is refused in the report, with the file cited.

## Demo clip

- 6 to 15 seconds, one action from start to result. Start on the meaningful frame, not a blank page.
- Build it as an HTML composition and render it with `film.mjs` ([film](film.md)): real screenshots from `shoot.mjs` as the material, captions and motion in CSS. 1920x1080, or 1080x1920 for vertical.
- Deterministic: the same composition renders the same film every time, so a fix is an edit and a re-render. `film.mjs` fails a clip that does not.
- `film.mjs` checks size, duration, a black or flat opening frame, a film where nothing moves, and failed fonts or requests. Then check the file size against each platform's limit.
- Record the live product instead only when the interaction itself is the point; keep the viewport fixed, the pace steady and the cursor purposeful.

## Tracker

```csv
priority,where,url,audience,format,rules,status,posted_url,date,notes
1,Show HN,https://news.ycombinator.com/submit,developers,title+url+first comment,no marketing tone,drafted,,,
2,r/selfhosted,https://reddit.com/r/selfhosted,self-hosters,text post,read sidebar: 1 in 10 self-promo,drafted,,,
3,Product directory X,https://…,startups,form,needs 1200x630 + logo,todo,,,
```

Status values: `todo`, `drafted`, `approved`, `posted`, `live`, `rejected`. Record the live URL so you can check placement and referral traffic later.
