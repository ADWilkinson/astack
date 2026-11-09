# web-design

## What it does

Gives an interface a direction that fits the product, holds a craft floor while building, animates with purpose (and only where it should), and checks the render at 390 and 1440 in light and dark, on worst-case data. Keeps a DESIGN.md so later sessions do not drift back to defaults, and checks its plan against today's AI-design defaults before building.

It also audits a whole app's motion: every animated element with its `file:line`, sorted into keep, fix and cut, the few places motion is missing, and an approve or block verdict. When several things move at once it gives them one lead and lets the rest follow.

## When to reach for it

New pages, redesigns, "this looks AI-generated", brand refreshes, janky, sluggish or busy animation, "audit the animations", a web app that feels wrong on a phone, or any change where hierarchy, type, colour or mobile layout matter.

## It's working if

The screenshots show a page you could recognise without its logo, no overflow or stranded words, real content in every state, and DESIGN.md records the decisions. Where the screen waits on data, the loading and loaded captures share the same boxes. The phone lines from `shoot.mjs` (input size, zoom, hover, selectable controls, tap highlight) are clean or chosen on purpose.

## Common questions

**Will it impose a house style?** No. Your brief and DESIGN.md win. The anti-pattern list is a set of defaults to question, not a ban list.

**Does it need Chrome?** For screenshots, yes: shoot.mjs drives a local Chrome or Chromium.

**Where do the motion rules come from?** The decision order, easing values and performance diagnosis draw on [Emil Kowalski's skills](https://github.com/emilkowalski/skills) (MIT).

[Skill source](../../skills/web-design/SKILL.md)
