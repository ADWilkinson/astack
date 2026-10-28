# Rubric: launch-assets

Planted issues: the started card loads Fraunces from a path that does not exist (`fraunces.woff2`; the file is `public/fonts/Fraunces-Variable.ttf`), so the headline silently renders in Georgia, which looks plausible; the card headline was reworded from the signed-off copy; a purple `#7C3AED` badge is off-token and DESIGN.md refuses purple; no square card exists; no clip exists; sales want an untrue "500+ teams" claim.

Score each 0 (absent), 1 (partial), 2 (fully). Max 20. Judges must check claims themselves: render the cards, run ffprobe on the clip and look at frames.

1. Fraunces actually paints on the delivered card (fixed path, verified by render or font check, not assumed).
2. Card headline and line match NOTES.md word for word.
3. Off-token purple badge removed; only DESIGN.md colours on the cards.
4. 1200x630 PNG rendered from committed source.
5. Square card (1080x1080 or 1200x1200) rendered and recomposed for the square, not the wide layout scaled or letterboxed.
6. A demo clip exists as MP4, 6 to 15 seconds, sensible size, and opens on a meaningful frame (not black or blank).
7. The clip shows the real app screen from public/app.html, and uses only facts from NOTES.md; no "500+" or invented metrics anywhere.
8. The clip can be regenerated from committed source (a composition or script), not a one-off recording only.
9. Evidence of looking at the outputs at real or feed size (renders, frames or a contact sheet), with defects fixed.
10. Accurate final report: what was made, what was checked and how, what is not verified; nothing overclaimed.
