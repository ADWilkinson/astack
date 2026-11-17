# Designed documents: PDFs from HTML

A report, proposal, invoice, one-pager or certificate is a designed object. The default output (system font, one column, a table in a grey grid, the title at 14pt) says nobody looked at it. Build the document as an HTML page with one element per sheet, print it with `pdf.mjs`, and read every page image before it goes anywhere. Prompted by Shadcn Labs' [pdfcn](https://www.pdfcn.dev/), a registry of React PDF components; the method here needs only Chrome.

If the project already renders PDFs (a React PDF renderer, a template service), use that renderer and its components, and apply the layout rules below. Do not add a second PDF stack for one document.

## Order of work

1. **Job.** Who reads it, where (screen, paper, a phone attachment), and the one thing each page must say. A document for print has no links to click and no hover.
2. **Content first.** Real names, numbers and dates from the brief or the data. Fix the page count from the content, not from a template: a two-page proposal padded to four reads as padding.
3. **Grammar.** Take faces, colours and logo from DESIGN.md when the project has one. Otherwise choose one display face and one text face, three to five colours, and write them at the top of the file as custom properties.
4. **Build each sheet**, then print and gate.
5. **Read every page image** at full size, then at thumbnail size for the rhythm across pages.

## The sheet contract

```html
<!doctype html><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0 }
  html, body { margin: 0 }
  .page { width: 210mm; height: 297mm; box-sizing: border-box; padding: 20mm 18mm 18mm;
          position: relative; overflow: hidden; break-after: page }
  .page:last-child { break-after: auto }
  .folio { position: absolute; left: 18mm; right: 18mm; bottom: 10mm;
           display: flex; justify-content: space-between; font-size: 8pt }
</style>
<section class="page">…</section>
<section class="page">…</section>
```

- One `.page` per sheet, sized to the paper: A4 is 210 by 297mm, US Letter 8.5 by 11in. Set the size the reader prints on.
- Margins live in the sheet's padding, so a full-bleed band or image can reach the edge. Keep text at least 12mm from the edge; office printers cannot print closer.
- You place the content on each sheet. Long tables are split by you into sheets with the header row repeated, not left to flow. A flowing document may use `break-inside: avoid` on rows, cards and figures and `break-after: avoid` on headings instead, and then the count check does not apply: say so.
- Running header, footer and page number are elements on each sheet (`.folio`), written in the source. Chrome's own header and footer stay off.
- Fonts load from files in the project with `@font-face`. A remote font that fails prints as the fallback.

## Layout rules

| Area | Rule |
| --- | --- |
| Type | Sizes in points. Body 9.5 to 11pt at 1.4 to 1.6 line height; captions and table text 8 to 9pt; nothing under 7pt. Headings on a scale with a visible ratio (1.25 or wider): 11, 14, 18, 24, 32. A cover title may go much larger. |
| Measure | 55 to 75 characters a line. One column of 11pt across A4 is too wide: use a narrower text column with a margin column for labels and figures, or two columns. |
| Grid | 4pt spacing steps, a 12-column or margin-plus-main grid, and the same left edge on every page. Section, paragraph and component gaps come from three values, not ten. |
| Tables | Numbers right-aligned in tabular figures, text left-aligned, rules between rows only (or none, with spacing), the header quieter than the data, totals set apart by a rule and weight. No full grid, no zebra by default. |
| Pages | A cover or a strong first page, an opening that states the conclusion, then sections that each start at the same place on the sheet. One accent colour, used for the same meaning each time. |
| Colour | Dark text on a light sheet. Large solid dark areas cost toner and band on office printers; keep them for a cover. Set `print-color-adjust: exact` where a background carries meaning. |
| Images | Raster at 2x its printed size or more (150 to 300 pixels an inch); charts and logos as SVG. A product screen is a capture placed as an image, never a redrawn one. |
| Truth | Every number, name and date comes from the data or the brief. An invoice total equals the sum of its lines; check it in code, not by eye. |

## Print and gate

```sh
node <skill-dir>/scripts/pdf.mjs docs/report/report.html --out docs/report/report.pdf
```

It writes the PDF and one PNG per sheet, and exits 1 when content runs off a sheet, when the PDF has a different number of pages than the source has sheets (a sheet spilled or is the wrong size), when text is under `--min-pt`, or when a font or request failed. Exit 2 means it could not check, which is not a pass.

Then read every page image:

- Is the most important thing on each page the most prominent?
- Do pages share margins, the heading position and the folio?
- Any widow (a last line alone at the top of a sheet), orphaned heading at the bottom, or table split from its header?
- Does a page that is one third full look intended, or abandoned?
- At thumbnail size, do the pages look like one document?

Fix the worst defect and print again. Score a public or customer-facing document with `web-design`'s review rubric if it is installed.

## Deliver

- The HTML source committed beside the PDF, with the command that rebuilds it.
- File size stated; compress images before embedding, not after.
- Document title set in `<title>`, which becomes the PDF's title in a reader's tab.
- Report the page count, the gate result, which pages you read and anything not checked (a real printer, a phone PDF viewer).
