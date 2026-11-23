/* Sketch to App — UI wiring. No key is bundled; live generation only
   runs with a key the user pastes in Settings (localStorage only). */
(function () {
  'use strict';

  var L = window.SketchLayout;
  var G = window.SketchGemini;
  var Z = window.SketchZip;
  var EX = window.SketchExamples;

  var LS_SETTINGS = 'sketchapp.settings.v1';
  var LS_PROJECTS = 'sketchapp.projects.v1';
  var LS_DRAFT = 'sketchapp.draft.v1';

  function $(id) { return document.getElementById(id); }
  function loadJson(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function saveJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/blocked: keep working in memory */ } }
  function deepCopy(v) { return JSON.parse(JSON.stringify(v)); }
  function nowLabel() { return new Date().toLocaleString(); }

  // ---------- state ----------
  var settings = loadJson(LS_SETTINGS, { apiKey: '', model: G.DEFAULT_MODEL });
  if (G.MODELS.indexOf(settings.model) === -1) settings.model = G.DEFAULT_MODEL;

  var layout = L.blankLayout('Untitled page');
  var currentProjectId = null;
  var source = 'hand';       // hand | example | ai
  var modelUsed = null;
  var dirty = false;
  var previewTimer = null;
  var draftTimer = null;

  // Restore draft (layout + name) if one exists.
  var draft = loadJson(LS_DRAFT, null);
  if (draft && draft.layout) {
    var v = L.validateLayout(draft.layout);
    if (!v.error) { layout = v.layout; if (draft.name) layout.title = draft.name; source = draft.source || 'hand'; modelUsed = draft.model || null; }
  }

  // ---------- canvas ----------
  var canvas = $('sketchCanvas');
  var ctx = canvas.getContext('2d');
  var strokes = [];
  var baseImage = null; // HTMLImageElement drawn under strokes, or null
  var drawing = false;
  var currentStroke = null;
  var tool = 'pen';

  function drawGrid() {
    if (!$('chkGrid').checked) return;
    ctx.strokeStyle = '#EFEAF8'; ctx.lineWidth = 1;
    for (var x = 20; x < canvas.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (var y = 20; y < canvas.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  }
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FDFCFE'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    if (baseImage) ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    strokes.forEach(function (s) {
      ctx.strokeStyle = s.tool === 'eraser' ? '#FDFCFE' : '#5B21B6';
      ctx.lineWidth = s.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      s.points.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    });
  }
  function canvasPos(e) {
    var r = canvas.getBoundingClientRect();
    var cx = (e.clientX - r.left) * (canvas.width / r.width);
    var cy = (e.clientY - r.top) * (canvas.height / r.height);
    return { x: cx, y: cy };
  }
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    currentStroke = { tool: tool, width: tool === 'eraser' ? 18 : parseInt($('penWidth').value, 10), points: [canvasPos(e)] };
    strokes.push(currentStroke);
    redraw();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drawing || !currentStroke) return;
    currentStroke.points.push(canvasPos(e));
    redraw();
  });
  function endStroke() { drawing = false; currentStroke = null; markDirty(); }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  function hasSketch() { return strokes.length > 0 || !!baseImage; }
  function sketchDataUrl() { return canvas.toDataURL('image/jpeg', 0.85); }

  function setTool(t) {
    tool = t;
    $('toolPen').classList.toggle('active', t === 'pen');
    $('toolEraser').classList.toggle('active', t === 'eraser');
    $('toolPen').setAttribute('aria-pressed', String(t === 'pen'));
    $('toolEraser').setAttribute('aria-pressed', String(t === 'eraser'));
  }
  $('toolPen').addEventListener('click', function () { setTool('pen'); });
  $('toolEraser').addEventListener('click', function () { setTool('eraser'); });
  $('btnUndo').addEventListener('click', function () { strokes.pop(); redraw(); markDirty(); });
  $('btnClear').addEventListener('click', function () {
    strokes = []; baseImage = null; redraw(); markDirty();
    setStatus($('genStatus'), 'Canvas cleared. Draw or upload a sketch to start.');
  });
  $('chkGrid').addEventListener('change', redraw);

  function loadImageFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) { setStatus($('genStatus'), 'That file is not an image.', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        // Fit the photo onto the canvas, keeping its proportions.
        var scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        var w = img.width * scale, h = img.height * scale;
        var off = document.createElement('canvas');
        off.width = canvas.width; off.height = canvas.height;
        var octx = off.getContext('2d');
        octx.fillStyle = '#FDFCFE'; octx.fillRect(0, 0, off.width, off.height);
        octx.drawImage(img, (off.width - w) / 2, (off.height - h) / 2, w, h);
        var fitted = new Image();
        fitted.onload = function () { baseImage = fitted; redraw(); markDirty(); setStatus($('genStatus'), 'Photo loaded. Press Generate when ready.'); };
        fitted.src = off.toDataURL('image/png');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  $('filePhoto').addEventListener('change', function (e) { loadImageFile(e.target.files[0]); e.target.value = ''; });
  var dropZone = $('dropZone');
  ['dragenter', 'dragover'].forEach(function (ev) { dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.add('dragging'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.remove('dragging'); }); });
  dropZone.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) loadImageFile(e.dataTransfer.files[0]); });
  document.addEventListener('paste', function (e) {
    var items = (e.clipboardData || window.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') === 0) { loadImageFile(items[i].getAsFile()); return; }
    }
  });
  $('btnDownloadSketch').addEventListener('click', function () {
    canvas.toBlob(function (blob) { downloadBlob(blob, L.slugify(layout.title) + '-sketch.png'); }, 'image/png');
  });

  // ---------- status / meta ----------
  function setStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }
  function renderMeta() {
    $('metaSource').textContent = source === 'ai' ? 'Generated by Gemini' : source === 'example' ? 'Seeded example' : 'Hand-built';
    $('metaModel').textContent = modelUsed || '—';
    $('metaUpdated').textContent = nowLabel();
  }
  function markDirty() {
    dirty = true;
    $('dirtyDot').hidden = false;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 600);
  }
  function saveDraft() {
    saveJson(LS_DRAFT, { name: layout.title, layout: layout, source: source, model: modelUsed });
    dirty = false;
    $('dirtyDot').hidden = true;
  }

  // ---------- preview ----------
  function renderPreview() {
    try {
      $('preview').srcdoc = L.layoutToHtml(layout);
    } catch (e) {
      setStatus($('genStatus'), 'This layout cannot be shown: ' + e.message, 'error');
    }
  }
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () { renderPreview(); markDirty(); }, 150);
  }

  // ---------- block editor ----------
  function fieldInput(label, value, onInput, multiline) {
    var lab = document.createElement('label');
    lab.textContent = label;
    var input = multiline ? document.createElement('textarea') : document.createElement('input');
    if (!multiline) input.type = 'text';
    input.value = value || '';
    input.addEventListener('input', function () { onInput(input.value); schedulePreview(); });
    lab.appendChild(input);
    return lab;
  }
  function renderBlocks() {
    var list = $('blockList');
    list.innerHTML = '';
    layout.sections.forEach(function (section, idx) {
      var box = document.createElement('div');
      box.className = 'block';
      var head = document.createElement('div');
      head.className = 'block-head';
      var kindEl = document.createElement('span');
      kindEl.className = 'block-kind';
      kindEl.textContent = section.kind + ' · ' + (idx + 1);
      head.appendChild(kindEl);
      var kindSel = document.createElement('select');
      kindSel.setAttribute('aria-label', 'Block type');
      L.KINDS.forEach(function (k) {
        var o = document.createElement('option');
        o.value = k; o.textContent = k;
        if (k === section.kind) o.selected = true;
        kindSel.appendChild(o);
      });
      kindSel.addEventListener('change', function () {
        var fresh = { id: section.id, kind: kindSel.value };
        if (kindSel.value === 'header') { fresh.brand = 'My site'; fresh.links = []; }
        if (kindSel.value === 'hero') { fresh.heading = 'Headline'; fresh.text = ''; fresh.cta = ''; fresh.ctaTarget = ''; }
        if (kindSel.value === 'cards') { fresh.heading = ''; fresh.items = [{ title: 'Card', text: '' }]; }
        if (kindSel.value === 'text') { fresh.heading = ''; fresh.text = 'Some text goes here.'; }
        if (kindSel.value === 'form') { fresh.heading = 'Stay in touch'; fresh.text = ''; fresh.button = 'Sign up'; }
        if (kindSel.value === 'image') { fresh.alt = 'Image'; fresh.caption = ''; }
        if (kindSel.value === 'footer') { fresh.text = ''; }
        layout.sections[idx] = fresh;
        renderBlocks(); renderPreview(); markDirty();
      });
      head.appendChild(kindSel);
      var actions = document.createElement('div');
      actions.className = 'block-actions';
      function actBtn(text, title, fn, disabled) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = text; b.title = title; b.disabled = !!disabled;
        b.addEventListener('click', fn);
        actions.appendChild(b);
      }
      actBtn('↑', 'Move up', function () {
        if (idx === 0) return;
        var t = layout.sections[idx - 1]; layout.sections[idx - 1] = section; layout.sections[idx] = t;
        renderBlocks(); renderPreview(); markDirty();
      }, idx === 0);
      actBtn('↓', 'Move down', function () {
        if (idx === layout.sections.length - 1) return;
        var t = layout.sections[idx + 1]; layout.sections[idx + 1] = section; layout.sections[idx] = t;
        renderBlocks(); renderPreview(); markDirty();
      }, idx === layout.sections.length - 1);
      actBtn('⧉', 'Duplicate block', function () {
        var copy = deepCopy(section); copy.id = L.uid();
        layout.sections.splice(idx + 1, 0, copy);
        renderBlocks(); renderPreview(); markDirty();
      });
      actBtn('×', 'Delete block', function () {
        if (layout.sections.length <= 1) { setStatus($('genStatus'), 'A page needs at least one block.', 'error'); return; }
        layout.sections.splice(idx, 1);
        renderBlocks(); renderPreview(); markDirty();
      });
      head.appendChild(actions);
      box.appendChild(head);

      if (section.kind === 'header') {
        box.appendChild(fieldInput('Brand', section.brand, function (v) { section.brand = v; }));
        box.appendChild(fieldInput('Links (comma separated)', (section.links || []).join(', '), function (v) {
          section.links = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        }));
      } else if (section.kind === 'hero') {
        box.appendChild(fieldInput('Heading', section.heading, function (v) { section.heading = v; }));
        box.appendChild(fieldInput('Supporting text', section.text, function (v) { section.text = v; }, true));
        box.appendChild(fieldInput('Button label', section.cta, function (v) { section.cta = v; }));
      } else if (section.kind === 'cards') {
        box.appendChild(fieldInput('Section heading', section.heading, function (v) { section.heading = v; }));
        section.items.forEach(function (item, ci) {
          var ce = document.createElement('div');
          ce.className = 'card-edit';
          ce.appendChild(fieldInput('Card ' + (ci + 1) + ' title', item.title, function (v) { item.title = v; }));
          ce.appendChild(fieldInput('Card ' + (ci + 1) + ' text', item.text, function (v) { item.text = v; }, true));
          var row = document.createElement('div');
          row.className = 'block-actions';
          var del = document.createElement('button');
          del.type = 'button'; del.textContent = 'Remove card';
          del.disabled = section.items.length <= 1;
          del.addEventListener('click', function () {
            section.items.splice(ci, 1); renderBlocks(); renderPreview(); markDirty();
          });
          row.appendChild(del);
          ce.appendChild(row);
          box.appendChild(ce);
        });
        var add = document.createElement('button');
        add.type = 'button'; add.className = 'btn btn-ghost btn-small'; add.textContent = 'Add card';
        add.disabled = section.items.length >= 6;
        add.addEventListener('click', function () {
          section.items.push({ title: 'New card', text: '' });
          renderBlocks(); renderPreview(); markDirty();
        });
        box.appendChild(add);
      } else if (section.kind === 'text') {
        box.appendChild(fieldInput('Heading', section.heading, function (v) { section.heading = v; }));
        box.appendChild(fieldInput('Text', section.text, function (v) { section.text = v; }, true));
      } else if (section.kind === 'form') {
        box.appendChild(fieldInput('Heading', section.heading, function (v) { section.heading = v; }));
        box.appendChild(fieldInput('Text', section.text, function (v) { section.text = v; }, true));
        box.appendChild(fieldInput('Button label', section.button, function (v) { section.button = v; }));
      } else if (section.kind === 'image') {
        box.appendChild(fieldInput('What the picture should show', section.alt, function (v) { section.alt = v; }));
        box.appendChild(fieldInput('Caption', section.caption, function (v) { section.caption = v; }));
        var note = document.createElement('p');
        note.className = 'fine';
        note.textContent = 'Images render as a labelled placeholder — this app never invents a photo.';
        box.appendChild(note);
      } else if (section.kind === 'footer') {
        box.appendChild(fieldInput('Footer text', section.text, function (v) { section.text = v; }));
      }
      list.appendChild(box);
    });
  }
  $('btnAddBlock').addEventListener('click', function () {
    var kind = $('newBlockKind').value;
    var fresh = { id: L.uid(), kind: kind };
    if (kind === 'hero') { fresh.heading = 'New headline'; fresh.text = ''; fresh.cta = ''; fresh.ctaTarget = ''; }
    if (kind === 'cards') { fresh.heading = ''; fresh.items = [{ title: 'Card', text: '' }]; }
    if (kind === 'text') { fresh.heading = ''; fresh.text = 'Some text goes here.'; }
    if (kind === 'form') { fresh.heading = 'Stay in touch'; fresh.text = ''; fresh.button = 'Sign up'; }
    if (kind === 'image') { fresh.alt = 'Image'; fresh.caption = ''; }
    if (kind === 'footer') { fresh.text = ''; }
    layout.sections.push(fresh);
    renderBlocks(); renderPreview(); markDirty();
  });

  // ---------- theme ----------
  function renderSwatches() {
    var wrap = $('accentSwatches');
    wrap.innerHTML = '';
    L.ACCENTS.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch' + (layout.theme.accent === a ? ' active' : '');
      b.style.background = a;
      b.setAttribute('aria-label', 'Accent ' + a);
      b.title = a;
      b.addEventListener('click', function () {
        layout.theme.accent = a;
        renderSwatches(); renderPreview(); markDirty();
      });
      wrap.appendChild(b);
    });
  }
  $('chkDark').addEventListener('change', function () {
    layout.theme.dark = $('chkDark').checked;
    renderPreview(); markDirty();
  });

  // ---------- examples ----------
  function renderExamples() {
    var list = $('exampleList');
    list.innerHTML = '';
    EX.EXAMPLES.forEach(function (ex) {
      var card = document.createElement('button');
      card.type = 'button'; card.className = 'example-card';
      var img = document.createElement('img');
      img.src = EX.svgToDataUrl(ex.sketchSvg);
      img.alt = 'Hand-drawn sketch of the ' + ex.name;
      var text = document.createElement('span');
      var strong = document.createElement('strong');
      strong.textContent = ex.name;
      var span = document.createElement('span');
      span.textContent = ex.blurb;
      text.appendChild(strong); text.appendChild(span);
      card.appendChild(img); card.appendChild(text);
      card.addEventListener('click', function () { loadExample(ex); });
      list.appendChild(card);
    });
  }
  function loadExample(ex) {
    var img = new Image();
    img.onload = function () { baseImage = img; strokes = []; redraw(); };
    img.src = EX.svgToDataUrl(ex.sketchSvg);
    var v = L.validateLayout(ex.layout);
    layout = v.layout;
    source = 'example'; modelUsed = null;
    $('projectName').value = layout.title;
    $('chkDark').checked = layout.theme.dark;
    renderSwatches(); renderBlocks(); renderPreview(); renderMeta(); markDirty();
    setStatus($('genStatus'), 'Example loaded: ' + ex.name + '. Edit the blocks, or press Generate with your own sketch.', 'ok');
  }

  // ---------- generation ----------
  function applyLayout(raw, newSource, newModel) {
    var v = L.validateLayout(raw);
    if (v.error) return { error: v.error };
    layout = v.layout;
    source = newSource; modelUsed = newModel;
    $('projectName').value = layout.title;
    $('chkDark').checked = layout.theme.dark;
    renderSwatches(); renderBlocks(); renderPreview(); renderMeta(); markDirty();
    if (v.warnings.length) setStatus($('genStatus'), 'Page generated, with fixes: ' + v.warnings.join(' '), 'ok');
    return { warnings: v.warnings };
  }

  async function generateFromSketch() {
    if (!hasSketch()) { setStatus($('genStatus'), 'Draw something or add a photo first.', 'error'); return; }
    if (!settings.apiKey) {
      $('keyNotice').hidden = false;
      setStatus($('genStatus'), 'Add your Gemini API key in Settings to generate from a sketch — or load an example, which needs no key.', 'error');
      return;
    }
    $('keyNotice').hidden = true;
    var btn = $('btnGenerate');
    btn.disabled = true;
    setStatus($('genStatus'), 'Reading your sketch…');
    try {
      var raw = await G.callGemini({ apiKey: settings.apiKey, model: settings.model, prompt: G.buildGeneratePrompt(), imageDataUrl: sketchDataUrl() });
      var res = applyLayout(raw, 'ai', settings.model);
      if (res.error) throw new Error(res.error);
      setStatus($('genStatus'), 'Page generated from your sketch. Edit the blocks or re-prompt to change it.', 'ok');
    } catch (e) {
      // One retry with the failure named, then stop and say so.
      if (/valid JSON|cannot use|no usable/i.test(e.message)) {
        setStatus($('genStatus'), 'First attempt could not be used — trying once more…');
        try {
          var raw2 = await G.callGemini({
            apiKey: settings.apiKey, model: settings.model,
            prompt: G.buildGeneratePrompt() + '\nYour previous answer could not be used because: ' + e.message + ' Return only valid JSON.',
            imageDataUrl: sketchDataUrl()
          });
          var res2 = applyLayout(raw2, 'ai', settings.model);
          if (res2.error) throw new Error(res2.error);
          setStatus($('genStatus'), 'Page generated from your sketch on the second try.', 'ok');
        } catch (e2) {
          setStatus($('genStatus'), 'Generation failed: ' + e2.message + ' Your page is unchanged.', 'error');
        }
      } else {
        setStatus($('genStatus'), 'Generation failed: ' + e.message, 'error');
      }
    } finally {
      btn.disabled = false;
    }
  }
  $('btnGenerate').addEventListener('click', generateFromSketch);

  $('btnReprompt').addEventListener('click', async function () {
    var instruction = $('repromptInput').value.trim();
    if (!instruction) { setStatus($('repromptStatus'), 'Write what to change first.', 'error'); return; }
    if (!settings.apiKey) {
      setStatus($('repromptStatus'), 'Re-prompting needs your Gemini API key — add it in Settings.', 'error');
      return;
    }
    var btn = $('btnReprompt');
    btn.disabled = true;
    setStatus($('repromptStatus'), 'Applying your change…');
    try {
      var raw = await G.callGemini({ apiKey: settings.apiKey, model: settings.model, prompt: G.buildRepromptPrompt(layout, instruction) });
      var res = applyLayout(raw, 'ai', settings.model);
      if (res.error) throw new Error(res.error);
      setStatus($('repromptStatus'), 'Change applied.', 'ok');
      $('repromptInput').value = '';
    } catch (e) {
      setStatus($('repromptStatus'), 'Could not apply that change: ' + e.message + ' Your page is unchanged.', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- preview device + open ----------
  function setView(phone) {
    $('viewDesktop').classList.toggle('active', !phone);
    $('viewPhone').classList.toggle('active', phone);
    $('viewDesktop').setAttribute('aria-pressed', String(!phone));
    $('viewPhone').setAttribute('aria-pressed', String(phone));
    $('preview').classList.toggle('phone', phone);
  }
  $('viewDesktop').addEventListener('click', function () { setView(false); });
  $('viewPhone').addEventListener('click', function () { setView(true); });
  $('btnOpenTab').addEventListener('click', function () {
    var blob = new Blob([L.layoutToHtml(layout)], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  });

  // ---------- export ----------
  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportReadme() {
    return 'Sketch to App — ' + layout.title + '\n\n' +
      'Open index.html in any browser. It is one self-contained file and needs no network.\n\n' +
      'What this is: a static front-end generated from a hand-drawn wireframe.\n' +
      'What it is not: there is no backend, database, login, or real form delivery.\n' +
      'Forms in the page are demos — they send nothing.\n';
  }
  $('btnCopyHtml').addEventListener('click', async function () {
    var html = L.layoutToHtml(layout);
    try {
      await navigator.clipboard.writeText(html);
      setStatus($('exportStatus'), 'HTML copied to the clipboard.', 'ok');
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = html; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); setStatus($('exportStatus'), 'HTML copied to the clipboard.', 'ok'); }
      catch (e2) { setStatus($('exportStatus'), 'Copy failed — use Download .html instead.', 'error'); }
      ta.remove();
    }
  });
  $('btnDownloadHtml').addEventListener('click', function () {
    downloadBlob(new Blob([L.layoutToHtml(layout)], { type: 'text/html' }), L.slugify(layout.title) + '.html');
    setStatus($('exportStatus'), 'Downloaded ' + L.slugify(layout.title) + '.html', 'ok');
  });
  $('btnDownloadZip').addEventListener('click', function () {
    var bytes = Z.createZip([
      { name: 'index.html', content: L.layoutToHtml(layout) },
      { name: 'README.txt', content: exportReadme() }
    ]);
    downloadBlob(new Blob([bytes], { type: 'application/zip' }), L.slugify(layout.title) + '.zip');
    setStatus($('exportStatus'), 'Downloaded ' + L.slugify(layout.title) + '.zip (index.html + README.txt).', 'ok');
  });

  // ---------- projects ----------
  function listProjects() { return loadJson(LS_PROJECTS, []); }
  function saveProjectList(list) { saveJson(LS_PROJECTS, list); }
  function currentSketchThumb() {
    try { return canvas.toDataURL('image/jpeg', 0.5); } catch (e) { return null; }
  }
  $('btnSave').addEventListener('click', function () {
    var list = listProjects();
    var now = Date.now();
    var existing = list.find(function (p) { return p.id === currentProjectId; });
    if (existing) {
      existing.name = layout.title; existing.layout = deepCopy(layout);
      existing.sketch = currentSketchThumb(); existing.source = source; existing.model = modelUsed; existing.updatedAt = now;
    } else {
      currentProjectId = L.uid();
      list.unshift({ id: currentProjectId, name: layout.title, layout: deepCopy(layout), sketch: currentSketchThumb(), source: source, model: modelUsed, createdAt: now, updatedAt: now });
    }
    saveProjectList(list);
    saveDraft();
    setStatus($('genStatus'), 'Saved "' + layout.title + '".', 'ok');
  });
  function openProject(p) {
    var v = L.validateLayout(p.layout);
    if (v.error) { setStatus($('projectStatus'), 'That project could not be opened: ' + v.error, 'error'); return; }
    layout = v.layout;
    currentProjectId = p.id;
    source = p.source || 'hand'; modelUsed = p.model || null;
    $('projectName').value = layout.title;
    $('chkDark').checked = layout.theme.dark;
    strokes = [];
    if (p.sketch) {
      var img = new Image();
      img.onload = function () { baseImage = img; redraw(); };
      img.src = p.sketch;
    } else { baseImage = null; redraw(); }
    renderSwatches(); renderBlocks(); renderPreview(); renderMeta(); markDirty();
    $('projectsDialog').close();
    setStatus($('genStatus'), 'Opened "' + layout.title + '".', 'ok');
  }
  function renderProjectList() {
    var list = $('projectList');
    var projects = listProjects();
    list.innerHTML = '';
    if (!projects.length) {
      var p = document.createElement('p');
      p.className = 'empty-note';
      p.textContent = 'No saved projects yet — generate one or load an example, then press Save.';
      list.appendChild(p);
      return;
    }
    projects.forEach(function (proj) {
      var row = document.createElement('div');
      row.className = 'project-row';
      var info = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = proj.name;
      var span = document.createElement('span');
      span.textContent = new Date(proj.updatedAt).toLocaleString() + ' · ' + (proj.source === 'ai' ? 'Gemini' : proj.source === 'example' ? 'Example' : 'Hand-built');
      info.appendChild(strong); info.appendChild(span);
      row.appendChild(info);
      var spacer = document.createElement('span');
      spacer.className = 'spacer';
      row.appendChild(spacer);
      function rowBtn(text, fn) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-ghost btn-small'; b.textContent = text;
        b.addEventListener('click', fn);
        row.appendChild(b);
      }
      rowBtn('Open', function () { openProject(proj); });
      rowBtn('Duplicate', function () {
        var copy = deepCopy(proj);
        copy.id = L.uid(); copy.name = proj.name + ' (copy)'; copy.updatedAt = Date.now();
        var all = listProjects(); all.unshift(copy); saveProjectList(all); renderProjectList();
      });
      rowBtn('Delete', function () {
        saveProjectList(listProjects().filter(function (x) { return x.id !== proj.id; }));
        if (currentProjectId === proj.id) currentProjectId = null;
        renderProjectList();
      });
      list.appendChild(row);
    });
  }
  $('btnNewProject').addEventListener('click', function () {
    layout = L.blankLayout('Untitled page');
    currentProjectId = null; source = 'hand'; modelUsed = null;
    strokes = []; baseImage = null; redraw();
    $('projectName').value = layout.title;
    $('chkDark').checked = false;
    renderSwatches(); renderBlocks(); renderPreview(); renderMeta(); markDirty();
    $('projectsDialog').close();
    setStatus($('genStatus'), 'New blank project. Draw a sketch or load an example.');
  });
  $('btnImportProject').addEventListener('click', function () { $('fileImport').click(); });
  $('fileImport').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var v = L.validateLayout(data.layout || data);
        if (v.error) throw new Error(v.error);
        layout = v.layout;
        currentProjectId = null; source = 'hand'; modelUsed = null;
        $('projectName').value = layout.title;
        $('chkDark').checked = layout.theme.dark;
        renderSwatches(); renderBlocks(); renderPreview(); renderMeta(); markDirty();
        $('projectsDialog').close();
        setStatus($('genStatus'), 'Imported "' + layout.title + '".', 'ok');
      } catch (err) {
        setStatus($('projectStatus'), 'That file is not a valid Sketch to App project: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ---------- settings ----------
  function openSettings() {
    $('apiKey').value = settings.apiKey || '';
    $('apiKey').type = 'password';
    $('btnToggleKey').textContent = 'Show';
    $('modelSelect').value = settings.model;
    $('testResult').textContent = '';
    $('settingsDialog').showModal();
  }
  function closeSettings(save) {
    if (save) {
      settings.apiKey = $('apiKey').value.trim();
      settings.model = $('modelSelect').value;
      saveJson(LS_SETTINGS, settings);
      $('keyNotice').hidden = !!settings.apiKey;
      if (!settings.apiKey) setStatus($('genStatus'), 'No key set. Examples still work without one.');
    }
    $('settingsDialog').close();
  }
  $('btnToggleKey').addEventListener('click', function () {
    var input = $('apiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
    $('btnToggleKey').textContent = input.type === 'password' ? 'Show' : 'Hide';
  });
  $('btnClearKey').addEventListener('click', function () {
    $('apiKey').value = '';
    settings.apiKey = '';
    saveJson(LS_SETTINGS, settings);
    setStatus($('testResult'), 'Key cleared. It was only ever stored in this browser.', 'ok');
  });
  $('btnSaveSettings').addEventListener('click', function () { closeSettings(true); });
  $('btnTestKey').addEventListener('click', async function () {
    var key = $('apiKey').value.trim();
    var model = $('modelSelect').value;
    if (!key) { setStatus($('testResult'), 'Paste a key first.', 'error'); return; }
    setStatus($('testResult'), 'Testing…');
    try {
      var res = await fetch(G.API_BASE + model + ':generateContent?key=' + encodeURIComponent(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with the single word OK.' }] }],
          generationConfig: { responseMimeType: 'text/plain', maxOutputTokens: 16 }
        })
      });
      var text = await res.text();
      if (!res.ok) throw new Error(G.friendlyError(res.status, text));
      var json = JSON.parse(text);
      var answer = G.extractText(json).trim();
      setStatus($('testResult'), 'Connected — the model replied "' + answer + '".', 'ok');
    } catch (e) {
      setStatus($('testResult'), e.message, 'error');
    }
  });

  // ---------- dialogs ----------
  $('btnSettings').addEventListener('click', openSettings);
  $('keyNoticeSettings').addEventListener('click', openSettings);
  $('btnExport').addEventListener('click', function () {
    $('exportStatus').textContent = '';
    $('exportDialog').showModal();
  });
  $('btnProjects').addEventListener('click', function () {
    renderProjectList();
    $('projectStatus').textContent = '';
    $('projectsDialog').showModal();
  });
  $('projectName').addEventListener('input', function () {
    layout.title = $('projectName').value.trim() || 'Untitled page';
    schedulePreview(); // title only affects export; cheap to re-render
  });

  // ---------- init ----------
  $('projectName').value = layout.title;
  $('chkDark').checked = layout.theme.dark;
  $('keyNotice').hidden = !!settings.apiKey;
  redraw();
  renderSwatches();
  renderBlocks();
  renderPreview();
  renderMeta();
  renderExamples();
  // Deep link: index.html#example=cafe loads that example on open.
  var m = /#example=([a-z]+)/.exec(location.hash || '');
  if (m) {
    var ex = EX.EXAMPLES.find(function (e) { return e.id === m[1]; });
    if (ex) loadExample(ex);
  }
})();
