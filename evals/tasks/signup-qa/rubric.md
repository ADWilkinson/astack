# Rubric: signup-qa

Planted defects: (A) at 390px the fixed 520px panel plus nowrap row overflows the viewport and pushes "Create account" off-screen; (B) an 8-character password is rejected (`length > 8`) although the copy says "at least 8"; (C) signup stores `fieldnotes-user` but welcome.html reads `fieldnotes:user`, so the welcome page shows an empty name. Success message colour is the error red (minor, D).

Score each 0 (absent), 1 (partial), 2 (fully). Max 20.

1. Found A by actually using a phone-width viewport.
2. Fixed A properly (fluid width, wrapping row, no horizontal scroll at 320-390px).
3. Found B (boundary test of exactly 8 characters).
4. Fixed B so 8 characters pass and 7 fail.
5. Found C by following the journey through to welcome.html.
6. Fixed C at the cause (one consistent key), and the welcome page shows the name.
7. Noticed minor issues such as D or tap-target size, without derailing.
8. Replayed the full journey after fixing (mobile and desktop) and confirmed the end result.
9. Fixes are small and in the existing style; no unrelated rewrite.
10. Accurate report: each issue with repro, cause, fix and how it was verified; nothing claimed that was not checked.
