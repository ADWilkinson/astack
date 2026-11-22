# Control names

From this directory, capture the same checkout before and after its labels are fixed.

```sh
node ../../../shared/scripts/shoot.mjs "file://$PWD/fixture.html" --themes light --json
node ../../../shared/scripts/shoot.mjs "file://$PWD/fixture.html#fixed" --themes light --json
```

At both widths, the first capture should report the receipt button, details link and quantity spinbutton. The labelled save button, labelled search field and hidden button should produce no finding. The fixed page should report zero unnamed controls. Chrome computes the names, including the hidden text referenced by the save button.
