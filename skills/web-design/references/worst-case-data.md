# Worst-case data

Demo data flatters a design: names that fit on one line, counts that never need a separator, every optional field filled. Before calling a screen done, feed it realistic worst cases through the same boundary the real data uses (the fixture, the mock, the props or the API stub), never by hand-editing markup. Adapted from [Emil Kowalski's break-ui skill](https://github.com/emilkowalski/skills) (MIT).

## Method

1. **List every value the screen renders** with its source and its limit: the validation schema, the database column, the API type, the input's `maxLength`. "Unbounded" is a finding. Include the values people forget: counts in headers, relative times, badge and status text, labels that come from data, avatars, and the length of each list.
2. **Build one worst-case fixture** shaped like the demo data, spreading different failures across the first rows rather than stacking them in row one. Add **empty**, **one** and **huge** variants (zero items, a count of exactly 1, the realistic upper bound for an unpaginated list).
3. **Make it switchable in development only**: a `?data=worst` parameter read where the fixture is chosen, or a prototype route. It never ships.
4. **Look**: at the component's real container width, at 320px and at the widest layout, with text enlarged to 200%, in dark mode, and under `dir="rtl"` if the product supports it. `shoot.mjs` at those widths plus a read of each capture.
5. **Report** each break with its fix, then fix what is clearly a defect. Truncate-or-wrap and hide-or-dash are design decisions; name them rather than guessing silently.

Plausible values only. A 5,000-character name or `aaaaaaaa…` proves nothing and gets ignored. Use `example.com` and `.test` domains in fixtures.

## Values that break things

| Kind | Try | What tends to break |
| --- | --- | --- |
| Names | `Aleksandra Wiśniewska-Kowalczyk`, `Jo`, `J`, `王秀英`, `نور الهدى عبد الرحمن`, `María José de la Cruz y Fernández`, `🦊 Fox`, `👩🏽‍💻 Priya`, missing | Wrapping, initials logic (half an emoji from `.charAt(0)`, `Md` initials), RTL punctuation, empty fallback |
| Unbreakable strings | `bartholomew.fitzgerald@northwind-industries-holdings.example.com`, a long URL with a query, a UUID, `Q3 Board Deck — FINAL (revised) v12 [approved by legal].pdf` | Rows pushed wide without `overflow-wrap: anywhere` and `min-width: 0`; end-truncation hiding the part that differs |
| Labels from data | `Senior Product Design Engineer, Platform Infrastructure`, `Benachrichtigungseinstellungen`, French or German copy (~30% longer), twelve tags, one 40-character tag, empty title, `<script>alert(1)</script>`, a newline in a one-line field | Badges squeezing names, tag walls with no `+8` overflow, collapsed headings, escaping |
| Numbers | `0`, `1`, `1284`, `1000000`, `12345678.9` as money, `-42.5`, `0.1 + 0.2`, `142%`, `null`, a value ticking `99` → `100` | Division by zero, "1 members", missing separators, raw float noise, meters past their bounds, `NaN` on screen, width jitter without `tabular-nums` |
| Collections | 0, 1, exactly a page, a page plus one, 1,000+, one item ten times taller, duplicate names | Missing empty state, a lonely single card, empty page 2, scroll and render cost, rows stretched to the tallest |
| Time | now, 12 days ago, 3 years ago, a future date, `1970-01-01`, a late-evening time in another timezone | "0 seconds ago", relative time that never becomes a date, "-3 days ago", a zero timestamp shown as real, the wrong day. Use `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat`. |
| Media | a 404 avatar, no avatar, a 4000×200 image, a dark transparent logo in dark mode, a slow image | Broken-image icons, squashed avatars without `object-fit` and `flex-shrink: 0`, invisible logos, layout shift without `aspect-ratio` |
| States | loading, an API error, partial optional fields, every status value at once, no permission, the current user in the list | Skeletons that do not match (`shoot.mjs --shift`), raw `TypeError` text, misaligned rows, uneven badge widths, actions that should not apply to yourself |

## Failure signatures

| What you see | Usual cause | Fix |
| --- | --- | --- |
| Avatar or icon squashed into an oval | Flex child shrinking | `flex-shrink: 0` on fixed-size boxes |
| A row pushed wider than its container | Long unbreakable text in a flex or grid child | `min-width: 0` on the child, `overflow-wrap: anywhere` or truncation on the text |
| Text clipped mid-glyph | Fixed height with `overflow: hidden`, tight line height | Let the height grow, or clamp lines with `-webkit-line-clamp` |
| Trailing actions pushed off screen | The name column will not give way | Let the name truncate; keep actions `flex-shrink: 0` |
| "1 members", "0 results found" | String concatenation | `Intl.PluralRules` or the i18n library's plurals |
| Hover-only actions unreachable on touch | `opacity: 0` until `:hover` | Show them on touch (`@media (hover: none)`) or move them into a menu |
