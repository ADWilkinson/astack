# Voice profile

<!-- slop-scan: ignore-file (this file quotes the patterns it teaches) -->

Build a voice file when someone wants writing that sounds like them or their product, and none exists.

## 1. Collect real samples

10 to 30 pieces the person actually published or approved: posts, docs, emails, release notes, replies. Prefer recent and prefer pieces they wrote themselves over pieces they edited lightly. One rejected draft tells you what they dislike, not how they write.

Do not copy private messages into the repository. Store the profile, not the corpus.

## 2. Measure

Count, do not guess:

- Sentence length: median and the longest typical (split on `.?!`).
- Paragraph length in sentences.
- Person: "I", "we", "you" ratios.
- Contractions: used or avoided.
- Punctuation habits: dashes, colons, brackets, exclamation marks per 1,000 words.
- Openers: how pieces start (straight claim, question, number, story).
- Recurring words and phrases that are theirs (keep these), and generic phrases they never use.
- Formatting: headings, bullets, emoji, capitalisation of titles.
- Register by channel: a launch post and a support reply differ.

## 3. Write `VOICE.md`

```md
# Voice

## In three lines
Plain, specific, a bit dry. Leads with the answer. Numbers over adjectives.

## Mechanics
- Sentences: median 14 words, rarely over 25.
- "We" for the product, "you" for the reader. Contractions yes, negative contractions no.
- No exclamation marks. No em dashes. Colons only before lists.
- Sentence case everywhere. Numerals always.

## Always
- Lead with the result, then how.
- One caveat, placed where it applies.
- Every problem ends with what to do.

## Never
- seamless, robust, unlock, journey, game-changer, "peace of mind", "whether you're X or Y"
- Rhetorical questions as openers. Triads by reflex.

## By channel
- Release notes: past tense, one line per change, user-visible changes first.
- Social: one claim, one proof, one link. No hashtags.

## Examples
Two or three short real passages that show the voice at its best (with permission), each with a note on what makes it work.
```

## 4. Test it

Write a fresh piece from the profile, put it next to a real one, and check: would the person accept it with light edits? Adjust rules that produced the differences. Keep the profile under a page; long profiles get ignored.
