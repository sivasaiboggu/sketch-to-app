/* Tests for Sketch to App — run with: node --test tests/test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layout = require('../lib/layout.js');
const zip = require('../lib/zip.js');
const gemini = require('../lib/gemini.js');
const examples = require('../lib/examples.js');

// ---------- layout validation ----------
test('validateLayout accepts a good layout and strips unknown fields', () => {
  const { layout: out, warnings, error } = layout.validateLayout({
    version: 1, title: '  Test page  ', theme: { dark: false, accent: '#5B21B6' },
    sections: [
      { id: 'a', kind: 'hero', heading: 'Hi', text: 'there', cta: 'Go', extra: 'drop me' },
      { id: 'b', kind: 'footer', text: 'bye' }
    ]
  });
  assert.equal(error, undefined);
  assert.equal(out.title, 'Test page');
  assert.equal(out.sections.length, 2);
  assert.equal(out.sections[0].extra, undefined);
  assert.deepEqual(warnings, []);
});

test('validateLayout drops unknown kinds and reports them, keeps the rest', () => {
  const { layout: out, warnings } = layout.validateLayout({
    sections: [
      { id: 'a', kind: 'hero', heading: 'Hi' },
      { id: 'b', kind: 'carousel', heading: 'nope' },
      { id: 'c', kind: 'footer', text: 'end' }
    ]
  });
  assert.equal(out.sections.length, 2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /carousel/);
});

test('validateLayout rejects empty / non-object / section-less input', () => {
  assert.ok(layout.validateLayout(null).error);
  assert.ok(layout.validateLayout('nope').error);
  assert.ok(layout.validateLayout({ sections: [] }).error);
  assert.ok(layout.validateLayout({ sections: [{ kind: 'mystery' }] }).error);
});

test('validateLayout caps strings, cards and sections', () => {
  const { layout: out } = layout.validateLayout({
    title: 'x'.repeat(200),
    sections: Array.from({ length: 20 }, (_, i) => ({
      id: 's' + i, kind: 'cards', heading: 'h'.repeat(300),
      items: Array.from({ length: 9 }, () => ({ title: 't', text: 'x' }))
    }))
  });
  assert.equal(out.sections.length, 12);
  assert.equal(out.title.length, 80);
  assert.equal(out.sections[0].heading.length, 120);
  assert.equal(out.sections[0].items.length, 6);
});

test('validateLayout resets a bad accent and fills defaults', () => {
  const { layout: out, warnings } = layout.validateLayout({
    theme: { dark: true, accent: 'not-a-colour' },
    sections: [{ kind: 'hero', heading: 'Hi' }]
  });
  assert.equal(out.theme.accent, '#5B21B6');
  assert.equal(out.theme.dark, true);
  assert.equal(warnings.length, 1);
  assert.equal(out.sections[0].id.length > 0, true);
});

// ---------- HTML generation ----------
test('layoutToHtml renders every section kind and escapes input', () => {
  const html = layout.layoutToHtml({
    title: 'Test <b>&</b>',
    theme: { dark: false, accent: '#5B21B6' },
    sections: [
      { id: '1', kind: 'header', brand: 'Brand', links: ['Home'] },
      { id: '2', kind: 'hero', heading: 'Big <script>alert(1)</script>', text: 't', cta: 'Go', ctaTarget: '' },
      { id: '3', kind: 'cards', heading: 'Cards', items: [{ title: 'A', text: 'a' }] },
      { id: '4', kind: 'text', heading: 'T', text: 'para' },
      { id: '5', kind: 'form', heading: 'Join', text: '', button: 'Sign up' },
      { id: '6', kind: 'image', alt: 'A sketch of a cat', caption: 'cap' },
      { id: '7', kind: 'footer', text: 'end' }
    ]
  });
  assert.match(html, /<title>Test &lt;b&gt;&amp;&lt;\/b&gt;<\/title>/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /pg-header/);
  assert.match(html, /pg-hero/);
  assert.match(html, /pg-card-grid/);
  assert.match(html, /pg-form/);
  assert.match(html, /Image: A sketch of a cat/);
  assert.match(html, /demo form, nothing was sent/);
  assert.match(html, /#5B21B6/);
});

test('layoutToHtml dark theme flips colours and throws on invalid layout', () => {
  const html = layout.layoutToHtml({
    title: 'D', theme: { dark: true, accent: '#111111' },
    sections: [{ id: '1', kind: 'hero', heading: 'Hi', text: '', cta: '', ctaTarget: '' }]
  });
  assert.match(html, /#17141f/);
  assert.throws(() => layout.layoutToHtml({ sections: [] }), /no sections/);
});

test('slugify makes safe file names', () => {
  assert.equal(layout.slugify('Slow Brew — Café!'), 'slow-brew-caf');
  assert.equal(layout.slugify(''), 'page');
  assert.equal(layout.slugify('!!!'), 'page');
});

test('blankLayout has header, hero and footer', () => {
  const b = layout.blankLayout('Mine');
  assert.equal(b.title, 'Mine');
  assert.deepEqual(b.sections.map(s => s.kind), ['header', 'hero', 'footer']);
});

// ---------- ZIP writer ----------
test('crc32 matches the known check value', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(zip.crc32(bytes), 0xCBF43926);
});

test('createZip produces a zip that node can read back', async () => {
  const AdmLike = zip.createZip([
    { name: 'index.html', content: '<h1>hi</h1>' },
    { name: 'README.txt', content: 'hello' }
  ]);
  assert.equal(AdmLike[0], 0x50); // 'P'
  assert.equal(AdmLike[1], 0x4B); // 'K'
  const tmp = path.join(__dirname, 'tmp-test.zip');
  fs.writeFileSync(tmp, AdmLike);
  const { execFileSync } = require('node:child_process');
  const listing = execFileSync('python3', ['-c',
    "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(z.namelist()); print(z.read('index.html').decode()); print(z.read('README.txt').decode()); assert z.testzip() is None",
    tmp], { encoding: 'utf8' });
  assert.match(listing, /index\.html/);
  assert.match(listing, /<h1>hi<\/h1>/);
  fs.unlinkSync(tmp);
});

test('createZip rejects empty input and unnamed entries', () => {
  assert.throws(() => zip.createZip([]), /No files/);
  assert.throws(() => zip.createZip([{ content: 'x' }]), /needs a name/);
});

// ---------- Gemini helpers ----------
test('buildRequestBody puts the image inline and asks for JSON', () => {
  const body = gemini.buildRequestBody('gemini-3.8-flash',
    'prompt text', 'data:image/jpeg;base64,abcd1234');
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.equal(body.contents[0].parts[0].text, 'prompt text');
  assert.equal(body.contents[0].parts[1].inline_data.mime_type, 'image/jpeg');
  assert.equal(body.contents[0].parts[1].inline_data.data, 'abcd1234');
});

test('buildRequestBody throws on a bad image data URL', () => {
  assert.throws(() => gemini.buildRequestBody('gemini-3.8-flash', 'p', 'not-a-data-url'), /data URL/);
});

test('parseLayoutJson handles plain JSON and fenced JSON', () => {
  assert.deepEqual(gemini.parseLayoutJson('{"a":1}'), { a: 1 });
  assert.deepEqual(gemini.parseLayoutJson('```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(gemini.parseLayoutJson('note\n{"a":3}\nend'), { a: 3 });
  assert.throws(() => gemini.parseLayoutJson('not json at all'), /valid JSON/);
});

test('extractText reads the candidate text and complains when empty', () => {
  const ok = { candidates: [{ content: { parts: [{ text: '{"x":1}' }] } }] };
  assert.equal(gemini.extractText(ok), '{"x":1}');
  assert.throws(() => gemini.extractText({ candidates: [] }), /no result/);
  assert.throws(() => gemini.extractText({ candidates: [{ content: { parts: [] } }] }), /empty/);
});

test('friendlyError names the fix for bad keys, quota and unknown models', () => {
  assert.match(gemini.friendlyError(401, ''), /key was rejected/);
  assert.match(gemini.friendlyError(429, ''), /quota/);
  assert.match(gemini.friendlyError(404, ''), /model name/);
  assert.match(gemini.friendlyError(500, 'boom'), /500/);
});

test('callGemini posts to the right model URL and returns parsed JSON', async () => {
  let seenUrl, seenBody;
  const fakeFetch = async (url, opts) => {
    seenUrl = url; seenBody = JSON.parse(opts.body);
    return { ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1}' }] } }] }) };
  };
  const out = await gemini.callGemini({ apiKey: 'AIza-test', model: 'gemini-3.8-flash', prompt: 'p' }, fakeFetch);
  assert.deepEqual(out, { version: 1 });
  assert.match(seenUrl, /gemini-3\.8-flash:generateContent\?key=AIza-test/);
  assert.equal(seenBody.generationConfig.responseMimeType, 'application/json');
});

test('callGemini turns a 401 into the plain bad-key message', async () => {
  const fakeFetch = async () => ({ ok: false, status: 401, text: async () => 'bad key' });
  await assert.rejects(
    () => gemini.callGemini({ apiKey: 'nope', model: 'gemini-3.8-flash', prompt: 'p' }, fakeFetch),
    /key was rejected/);
});

test('callGemini requires a key and falls back to the default model', async () => {
  await assert.rejects(() => gemini.callGemini({ apiKey: '', prompt: 'p' }, async () => ({})), /key/);
  let seenUrl;
  const fakeFetch = async (url) => {
    seenUrl = url;
    return { ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) };
  };
  await gemini.callGemini({ apiKey: 'k', model: 'gemini-9-nope', prompt: 'p' }, fakeFetch);
  assert.match(seenUrl, /gemini-3\.8-flash/);
});

test('buildRepromptPrompt includes the current layout and the instruction', () => {
  const p = gemini.buildRepromptPrompt({ version: 1, sections: [] }, 'make it dark');
  assert.match(p, /make it dark/);
  assert.match(p, /"version":1/);
});

// ---------- examples ----------
test('all three examples are valid layouts with matching SVG sketches', () => {
  assert.equal(examples.EXAMPLES.length, 3);
  for (const ex of examples.EXAMPLES) {
    assert.ok(ex.name && ex.blurb && ex.sketchSvg);
    assert.match(ex.sketchSvg, /^<svg/);
    assert.match(ex.sketchSvg, /<\/svg>$/);
    const { layout: out, error } = layout.validateLayout(ex.layout);
    assert.equal(error, undefined, ex.id + ': ' + error);
    assert.ok(out.sections.length >= 3);
    const html = layout.layoutToHtml(ex.layout);
    assert.match(html, /<!doctype html>/);
    const url = examples.svgToDataUrl(ex.sketchSvg);
    assert.ok(url.startsWith('data:image/svg+xml'));
  }
});

test('example layouts are distinct from each other', () => {
  const titles = examples.EXAMPLES.map(e => e.layout.title);
  assert.equal(new Set(titles).size, 3);
});
