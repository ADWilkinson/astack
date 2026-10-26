# Reference study

Use when the user names sites they like, or when a direction needs grounding beyond taste. The goal is to extract relationships you can reuse, not to copy a look.

## 1. Collect

Pick 4 to 9 references with a reason each ("Monzo: friendly numbers-first hierarchy", "Stripe docs: dense but calm tables"). Mix direct competitors with products from other fields that solve the same layout problem.

## 2. Measure, don't eyeball

Capture each at the same widths:

```sh
node <skill-dir>/scripts/shoot.mjs https://example.com --widths 390,1440 --themes light --out refs/example
```

Then pull computed styles from the live page (in a browser tool or DevTools console):

```js
const pick = s => ({ font: s.fontFamily.split(",")[0], size: s.fontSize, weight: s.fontWeight,
  lh: s.lineHeight, track: s.letterSpacing, color: s.color });
({
  h1: pick(getComputedStyle(document.querySelector("h1"))),
  body: pick(getComputedStyle(document.querySelector("p"))),
  bg: getComputedStyle(document.body).backgroundColor,
  button: (() => { const b = document.querySelector("a[class*=button],button"); const s = getComputedStyle(b);
    return { ...pick(s), bg: s.backgroundColor, radius: s.borderRadius, pad: s.padding }; })(),
  maxWidth: getComputedStyle(document.querySelector("main") ?? document.body).maxWidth,
})
```

## 3. Tabulate

| Ref | Canvas | Display face / size | Body size / lh | Accent use | CTA radius | Density | Signature move |
| --- | --- | --- | --- | --- | --- | --- | --- |

The signature move is the one thing that makes it recognisable (a colour block, a type pairing, an illustration style, a grid).

## 4. Derive, then depart

Write the common threads (e.g. "all use one warm neutral canvas, body 16 to 17px at 1.5, one accent used only on actions"). Those become rules. Then choose the one place this product departs, tied to its own content. A direction that is the average of the references is generic by construction; expect to reject the first rounds that look like that.

## 5. Record

Put the table and the derived rules in DESIGN.md's decisions log with the date. Screenshots of references are for study; they are not licences to use their assets, illustrations or fonts.
