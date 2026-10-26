---
colors:
  bg: "#fafcf7"          # page, faint grass tint (not cream)
  surface: "#ffffff"     # mobile call bar
  ink: "#17231b"         # text (contrast on bg ~15:1)
  muted: "#4a5a4e"       # secondary text (~7:1 on bg)
  line: "#d3ddcd"        # row dividers
  park: "#24563a"        # brand green: headings, booking block
  grass: "#dcebcd"       # map ground, How it works band
  grass-deep: "#c5dcb1"  # park shapes on the map
  ball: "#dceb4b"        # tennis-ball yellow: primary action, pins, step markers, focus ring
  water: "#a9d2df"       # canal and river on the map
  dark: { bg: "#0f1a14", surface: "#16241c", ink: "#e7efe2", muted: "#a7b6aa", line: "#2b3d31", park: "#1c3a29", grass: "#1b3123", path: "#dceb4b" }
typography:
  display: "ui-rounded (SF Pro Rounded on Apple), then Avenir Next, Nunito, Segoe UI"  # weight 800, headings and prices
  text: "Avenir Next, Avenir, Segoe UI, system-ui"
  numerals: tabular for prices, durations and phone numbers
radius: { control: 12, panel: 20, pill: 999 }
motion: { ease: "cubic-bezier(.2,.8,.2,1)", fast: 160ms }
---

# Pawpath design

## Job
Hackney dog owners checking whether Pawpath walks near them, what it costs, and how to reach Jess. The next action is a text or call to book the free meet.

## Character
- Park world: grass greens, canal blue and tennis-ball yellow. Yellow is the only accent and marks things you can act on or follow (buttons, map pins, the steps).
- The dotted walking route is the motif: the logo, the sketch map of the three parks, and the line joining the three steps.
- Friendly rounded heavy headings, plain-spoken copy, no hype.
- No web fonts: the page is one self-contained file with no external requests.

## Layout
- Mobile first. Phones get a fixed bottom bar with Text Jess / Call (sms: and tel: links); it hides at 720px+ where the header nav shows.
- Prices are rows, not cards, so the three walks compare at a glance.
- Hero is two columns from 960px (copy left, map right).

## Refusals
- No purple gradients, glass, glow blobs, pulse animations, hover-scale, emoji icons or caps eyebrows (the previous version had all of them).
- No invented stats or reviews. The old "500+ happy dogs", "4.9 average rating" and "24/7 support" were removed because they had no source; add them back only with real figures.

## Decisions log
- 2026-10-26: Full redesign from the generic dark/violet template to the park identity above.
