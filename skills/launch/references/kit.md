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

- Author in HTML or SVG at 1200x630 with the product's fonts and colours; render with `node <skill-dir>/scripts/shoot.mjs launch/card/card.html --widths 1200 --height 630 --themes light --scale 1 --out launch/card`. Rename the output to `og.png`.
- One message: the product name, what it does in under eight words, and either the product itself (a real screenshot crop) or one strong graphic. No paragraphs.
- Keep important content inside the central ~1000x500; platforms crop edges.
- Test it on a dark and a light feed background; a white card with no border disappears on a white feed.
- Under 1 MB. Change the filename or add `?v=` when it changes; platforms cache cards for days.

## Screenshots

- Real product, real or realistic data, no lorem ipsum, no fake revenue charts.
- Capture at the size people will see: 390 wide for mobile shots, 1440 for desktop, at 2x.
- Hide personal data, tokens, real customer names.
- Crop to the point; the first shot shows the core action, not the login page.

## Demo clip

- 6 to 15 seconds, one action from start to result. Start on the meaningful frame, not a blank page.
- Record at a fixed viewport (1920x1080 or 1080x1920 for vertical) with reduced motion off and a steady pace; avoid cursor wandering.
- Deterministic: same data and same timing each take, so you can re-record after a fix.
- Check the export: duration, dimensions, no black first frame, file size within each platform's limit.

## Tracker

```csv
priority,where,url,audience,format,rules,status,posted_url,date,notes
1,Show HN,https://news.ycombinator.com/submit,developers,title+url+first comment,no marketing tone,drafted,,,
2,r/selfhosted,https://reddit.com/r/selfhosted,self-hosters,text post,read sidebar: 1 in 10 self-promo,drafted,,,
3,Product directory X,https://…,startups,form,needs 1200x630 + logo,todo,,,
```

Status values: `todo`, `drafted`, `approved`, `posted`, `live`, `rejected`. Record the live URL so you can check placement and referral traffic later.
