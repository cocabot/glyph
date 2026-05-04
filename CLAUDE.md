# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"GLYPH / グリフ" — a mobile-oriented, Japanese-language picross (nonogram) web app. Users generate puzzles three ways: (1) typing a keyword, (2) uploading or capturing a photo, or (3) the built-in sample. Pure static site: no build step, no framework. The project ships `index.html` + a few JS/CSS files served as-is.

## Commands

```bash
# Serve locally (UI tests expect 127.0.0.1:8123)
python3 -m http.server 8123

# Tests (Node's built-in runner; no Jest/Mocha)
npm test                       # core + icon-pipeline + ui
npm run test:core              # pure logic, fast, offline
npm run test:icons             # hits api.iconify.design — needs network
npm run test:icons:debug       # PICROSS_DEBUG=1, dumps PNGs to tests/debug-out/
npm run test:ui                # Puppeteer; needs the http server running
npm run test:ui:shots          # also writes screenshots to tests/ui-shots/

# Run a single test file or filter by name
node --test tests/core.test.js
node --test --test-name-pattern='lineHints' tests/core.test.js

# Quick syntax check after edits
node --check app.js
```

UI tests launch headless Chromium with `--no-sandbox`. Override the target URL with `PICROSS_URL=...` if the server isn't on the default port.

## Architecture

Four files do everything; load order in `index.html` matters because they communicate via globals.

1. **`picross-core.js`** — pure, side-effect-free numeric helpers: `lineHints`, `otsu`, `boxBlur`/`boxBlur2d`, `sobelEdge`, `cleanupGrid`, `isSolved`, `buildHintsFromGrid`. Dual-exports as a CommonJS module (for tests under Node) and as globals on `globalThis` (for the browser). Anything Node-testable should live here.

2. **`picross-dict.js`** — JP→EN keyword dictionary exposed as global `PICROSS_JP_TO_EN`. Values are `string` *or* `string[]` (multiple translations; the first is the primary). Add new keywords here, not in `app.js`.

3. **`app.js`** — the entire app. One big module organized as:
   - **State** (`state` object near the top): source image, render params, solution, player grid, timer, etc. Mutated directly.
   - **Screen routing**: four `<section class="screen">` elements (`home`/`edit`/`play`/`clear`); `showScreen(name)` toggles `.active`.
   - **Keyword → icon pipeline** (the most complex part): `generateFromKeyword` → `fetchIconifySearch` → `chooseIconCandidate`. For each candidate, the SVG is rasterized via `svgToFittedImage`, downsampled to NxN by `imageToIconGrid`, then scored by `gridQualityScore` (component count, fill ratio, bbox cover, isolated pixels). `PREFERRED_ICONS` is hand-curated overrides that *only* boost a candidate if it also passes the quality gate. `ICON_PREFIX_PRIORITY` ranks Iconify icon sets.
   - **Image → grid pipeline** (`buildGrid`): high-res sample → luminance → optional unsharp mask → mode-specific signal (`standard`/`adaptive`/`edge`) → block-average down to NxN → binarize. The `adaptive` path uses local-mean subtraction; `edge` uses Sobel; icon sources go through `buildIconGridFromInk` which sweeps thresholds and picks the best by ratio + connectivity.
   - **Play board** (`buildBoardDOM`, `applyAction`, `attachBoardEvents`): builds a CSS-grid DOM board, supports tap/long-press/drag, undo, three modes (fill/cross/erase), per-line hint completion strikethrough, and a clear screen.

4. **`style.css`** — design tokens at the top (CSS custom properties, warm "engraved" palette). All four screens share the same stylesheet.

### Cache busting

Every `<script>` and `<link>` in `index.html` carries a `?v=N` query string. **When you change `app.js`, `style.css`, `picross-core.js`, or `picross-dict.js`, bump that number in `index.html`** — otherwise Cloudflare/browser caches will serve stale code.

### Browser ↔ Node code sharing

`picross-core.js` is the boundary. To make new logic testable from Node, write it there with the dual-export pattern at the bottom of the file. `app.js` is browser-only (uses `document`, `Image`, `fetch`, `Blob`, `URL.createObjectURL`).

### External APIs

The keyword flow calls `https://api.iconify.design/search` and `https://api.iconify.design/{prefix}/{name}.svg`. No API key. The icon-pipeline test exercises real network — expect occasional flakes when offline.

## Conventions

- The UI is in Japanese; user-facing strings (toasts, labels, screen titles) stay in Japanese. Code identifiers and comments may mix Japanese and English — match the surrounding file.
- No TypeScript, no bundler, no transpile. Target evergreen mobile Safari/Chrome; avoid features that need a build step.
- Keep `picross-core.js` pure (no DOM, no `fetch`). It is the only file with a Node-side test surface.
