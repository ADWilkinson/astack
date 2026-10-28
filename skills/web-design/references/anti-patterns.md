# Anti-patterns: what makes UI read as generated

<!-- slop-scan: ignore-file (this file quotes the patterns it teaches) -->

Each is a default a model reaches for when nothing in the brief pushes back. Any of them can be right when the brief asks for it. Ids match `deslop`'s `slop-scan.mjs` rules where one exists.

## The current defaults

Generated design clusters around a few looks at any moment. Each is fine when the brief asks for it; each is slop when it shows up regardless of subject. As of late 2026:

| Cluster | Looks like |
| --- | --- |
| warm-editorial | Warm cream or paper background (around `#F4F1EA`), high-contrast serif display, terracotta or clay accent (around `#D97757`), italic accent word in the headline |
| dark-acid | Near-black background (`#0B0B0B`, `#111`) with one acid-green, lime or vermilion accent and monospace details |
| broadsheet | Hairline rules, zero radius, dense newspaper columns, small caps everywhere |
| saas-cards | Identical rounded cards, one radius on everything, the same soft grey shadow, gradient washes as decoration |
| last-year | Purple-to-indigo gradients, gradient headline text, glass panels, glowing blobs |

Template chrome that appears whatever the subject:

- a tracked-out ALL-CAPS label above every heading;
- meta strings joined with middle dots (`A · B · C`);
- labels built as "WORD — fragment" with a spaced dash;
- `→` appended to every link and button;
- a monospace face for small data labels as a costume for "technical";
- numbered markers (01 / 02 / 03) on content that is not a sequence;
- one word or phrase in a headline picked out in italic, bold or colour;
- fade-and-slide-up entrances on every section.

`slop-scan.mjs` detects several of these (`warm-editorial`, `dark-acid`, `mid-dot-meta`, `arrow-suffix`, `caps-eyebrow`). The rest need eyes on the render.

## Composition

| Pattern | Looks like | Instead |
| --- | --- | --- |
| hero-template | Centred headline, subline, two buttons (primary + "Learn more"), screenshot below | Lead with the product doing its job: the real rate table, the real map, the real output. Left-aligned is fine. |
| icon-circle-grid | Three columns of icon-in-circle, bold title, two-line description | Show the features working, or a list that compares, or a single strong claim with proof. |
| card-soup | Every section in a rounded card with border and shadow; cards nested in cards | Use cards only for independent objects. Group with space and type. |
| section-rhythm | Every section: eyebrow, H2, paragraph, grid, repeat | Vary the rhythm by content: a table, a full-bleed image, a quote, a dense list. |
| eyebrow-everywhere | Small all-caps label above every heading ("FEATURES", "HOW IT WORKS") | Delete it. If the heading needs a label, the heading is wrong. |
| hero-metric | Big "10x faster", "99.9%", "$2M+" stats strip | Only real numbers with a source and date. Otherwise remove. |
| fake-proof | Logo walls, testimonials and avatars that are not real customers | Remove. Show the product instead. |
| centred-everything | Every block centred, including body text | Left-align reading text; centre only short, isolated statements. |

## Surface

| Pattern | Looks like | Instead |
| --- | --- | --- |
| violet-gradient | Purple to indigo gradients, cyan accents on near-black | Pick colour from the product's world. One accent. |
| gradient-text | Headline filled with a gradient (`bg-clip-text text-transparent`) | Solid ink. Emphasis through weight, size or a single coloured word only if the brand does that. |
| glass | `backdrop-blur` panels everywhere | Solid surfaces. Blur only when content genuinely scrolls beneath. |
| glow-blob | Huge blurred circles behind the hero | Nothing, or a real image or graphic that explains something. |
| side-stripe | Thick coloured left border on rounded callouts | A heading, an icon with meaning, or plain text. |
| uniform-bubbly | `rounded-2xl` on everything, buttons as pills by default | A radius scale with roles: controls, panels, pills. |
| shadow-fog | Wide soft shadow plus thin border on every panel | Hairline or space. If you use shadows, give them offset and direction. |
| sparkle | ✨ or a magic wand to mean "AI" | Say what the feature does. |

## Type

| Pattern | Looks like | Instead |
| --- | --- | --- |
| default-font | Inter / Roboto / Geist / Poppins / system-ui because nothing was chosen | Choose. A default can be right, but it should be a decision written in DESIGN.md. |
| flat-hierarchy | Sizes 14, 15, 16, 18 with the same weight | A scale with clear steps (ratio ≥ 1.2) and few sizes. |
| all-caps-labels | Uppercase tracking-wide labels on everything | Sentence case. Caps for at most one role. |
| stranded-word | One word alone on the last line of a heading or button | `text-wrap: balance`, shorter copy, `&nbsp;`. |

## Motion

| Pattern | Looks like | Instead |
| --- | --- | --- |
| fade-up-everything | Every section fades and slides up on scroll | One authored moment where motion explains something. |
| hover-scale | Cards grow on hover | A clear hover state (colour, underline, shadow change) that does not move layout. |
| decorative-pulse | Pulsing dots, bouncing arrows, marquees | Static, unless it reflects real live state. |
| bounce-ease | Overshoot springs on business UI | An ease-out with no overshoot. |

## Copy in UI

| Pattern | Looks like | Instead |
| --- | --- | --- |
| generic-cta | "Get started", "Learn more", "Explore" | The action: "Create a listing", "Compare plans". |
| explainer-subtitle | A grey sentence under every heading re-saying the heading | Delete it. |
| buzzword-hero | "Unlock seamless…", "Supercharge your…", "The future of…" | What it does, for whom, in plain words. |
| emoji-copy | 🚀 ✨ 🔥 in headings and buttons | Words. |

## Sets and assets

| Pattern | Looks like | Instead |
| --- | --- | --- |
| scaled-not-recomposed | The square or portrait size is the landscape layout shrunk | Recompose each size; spend extra height on content |
| template-sameness | Every slide or card is one layout recoloured | Vary the spatial idea, keep the system |
| silent-fallback | The brand face failed to load and the render shipped in a system font | `render-gate.mjs --design DESIGN.md` catches it |
| faked-weight | A light face stroked or outlined to look bold | A real weight, or more size |

The full list of failure patterns, with how to score a piece, is in the [review rubric](review-rubric.md).

## The screenshot test

Remove the logo and product name from a screenshot. If it could be any startup's landing page, it has too many of the above. A good page is recognisable from one section.
