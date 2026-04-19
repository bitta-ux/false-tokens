# False Tokens

**A Figma plugin that finds elements in your design that are using raw values instead of design tokens.**

Available on the [Figma Community](https://www.figma.com/community/plugin/1526224395293662746/false-tokens).

---

## What it does

False Tokens scans your Figma file and surfaces every element that has a hardcoded color or text style — things that *look* tokenized but aren't actually connected to a variable or style. Think of it as a lint check for your design system hygiene.

It catches two categories of issues:

- **Colors** — fills and strokes that use raw hex values instead of bound variables or color styles
- **Text** — text layers that aren't connected to a text style

---

## Features

- **Scoped scanning** — scan the entire current page, a selected frame, component, group, or individual element
- **Color + text modes** — switch between auditing color tokens and text styles
- **Hidden layer control** — choose whether to include or skip hidden/invisible elements
- **Click to navigate** — click any result to jump directly to the offending layer in your canvas, across pages
- **Auto-detects fixes** — if you fix an issue and click the result again, the plugin recognizes it's been resolved and celebrates 🎉
- **Performance safe** — processes up to 10,000 nodes with a breadth-first traversal, skipping hidden subtrees for speed

---

## How to use

1. Open the plugin from **Plugins → False Tokens**
2. Optionally select a frame, component, or group to narrow the scan scope (defaults to the full page)
3. Choose a scan mode: **Color** or **Text**
4. Toggle **Include hidden layers** if needed
5. Hit **Scan** — results appear as a list with the layer name, hierarchy path, and the raw value used
6. Click any result to select and zoom to that layer in the canvas
7. Fix the issue in Figma, then click the result again to confirm it's resolved

---

## Scan scope

The plugin automatically detects your selection:

| Selection | Scope |
|---|---|
| Nothing selected | Entire current page |
| Frame / Component / Instance / Group / Section | That container and all its children |
| Any other element | That single element |
| Multiple elements | All selected elements |

---

## What counts as a token?

The plugin considers a value tokenized if:

- **Color** — the fill or stroke has a bound Figma variable (`boundVariables.color`) OR is linked to a published/local color style (`fillStyleId` / `strokeStyleId`)
- **Text** — the text layer is linked to a text style (`textStyleId`)

Raw hex values, manually typed colors, and unstyled text are all flagged.

---

## Project structure

```
false-tokens/
├── code.js       # Plugin logic — scanning, traversal, node navigation
├── ui.html       # Plugin UI — results list, controls, animations
└── manifest.json # Figma plugin manifest
```

---

## Local development

1. Clone this repository
2. In Figma desktop, go to **Plugins → Development → Import plugin from manifest**
3. Select the `manifest.json` file from this repo
4. The plugin will appear under your development plugins

No build step required — the plugin runs directly from `code.js` and `ui.html`.

---

## Limitations

- Scans up to **10,000 nodes** per run. For very large files, consider scanning specific frames rather than the full page.
- Only detects **solid** fills and strokes. Gradients, images, and other paint types are not flagged.
- Mixed-format text layers (with multiple styles applied) are detected at the node level.

---

## Author

Name: Bitta Singha
Linkedin: www.linkedin.com/in/bitta-singha-97a22a1b6
Instagram: [@bitta.ux](https://instagram.com/bitta.ux)

---

## License

MIT
