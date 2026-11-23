# Sketch to App — Deepened Plan (SaaS level, still demoable in 24–48h)

## 1. Product brief

**Name:** Sketch to App
**Type:** Browser tool (single-page web app, no backend, no account)
**What it does (1 sentence):** A hand-drawn wireframe — sketched in the app or photographed on paper — becomes a working, editable webpage in under a minute.
**Target user and biggest pain:** Hackathon builders, founders and students who can sketch a page in 30 seconds but lose hours turning it into HTML, or who stall because "I can't design".
**Core promise:** Sketch in, website out — and the result is real code you can edit and keep.
**Tone:** Plain, practical, a bit paper-and-ink. No marketing adjectives.
**Design identity (this project only):** Violet `#5B21B6` + Sora (self-hosted variable font). Signature idea: **graph paper** — the sketch canvas sits on a faint paper grid, violet is the only ink colour, and the generated page is crisp and plain. References: **Linear** (three-column app shell, quiet chrome), **Mobbin** (real app flows, dense but calm panels), **Land-book** (landing pages that let one idea carry the page). No gradients, no glows, no sparkle, no 3-card feature grid on the marketing surface.
**Platforms:** Web only. Works from a static host (GitHub Pages). No server, no database, no auth.

## 2. What the original plan had, and what deepening adds

The original plan (`.tmp-hackathon-plans/05-06-sketch-silent.md` §5) already had: sketch canvas + photo upload, Gemini vision → structured layout → preview iframe, edit/re-prompt loop, export as zip, three seeded examples. Deepening adds, without growing into enterprise scope:

