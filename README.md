# Sketch to App

Draw a wireframe — or photograph one on paper — and get a working webpage you can edit and export. Sketch in, website out.

## How it works

1. **Sketch it** — draw on the graph-paper canvas (pen, eraser, undo, grid), drop in a photo of a paper sketch, paste one, or load a seeded example.
2. **Generate** — with your own free Gemini API key, the sketch is read by Gemini and turned into a structured page layout (header, hero, cards, form, footer — never raw model HTML).
3. **Fix it by hand** — every section is an editable block: change the words, reorder, add or delete blocks, switch the page dark or change its accent colour. The preview updates as you type.
4. **Export** — copy the HTML, download a single self-contained `.html` file, or download a `.zip` (`index.html` + `README.txt`). The exported page opens from disk with no network.

## No key? It still works

No API key exists in this repo and none is bundled. Without a key the app says so plainly and:

- the three seeded examples (café landing page, pricing page, portfolio) work end to end — sketch, layout, preview, editing, export;
- you can draw by hand and edit the starter blocks;
- live generation and re-prompting stay off until you add a key.

Add a key in **Settings** (free, from [Google AI Studio](https://aistudio.google.com/apikey)). It is stored in your browser's `localStorage` only and sent to Google's Gemini API when you generate or re-prompt — nowhere else. **Test connection** in Settings checks the key before you generate.

Default model: `gemini-3.8-flash` (verified 23 Nov 2026 from Google's own model docs at ai.google.dev/gemini-api/docs/models — the stable Flash model; `gemini-2.5-flash` is deprecated and routes to `gemini-3.5-flash-lite` from 1 Dec 2026). Alternatives in Settings: `gemini-3.6-flash`, `gemini-3.5-flash-lite`.

## Projects

Saved in the browser only — nothing is uploaded. Save, open, duplicate, delete, and import/export projects as JSON. Your current work autosaves as a draft, so a refresh loses nothing. Deep link: `index.html#example=cafe` (also `pricing`, `portfolio`) opens that example.

## Run it

No build step, no dependencies, no server. Open `index.html` in a browser, or serve the folder statically (it is GitHub Pages-ready):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tests

```sh
node --test tests/test.js
# 23 tests, 0 failures (layout validation + HTML generation, ZIP writer,
# Gemini request/response handling, seeded examples)
```

## Screenshots

In `screenshots/`: desktop (1280px) and mobile (390px) renders of the app, the café and pricing examples loaded, and the exported standalone page. Zero horizontal overflow at both widths.

## Design

Violet `#5B21B6` + Sora (self-hosted variable font, `fonts/`). Signature idea: graph paper — the sketch canvas sits on a faint grid and violet is the only ink. References: Linear (three-column app shell), Mobbin (calm, dense panels), Land-book (one idea per page). No gradients, no glows, no cliché copy.

## Stack

Plain HTML/CSS/JS. Deliberate choices, verified 23 Nov 2026:

- **No framework / no build step** — the app must open from a static host and from disk, and its state is small enough for vanilla JS to stay readable.
- **No JSZip** — JSZip 3.10.2 (latest, 8 Sep 2026) was checked and deliberately not used; a ~90-line stored-entry ZIP writer in `lib/zip.js` covers the export and keeps the page dependency-free and offline-capable.
- **Gemini via the REST API directly** (`generativelanguage.googleapis.com`), `responseMimeType: application/json`, validated against a fixed layout schema, one retry on invalid output.

## Honest limits

- Static front-end only. No backend, database, login, payments, or real data. Forms in generated pages submit nowhere — they show a plain "demo form, nothing was sent" note.
- The model reads boxes and labels, not handwriting in general. Messy writing, arrows and ambiguous boxes can be misread; the block editor is the fix.
- Output is a starting point, not pixel-perfect. Colours and spacing come from the layout theme, not the sketch.
- Images render as a labelled placeholder block — the app never invents a photo.
- Live generation needs a free Gemini API key and internet. Everything else works offline.
- Live generation with a real key has not been run in this environment (no key exists here); the request/response path is covered by tests with a mocked fetch, and the error paths (bad key, quota, invalid layout) are handled with plain messages.

## 2-minute demo script

0:00–0:20 draw a landing page live (header, hero, two cards, signup button). 0:20–0:45 photograph it (or use the drawing) and press Generate. 0:45–1:15 click the button, scroll, flip to the phone view. 1:15–1:45 re-prompt once ("make it dark, bigger headline"), then fix one heading by hand. 1:45–2:00 download the zip and open it from disk. If live generation fails on stage, load the café example — same flow, known-good layout — and say so out loud.

## License

MIT — see `LICENSE`.
