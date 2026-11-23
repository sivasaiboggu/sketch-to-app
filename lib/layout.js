/* layout.js — the single source of truth for Sketch to App.
   A Layout is plain JSON: { version, title, theme, sections[] }.
   Gemini never returns HTML; it returns this JSON, which is validated
   here before anything renders. Works in Node (tests) and the browser. */
(function (root) {
  'use strict';

  var KINDS = ['header', 'hero', 'cards', 'text', 'form', 'image', 'footer'];
  var ACCENTS = ['#5B21B6', '#111111', '#166534', '#B45309'];

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function str(v, max) {
    if (typeof v !== 'string') return '';
    var s = v.trim().replace(/\s+/g, ' ');
    return max ? s.slice(0, max) : s;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() {
    return 's' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function blankLayout(title) {
    return {
      version: 1,
      title: title || 'Untitled page',
      theme: { dark: false, accent: '#5B21B6' },
      sections: [
        { id: uid(), kind: 'header', brand: 'My site', links: ['Home', 'About'] },
        { id: uid(), kind: 'hero', heading: 'A page, sketched in minutes.', text: 'Replace this text with your own words.', cta: 'Get started', ctaTarget: '' },
        { id: uid(), kind: 'footer', text: 'Made with Sketch to App.' }
      ]
    };
  }

  /* Validate + sanitise an unknown value into a Layout.
     Returns { layout, warnings } or { error }. Never throws on bad input. */
  function validateLayout(input) {
    var warnings = [];
    if (!isObj(input)) return { error: 'Layout is not an object.' };
    if (!Array.isArray(input.sections) || input.sections.length === 0) {
      return { error: 'Layout has no sections.' };
    }
    var theme = isObj(input.theme) ? input.theme : {};
    var accent = typeof theme.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(theme.accent)
      ? theme.accent : '#5B21B6';
    if (theme.accent && accent !== theme.accent) warnings.push('Accent colour was not a valid hex value; reset to violet.');
    var out = {
      version: 1,
      title: str(input.title, 80) || 'Untitled page',
      theme: { dark: theme.dark === true, accent: accent },
      sections: []
    };
    input.sections.slice(0, 12).forEach(function (raw, i) {
      if (!isObj(raw)) { warnings.push('Section ' + (i + 1) + ' was not an object; skipped.'); return; }
      if (KINDS.indexOf(raw.kind) === -1) { warnings.push('Unknown section type "' + String(raw.kind) + '"; skipped.'); return; }
      var s = { id: typeof raw.id === 'string' && raw.id ? raw.id : uid(), kind: raw.kind };
      if (raw.kind === 'header') {
        s.brand = str(raw.brand, 40) || 'My site';
        s.links = Array.isArray(raw.links) ? raw.links.map(function (l) { return str(l, 24); }).filter(Boolean).slice(0, 5) : [];
      } else if (raw.kind === 'hero') {
        s.heading = str(raw.heading, 120) || 'Hello.';
        s.text = str(raw.text, 300);
        s.cta = str(raw.cta, 40);
        s.ctaTarget = str(raw.ctaTarget, 24);
      } else if (raw.kind === 'cards') {
        s.heading = str(raw.heading, 120);
        s.items = (Array.isArray(raw.items) ? raw.items : []).slice(0, 6).map(function (it) {
          if (!isObj(it)) return null;
          return { title: str(it.title, 80) || 'Card', text: str(it.text, 300) };
        }).filter(Boolean);
        if (s.items.length === 0) s.items = [{ title: 'First card', text: 'Add some text here.' }];
      } else if (raw.kind === 'text') {
        s.heading = str(raw.heading, 120);
        s.text = str(raw.text, 600) || 'Some text goes here.';
      } else if (raw.kind === 'form') {
        s.heading = str(raw.heading, 120) || 'Stay in touch';
        s.text = str(raw.text, 300);
        s.button = str(raw.button, 40) || 'Sign up';
      } else if (raw.kind === 'image') {
        s.alt = str(raw.alt, 120) || 'Image';
        s.caption = str(raw.caption, 200);
      } else if (raw.kind === 'footer') {
        s.text = str(raw.text, 300) || '';
      }
      out.sections.push(s);
    });
    if (out.sections.length === 0) return { error: 'Layout has no usable sections.' };
    return { layout: out, warnings: warnings };
  }

  function sectionHtml(s, accent) {
    if (s.kind === 'header') {
      var links = (s.links || []).map(function (l, i) {
        return '<a href="#sec-' + (i + 1) + '">' + esc(l) + '</a>';
      }).join('');
      return '<header class="pg-header"><strong>' + esc(s.brand) + '</strong><nav>' + links + '</nav></header>';
    }
    if (s.kind === 'hero') {
      return '<section class="pg-hero"><h1>' + esc(s.heading) + '</h1>' +
        (s.text ? '<p>' + esc(s.text) + '</p>' : '') +
        (s.cta ? '<a class="pg-cta" href="#pg-form">' + esc(s.cta) + '</a>' : '') + '</section>';
    }
    if (s.kind === 'cards') {
      var cards = s.items.map(function (it) {
        return '<article><h3>' + esc(it.title) + '</h3><p>' + esc(it.text) + '</p></article>';
      }).join('');
      return '<section class="pg-cards">' + (s.heading ? '<h2>' + esc(s.heading) + '</h2>' : '') +
        '<div class="pg-card-grid">' + cards + '</div></section>';
    }
    if (s.kind === 'text') {
      return '<section class="pg-text">' + (s.heading ? '<h2>' + esc(s.heading) + '</h2>' : '') +
        '<p>' + esc(s.text) + '</p></section>';
    }
    if (s.kind === 'form') {
      return '<section class="pg-form" id="pg-form"><h2>' + esc(s.heading) + '</h2>' +
        (s.text ? '<p>' + esc(s.text) + '</p>' : '') +
        '<form onsubmit="return pgSubmit(event)"><label>Email<input type="email" required placeholder="you@example.com"></label>' +
        '<button type="submit">' + esc(s.button) + '</button></form>' +
        '<p class="pg-note" hidden></p></section>';
    }
    if (s.kind === 'image') {
      return '<figure class="pg-image"><div class="pg-ph" role="img" aria-label="' + esc(s.alt) + '">' +
        '<span>Image: ' + esc(s.alt) + '</span></div>' +
        (s.caption ? '<figcaption>' + esc(s.caption) + '</figcaption>' : '') + '</figure>';
    }
    if (s.kind === 'footer') {
      return '<footer class="pg-footer"><p>' + esc(s.text) + '</p></footer>';
    }
    return '';
  }

  /* CSS for a generated page. accent is a hex colour; dark flips the page. */
  function pageCss(theme) {
    var accent = (theme && theme.accent) || '#5B21B6';
    var dark = theme && theme.dark;
    var bg = dark ? '#17141f' : '#ffffff';
    var ink = dark ? '#f2f0f7' : '#1a1626';
    var muted = dark ? '#b6b0c6' : '#5c5568';
    var line = dark ? '#332d42' : '#e4e0ec';
    var card = dark ? '#221d2e' : '#faf8fd';
    return 'body{margin:0;font-family:Sora,system-ui,-apple-system,"Segoe UI",sans-serif;color:' + ink +
      ';background:' + bg + ';line-height:1.6}' +
      '.pg-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 24px;border-bottom:1px solid ' + line + ';flex-wrap:wrap}' +
      '.pg-header strong{font-size:18px}.pg-header nav{display:flex;gap:20px}.pg-header a{color:' + muted + ';text-decoration:none;font-size:15px}' +
      '.pg-header a:hover{color:' + accent + '}' +
      '.pg-hero{max-width:720px;margin:0 auto;padding:72px 24px 56px}.pg-hero h1{font-size:clamp(32px,6vw,52px);line-height:1.1;margin:0 0 16px;letter-spacing:-0.02em}' +
      '.pg-hero p{font-size:18px;color:' + muted + ';margin:0 0 24px}.pg-cta{display:inline-block;background:' + accent +
      ';color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600}' +
      '.pg-cards,.pg-text,.pg-form,.pg-image{max-width:960px;margin:0 auto;padding:32px 24px}' +
      'h2{font-size:26px;letter-spacing:-0.01em;margin:0 0 20px}' +
      '.pg-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}' +
      '.pg-card-grid article{background:' + card + ';border:1px solid ' + line + ';border-radius:12px;padding:20px}' +
      '.pg-card-grid h3{margin:0 0 8px;font-size:18px}.pg-card-grid p{margin:0;color:' + muted + '}' +
      '.pg-text p{max-width:68ch;color:' + muted + '}' +
      '.pg-form form{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.pg-form label{flex:1;min-width:220px}' +
      '.pg-form input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid ' + line + ';border-radius:8px;font:inherit;background:' + bg + ';color:' + ink + '}' +
      '.pg-form button{background:' + accent + ';color:#fff;border:0;padding:11px 20px;border-radius:8px;font:inherit;font-weight:600;cursor:pointer}' +
      '.pg-note{color:' + muted + ';font-size:14px}' +
      '.pg-ph{border:1px dashed ' + line + ';border-radius:12px;min-height:220px;display:flex;align-items:center;justify-content:center;color:' + muted + ';background:' + card + '}' +
      '.pg-image figcaption{color:' + muted + ';font-size:14px;margin-top:8px}' +
      '.pg-footer{border-top:1px solid ' + line + ';padding:24px;color:' + muted + ';font-size:14px;text-align:center}' +
      '@media(max-width:560px){.pg-hero{padding:48px 20px 36px}.pg-cards,.pg-text,.pg-form,.pg-image{padding:24px 20px}}';
  }

  var PAGE_SCRIPT = "function pgSubmit(e){e.preventDefault();var n=e.target.parentElement.querySelector('.pg-note');n.hidden=false;n.textContent='Thanks — this is a demo form, nothing was sent.';e.target.reset();return false;}";

  function layoutToHtml(layout) {
    var v = validateLayout(layout);
    if (v.error) throw new Error(v.error);
    var l = v.layout;
    var body = l.sections.map(function (s) { return sectionHtml(s, l.theme.accent); }).join('\n');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + esc(l.title) + '</title><style>' + pageCss(l.theme) + '</style></head>' +
      '<body>' + body + '<script>' + PAGE_SCRIPT + '</script></body></html>';
  }

  function slugify(name) {
    var s = String(name || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'page';
  }

  var api = { KINDS: KINDS, ACCENTS: ACCENTS, blankLayout: blankLayout, validateLayout: validateLayout, layoutToHtml: layoutToHtml, pageCss: pageCss, slugify: slugify, esc: esc, uid: uid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SketchLayout = api;
})(typeof window !== 'undefined' ? window : globalThis);