- **Projects, saved locally.** Every generation is a project: name, sketch, layout, history. Saved in `localStorage`, loadable, duplicable, deletable, export/import as JSON. No account, no sync — the browser is the database.
- **A real block editor, not just re-prompting.** Every generated section is a block in a side panel: change its type, heading, text, button label, add/remove cards, move it up or down, delete it, add a new block. Every edit re-renders the preview instantly. This is the manual fix-up the original plan promised, made concrete.
- **Structured layout as the single source of truth.** Gemini never returns free-form HTML. It returns JSON against a fixed schema (header / hero / cards / form / text / image / footer). The app validates it, repairs what it can, rejects what it can't, and retries once. The same JSON drives the preview, the block editor, the export, and the re-prompt. No raw model HTML ever reaches the page, so a bad model answer cannot break the preview or inject scripts.
- **Honest key handling.** No key exists in this VM and none is bundled. Without a key the app says so plainly, offers the three seeded examples (which work fully, end to end), and lets the user draw and edit by hand. With a key pasted in Settings (localStorage only, never sent anywhere except Google's API), live generation and re-prompting work. A wrong key, a quota error, or a network failure is shown as a plain error with what to do next — never a faked page.
- **Export that is actually usable.** One self-contained `index.html` (inline CSS, no external requests, works opened from disk), plus a `.zip` with `index.html` + `README.txt`. Copy-HTML button included. The zip is built in the browser by a small dependency-free ZIP writer (stored entries + CRC32), so the app has zero runtime dependencies and works offline.
- **Generation log.** Each project records when it was generated, from what (example / AI / hand-built), and with which model — shown in the project panel, so a demo audience can see what is AI output and what is seeded.
- **Accessibility and mobile.** Full keyboard access to the block editor, labelled controls, visible focus, preview device toggle (desktop / 390px phone), generated pages stack cleanly on mobile.

Explicitly **out of scope** (stated in README, not faked): backend, database, login, payments, real form delivery, multi-page sites, image generation, pixel-perfect reproduction of a sketch. Forms in generated pages submit nowhere — they show a plain "demo form, nothing was sent" note.

## 3. Feature set (complete)

### 3.1 Sketch input
- Draw canvas: pointer drawing (mouse, touch, pen), violet ink on graph paper, pen width, eraser, undo (up to 50 strokes), clear, grid on/off.
- Photo upload: file picker, drag-and-drop onto the canvas area, paste from clipboard. Photo is drawn onto the canvas (scaled to fit) and kept as the generation input.
- Canvas actions: download the sketch as PNG (for the demo: draw, photograph, generate).
- "Try an example" row: three seeded sketches, one click loads sketch + known-good layout.

### 3.2 Live AI generation (needs the user's own Gemini key)
- Settings: API key field (password input, show/hide, clear), model picker — default `gemini-3.8-flash` (verified 23 Nov 2026 from Google's own model docs at ai.google.dev/gemini-api/docs/models: stable Flash model; `gemini-2.5-flash` is deprecated and routes to `gemini-3.5-flash-lite` from 1 Dec 2026), alternatives `gemini-3.6-flash`, `gemini-3.5-flash-lite`. Key stored in `localStorage` only.
- Test connection button: sends a one-word probe, reports success or the exact error.
- Generate: sends the sketch image (JPEG data URL) + a fixed system prompt + the JSON schema to `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, `responseMimeType: application/json`. Validates the reply; on invalid JSON or schema failure, retries once with the error named; on second failure, shows the error and keeps the previous layout untouched.
- Re-prompt: free-text box ("make it dark, bigger headline") — sends the current layout JSON + the instruction, returns a new layout, same validation and retry.
- Generation states: idle → sending → reading → done / failed, with a plain status line and a progress note ("Reading your sketch…"). No fake progress bar that pretends to know more than it does.

### 3.3 Block editor (manual fix-up)
- Block list mirrors the layout sections in order. Each block: kind dropdown (header, hero, cards, text, form, image, footer), heading, body text, button label + button target (section or none), card list editor for `cards` blocks (add / edit / remove cards: title + text), theme controls (accent colour choices: violet, ink black, green, warm orange; dark / light page).
- Reorder (up/down buttons), delete, add block (kind picker), duplicate block.
- Every change re-renders the preview immediately and marks the project dirty (unsaved-dot until saved).

### 3.4 Live preview
- Sandboxed `<iframe sandbox="allow-scripts" srcdoc="…">` rendering the generated page from the layout JSON. No model HTML ever enters it.
- Device toggle: desktop (full width) / phone (390px frame).
- Click-through: nav links jump to sections, CTA buttons scroll to the form or show a small in-page note, form submit shows "Thanks — this is a demo form, nothing was sent." Nothing leaves the browser.
- "Open in new tab" (blob URL) and "Copy link" is intentionally absent — there is no hosted URL; the export is the shareable artefact.

### 3.5 Export
- Copy HTML (clipboard, with a copied confirmation).
- Download `.html` — one self-contained file.
- Download `.zip` — `index.html` + `README.txt` (how to open it, what it is, what it is not).
- File name from the project title, slugified.

### 3.6 Projects
- New project (blank layout: header + hero + footer), Save (name inline), list with sketch thumbnail, updated time, open / duplicate / delete, export project JSON, import project JSON (file picker, validated).
- Autosave of the current working project to `localStorage` on every change (draft), so a refresh loses nothing.

### 3.7 Seeded examples (work with no key)
1. **Café landing page** — header, hero ("Morning, brewed slow."), 2 cards (Menu / Visit), signup form, footer.
2. **Pricing page** — header, hero, 3 pricing cards, text note, footer.
3. **Portfolio page** — header, hero, 3 work cards, text, footer.
Each example ships a hand-drawn-style SVG sketch (rough boxes, wobbly lines, handwritten labels) and a known-good layout JSON that the app loads verbatim. The example panel labels them clearly: "Example — no key needed. The layout is the saved result, not a live generation."

## 4. Data model

```jsonc
// Layout — the single source of truth. Versioned for future migration.
{
  "version": 1,
  "title": "Café landing page",
  "theme": { "dark": false, "accent": "#5B21B6" },
  "sections": [
    { "id": "s1", "kind": "header", "brand": "Slow Brew", "links": ["Menu", "Visit"] },
    { "id": "s2", "kind": "hero", "heading": "Morning, brewed slow.", "text": "Small café, big beans.", "cta": "See the menu", "ctaTarget": "cards" },
    { "id": "s3", "kind": "cards", "heading": "What we do", "items": [{ "title": "Menu", "text": "…" }, { "title": "Visit", "text": "…" }] },
    { "id": "s4", "kind": "form", "heading": "Get the weekly menu", "text": "One email a week.", "button": "Sign up" },
    { "id": "s5", "kind": "footer", "text": "Slow Brew — open 7am to 3pm." }
  ]
}
// kinds: header | hero | cards | text | form | image | footer
// image: { "kind": "image", "alt": "…", "caption": "…" } — renders a labelled placeholder block, never a fake photo.

// Project (localStorage: sketchapp.projects.v1 — array)
{ "id": "…", "name": "…", "layout": {…}, "sketch": "data:image/png;base64,… | null",
  "source": "example | ai | hand", "model": "gemini-3.8-flash | null",
  "createdAt": 0, "updatedAt": 0 }

// Settings (localStorage: sketchapp.settings.v1)
{ "apiKey": "…", "model": "gemini-3.8-flash" }
```

Validation rules (`validateLayout`): must be an object, `version` 1, `sections` a non-empty array (max 12), each section an object with a known `kind` and an `id`; strings trimmed and capped (heading 120 chars, text 600, button 40); unknown kinds are dropped with a warning, unknown fields stripped; `cards` items capped at 6, each with title + text; a layout with zero valid sections is invalid. Sanitisation never throws — it returns `{ layout, warnings[] }` or `{ error }`.

## 5. Architecture

Plain HTML/CSS/JS, no build step, no framework, no runtime dependencies. One static host serves it.

```
sketch-to-app/
  index.html        app shell (top bar, 3 columns, settings + export dialogs)
  styles.css        design tokens, layout, components (OKLCH-ish palette via hex, Sora)
  fonts/            Sora variable font, self-hosted (OFL)
  app.js            UI wiring: canvas, projects, editor, preview, export, settings
  lib/
    layout.js       validateLayout, sanitize, layoutToHtml, buildStandaloneHtml
    gemini.js       prompt builder, request body, response parser (fetch injected)
    zip.js          CRC32 + stored-entry ZIP writer (no JSZip dependency)
    examples.js     3 seeded sketches (SVG strings) + known-good layouts
  tests/test.js     node:test, no dependencies — layout, HTML, zip, gemini parsing
  screenshots/      desktop + mobile renders, read and fixed
  PLAN.md  README.md  LICENSE (MIT, Sivasai Boggu, 2026)
```

Why no Vite/React/Tailwind (the original plan's stack): a build step adds failure modes for a demo that must open from a static host and from disk, and the app's state is small enough for vanilla JS to stay readable. The trade is stated in the README. JSZip 3.10.2 (latest, 8 Sep 2026, verified via npm/jsDelivr) was considered and deliberately not used: a ~90-line stored-entry ZIP writer covers this app's export and keeps the page dependency-free and offline-capable.

## 6. Complete user flow, end to end

1. **Land.** Top bar: wordmark, project name, Save, Settings, Export. Left column: sketch canvas (graph paper) with pen/eraser/undo/clear, upload/drop/paste, and the three examples. Centre: preview iframe with desktop/phone toggle. Right: blocks panel + re-prompt box. A short line under the canvas says what to do first.
2. **Sketch or pick.** The user draws a wireframe (boxes, a headline squiggle, a button) or drops in a photo, or clicks an example. Example loads its sketch SVG into the canvas area and its layout into the preview at once — the app works fully with no key.
3. **Generate (key) or edit (no key).** With a key: press Generate, watch the status line, the preview rebuilds from the model's layout, and the blocks panel fills in. Without a key: Generate shows a plain panel — "Add your Gemini API key in Settings to generate from a sketch. Your key stays in this browser." — and the user edits the example/hand-built blocks instead.
4. **Fix it by hand.** In the blocks panel the user renames a heading, swaps a card, moves the form above the cards, deletes the footer, flips the page dark. Preview updates on each keystroke (debounced for text).
5. **Re-prompt (key).** "Make it dark, bigger headline" → new layout → preview updates → blocks panel updates. If the model returns junk, the app retries once, then says so and keeps the old layout.
6. **Check the phone view.** Toggle to 390px, scroll the preview, confirm stacking. Toggle back.
7. **Export.** Download the zip (or copy the HTML), open `index.html` from disk — it renders with no network. Save the project so it is there after a refresh.
8. **Come back later.** Project list → open → sketch, layout and log are as left. Import a project JSON a teammate sent, edit, export again.

## 7. Error and empty states (all plain words)

- No key + Generate: "Add your Gemini API key in Settings…" with a link to Google AI Studio (aistudio.google.com) and the note that the free tier is enough for this.
- Bad key (400/401): "That key was rejected by Google. Check it in Settings — keys start with AIza…"
- Quota / rate limit (429): "Google says the free quota is used up for now. Try again in a minute, or check your quota in AI Studio."
- Network failure: "Could not reach Google. Check your connection and try again."
- Model returns invalid layout (twice): "The model sent back a layout this app cannot use. Your page is unchanged — try again, or fix the blocks by hand."
- No sketch drawn and no photo: Generate is disabled with the hint "Draw something or add a photo first."
- Empty project list: "No saved projects yet — generate one or load an example, then press Save."
- Form in a generated page: submits nowhere; shows "Thanks — this is a demo form, nothing was sent."

## 8. 2-minute demo script

- **0:00–0:20** — Draw live on the canvas: a header bar, a big headline box, two cards, a button. Say what each box is as you draw it.
- **0:20–0:45** — Paste the key (already in Settings from rehearsal) and press Generate. Status line: "Reading your sketch…" then the page appears.
- **0:45–1:15** — Click the button, scroll the preview, flip to the phone view and back. The page works.
- **1:15–1:45** — Re-prompt once: "make it dark, bigger headline". Show the update, then fix one heading by hand in the blocks panel to show manual control.
- **1:45–2:00** — Download the zip, open it from disk to prove it is real code. Close: "Sketch in, website out."
- **If live generation fails on stage:** click the café example — same flow, known-good layout, no key needed — and say so out loud. The demo never depends on one live call.

## 9. Quality bar

- Tests: `node --test tests/test.js`, real assertions, 0 failures, exact count reported.
- Screenshots: headless Chromium at 1280px and 390px, `file://` URLs, zero horizontal overflow, read by the builder and fixed.
- Design: violet `#5B21B6` + Sora only; one accent, under 10% of any screen; no gradients/glows; plain copy; no fake data; no dead controls.
- README + MIT LICENSE (Sivasai Boggu, 2026). Git: human-style commits, local only — never push.

## 10. Honest limits

- Static front-end only. No backend, database, login, payments, or real data. Forms submit nowhere.
- The model reads boxes and labels, not handwriting in general — messy writing, arrows and ambiguous boxes can be misread. The block editor is the fix.
- Output is a starting point, not pixel-perfect. Colours and spacing come from the layout theme, not from the sketch.
- Live generation needs a free Gemini API key and internet. Everything else works offline.
- Generated pages use a labelled placeholder block for images — the app never invents a photo.

## 11. Launch checklist / v2 ideas

- [ ] Tests pass, screenshots read, README honest, zip export verified by unzipping.
- [ ] Example 1 generates identically from its seeded layout on a fresh load.
- [ ] Key flow tested with a bad key (shows the plain error) — live good-key test is Siva's, in his browser.
- V2: drag blocks to reorder; sketch-box annotation (draw a box, label it "hero"); multi-page layouts; one-click deploy to GitHub Pages; image placeholders from Unsplash by keyword; shareable project links; model choice per generation.
