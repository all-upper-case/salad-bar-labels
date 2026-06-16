# Gaucho Urbano Salad Bar Labels

A browser-based generative label outline/pattern tool for Gaucho Urbano salad bar labels.

The goal is to create printable, repeatable, mathematically generated label shapes with controllable dimensions, decorative complexity, names/food items, and exports.

## Current features

- Generate many label outline variations from a seed.
- Control label size in inches for reliable print scale.
- Control complexity, corner style, tabs, notches, scallops, line count, ornament density, and color.
- Paste a list of food names or upload a `.txt` / `.csv` list.
- Preview labels as real SVGs.
- Export a single selected label as SVG.
- Export all generated labels as one SVG sheet.
- Export a print-ready HTML sheet and use the browser print dialog to print at 100% or save as PDF.

## Running locally or in Replit

```bash
npm install
npm run dev
```

Then open the URL Replit/Vite gives you.

## Printing accurately

The generated SVGs use physical units such as `in`, so the browser print flow should preserve real-world size as long as the print dialog is set correctly:

- Scale: 100%
- Disable “fit to page” / “shrink to printable area” when possible
- Paper: Letter, unless changed in the app later

## Notes

This is intentionally built as a plain browser app first. Once the core generator feels good, we can add nicer presets, saved style packs, PDF export, PNG export at chosen DPI, and more advanced import/export workflows.
