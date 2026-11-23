/* gemini.js — prompt + request/response handling for the Gemini API.
   No key is bundled. The caller supplies the key; fetch is injected so
   tests can run without network. Model default verified 23 Nov 2026
   against Google's own docs (ai.google.dev/gemini-api/docs/models):
   gemini-3.8-flash is the stable Flash model; gemini-2.5-flash is
   deprecated and routes to gemini-3.5-flash-lite from 1 Dec 2026. */
(function (root) {
  'use strict';

  var DEFAULT_MODEL = 'gemini-3.8-flash';
  var MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  var API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

  var SCHEMA_TEXT = [
    'Return ONLY a JSON object with this shape (no markdown, no extra text):',
    '{ "version": 1, "title": "short page title",',
    '  "theme": { "dark": false, "accent": "#5B21B6" },',
    '  "sections": [',
    '    { "kind": "header", "brand": "site name", "links": ["Menu", "Visit"] },',
    '    { "kind": "hero", "heading": "main headline", "text": "one supporting sentence", "cta": "button label", "ctaTarget": "" },',
    '    { "kind": "cards", "heading": "section heading", "items": [{ "title": "card title", "text": "card text" }] },',
    '    { "kind": "text", "heading": "heading", "text": "a short paragraph" },',
    '    { "kind": "form", "heading": "heading", "text": "one line", "button": "Sign up" },',
    '    { "kind": "image", "alt": "what the picture should show", "caption": "" },',
    '    { "kind": "footer", "text": "footer line" }',
    '  ] }',
    'Rules: use only those section kinds, in the order they appear top to bottom in the sketch.',
    'Read any handwritten words in the sketch and use them as headings and button labels.',
    'If a box is unclear, make a sensible plain choice rather than inventing fancy copy.',
    'Keep headings short. Never use lorem ipsum. Never add sections the sketch does not show.',
    'At most 8 sections and at most 4 cards.'
  ].join('\n');

  function buildGeneratePrompt() {
    return 'Look at this hand-drawn wireframe of a webpage. ' +
      'Describe the layout you see — header, hero, cards, form, footer — ' +
      'and turn it into a webpage layout.\n\n' + SCHEMA_TEXT;
  }

  function buildRepromptPrompt(currentLayout, instruction) {
    return 'Here is the current webpage layout as JSON:\n' +
      JSON.stringify(currentLayout) + '\n\n' +
      'Change it as asked: ' + instruction + '\n\n' +
      'Return the full updated layout as JSON in exactly the same shape.\n\n' + SCHEMA_TEXT;
  }

  function buildRequestBody(model, prompt, imageDataUrl) {
    var parts = [{ text: prompt }];
    if (imageDataUrl) {
      var m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(imageDataUrl);
      if (!m) throw new Error('Sketch image is not a valid data URL.');
      parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
    }
    return {
      contents: [{ parts: parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4096 }
    };
  }

  /* Pull the model text out of a generateContent response. Throws with a
     plain message on the shapes that actually come back wrong. */
  function extractText(response) {
    if (!response || !Array.isArray(response.candidates) || response.candidates.length === 0) {
      throw new Error('The model returned no result. Try again.');
    }
    var parts = response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts;
    if (!Array.isArray(parts)) throw new Error('The model returned a result this app cannot read. Try again.');
    var text = parts.map(function (p) { return p.text || ''; }).join('');
    if (!text.trim()) throw new Error('The model returned an empty answer. Try again.');
    return text;
  }

  function parseLayoutJson(text) {
    var t = String(text).trim();
    var fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
    if (fenced) t = fenced[1].trim();
    try {
      return JSON.parse(t);
    } catch (e) {
      var start = t.indexOf('{'), end = t.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try { return JSON.parse(t.slice(start, end + 1)); } catch (e2) { /* fall through */ }
      }
      throw new Error('The model did not return valid JSON. Try again.');
    }
  }

  function friendlyError(status, bodyText) {
    if (status === 400 || status === 401 || status === 403) {
      return 'That API key was rejected by Google. Check it in Settings — keys start with "AIza".';
    }
    if (status === 429) {
      return 'Google says the free quota is used up for now. Try again in a minute, or check your quota in AI Studio.';
    }
    if (status === 404) {
      return 'That model name was not found. Try another model in Settings.';
    }
    if (status) return 'Google returned an error (' + status + '). ' + (bodyText ? String(bodyText).slice(0, 160) : 'Try again.');
    return 'Could not reach Google. Check your connection and try again.';
  }

  /* One generation call. fetchFn defaults to global fetch. Returns the
     parsed layout object (unvalidated — the caller validates). */
  async function callGemini(opts, fetchFn) {
    var fetchImpl = fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchImpl) throw new Error('This browser cannot make network requests.');
    if (!opts || !opts.apiKey) throw new Error('Add your Gemini API key in Settings first.');
    var model = MODELS.indexOf(opts.model) !== -1 ? opts.model : DEFAULT_MODEL;
    var body = buildRequestBody(model, opts.prompt, opts.imageDataUrl || null);
    var url = API_BASE + model + ':generateContent?key=' + encodeURIComponent(opts.apiKey);
    var res;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Could not reach Google. Check your connection and try again.');
    }
    var text = '';
    try { text = await res.text(); } catch (e) { /* ignore */ }
    if (!res.ok) throw new Error(friendlyError(res.status, text));
    var json;
    try { json = JSON.parse(text); } catch (e) { throw new Error('Google returned a reply this app cannot read. Try again.'); }
    return parseLayoutJson(extractText(json));
  }

  var api = {
    DEFAULT_MODEL: DEFAULT_MODEL, MODELS: MODELS, API_BASE: API_BASE,
    buildGeneratePrompt: buildGeneratePrompt, buildRepromptPrompt: buildRepromptPrompt,
    buildRequestBody: buildRequestBody, extractText: extractText,
    parseLayoutJson: parseLayoutJson, friendlyError: friendlyError, callGemini: callGemini
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SketchGemini = api;
})(typeof window !== 'undefined' ? window : globalThis);
