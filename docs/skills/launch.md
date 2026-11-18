# launch

## What it does

Gets a product ready to be seen: page audit, share card from source, demo media, channel-specific copy, a submission tracker and a launch-week readout. Demo clips and longer launch films are built as HTML compositions and rendered by script, on a beat budget with the real product visible within three seconds and one composition per aspect ratio.

## When to reach for it

Product Hunt, Show HN, X or directory launches, or before telling the public about anything new.

## It's working if

page-audit.mjs shows no errors on every shared URL, the share card renders at 1200x630, every claim in the copy is sourced, and the tracker lists each destination with status. If the card shows the product, that region is a real capture, and no number appears that the copy file does not contain.

## Common questions

**Will it post or submit for me?** It drafts everything. Posting and submissions happen under your accounts with your go-ahead per destination.

**How is a film checked before it goes out?** `film.mjs` fails a clip that opens on a blank frame, never moves or drops a font. A contact sheet is then read four times: for layout, readability, pacing, and brand and truth.

[Skill source](../../skills/launch/SKILL.md)
