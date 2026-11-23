/* examples.js — three seeded sketches with known-good layouts.
   These work with no API key. The layout is the saved result for that
   sketch, labelled as such in the UI — never presented as a live generation. */
(function (root) {
  'use strict';

  var INK = '#5B21B6';
  var PENCIL = '#3a3350';

  function wrap(inner, w, h) {
    w = w || 640; h = h || 440;
    var grid = '';
    for (var x = 20; x < w; x += 20) grid += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + h + '" stroke="#e8e4f2" stroke-width="1"/>';
    for (var y = 20; y < h; y += 20) grid += '<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '" stroke="#e8e4f2" stroke-width="1"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' +
      '<rect width="' + w + '" height="' + h + '" fill="#fdfcfe"/>' + grid + inner + '</svg>';
  }
  function box(x, y, w, h, r) {
    r = r == null ? 3 : r;
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>';
  }
  function line(x1, y1, x2, y2, w) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + PENCIL + '" stroke-width="' + (w || 2) + '" stroke-linecap="round"/>';
  }
  function scribble(x, y, w, n) {
    var d = 'M ' + x + ' ' + y;
    for (var i = 1; i <= (n || 3); i++) d += ' q ' + (w / (n || 3) / 2) + ' ' + (i % 2 ? -4 : 4) + ' ' + (w / (n || 3)) + ' 0';
    return '<path d="' + d + '" fill="none" stroke="' + PENCIL + '" stroke-width="2" stroke-linecap="round"/>';
  }
  function label(x, y, text, size) {
    return '<text x="' + x + '" y="' + y + '" font-family="Segoe Script, Bradley Hand, cursive" font-size="' + (size || 17) + '" fill="' + PENCIL + '">' + text + '</text>';
  }
  function arrow(x1, y1, x2, y2) {
    return line(x1, y1, x2, y2, 2) + '<path d="M ' + x2 + ' ' + y2 + ' l -9 -3 M ' + x2 + ' ' + y2 + ' l -3 -9" fill="none" stroke="' + PENCIL + '" stroke-width="2" stroke-linecap="round"/>';
  }

  var cafeSketch = wrap(
    box(30, 24, 580, 44) + label(48, 52, 'Slow Brew', 18) + line(420, 46, 470, 46) + line(490, 46, 545, 46) +
    box(30, 92, 580, 150) + label(52, 130, 'Morning, brewed slow.', 26) +
    scribble(52, 158, 300, 3) + scribble(52, 178, 220, 3) +
    box(52, 196, 130, 34, 17) + label(78, 219, 'See menu', 15) +
    box(30, 264, 280, 92) + label(48, 296, 'Menu', 18) + scribble(48, 322, 200, 2) +
    box(330, 264, 280, 92) + label(348, 296, 'Visit us', 18) + scribble(348, 322, 200, 2) +
    box(30, 376, 580, 44) + label(48, 404, 'open 7am – 3pm', 15)
  );

  var pricingSketch = wrap(
    box(30, 24, 580, 44) + label(48, 52, 'Postbox', 18) + line(470, 46, 545, 46) +
    box(30, 92, 580, 84) + label(52, 128, 'Simple pricing', 26) + scribble(52, 152, 240, 3) +
    box(30, 196, 180, 150) + label(52, 230, 'Starter', 18) + label(52, 262, '$0', 24) + scribble(52, 292, 120, 2) +
    box(230, 196, 180, 150) + label(252, 230, 'Pro', 18) + label(252, 262, '$12', 24) + scribble(252, 292, 120, 2) +
    box(430, 196, 180, 150) + label(452, 230, 'Team', 18) + label(452, 262, '$29', 24) + scribble(452, 292, 120, 2) +
    box(30, 366, 580, 44) + label(48, 394, 'cancel anytime', 15)
  );

  var portfolioSketch = wrap(
    box(30, 24, 580, 44) + label(48, 52, 'Mara — designer', 18) + line(470, 46, 545, 46) +
    box(30, 92, 580, 120) + label(52, 130, 'I make interfaces', 26) + label(52, 158, 'people enjoy using.', 26) +
    box(52, 176, 130, 34, 17) + label(72, 199, 'See work', 15) +
    box(30, 232, 180, 120) + line(30, 300, 210, 300) + label(48, 330, 'Shop app', 17) +
    box(230, 232, 180, 120) + line(230, 300, 410, 300) + label(248, 330, 'Bank app', 17) +
    box(430, 232, 180, 120) + line(430, 300, 610, 300) + label(448, 330, 'Map app', 17) +
    box(30, 372, 580, 44) + label(48, 400, 'hello@mara.design', 15) +
    arrow(560, 210, 596, 236)
  );

  var EXAMPLES = [
    {
      id: 'cafe',
      name: 'Café landing page',
      blurb: 'Header, hero, two cards, signup form, footer.',
      sketchSvg: cafeSketch,
      layout: {
        version: 1, title: 'Slow Brew — Café landing page',
        theme: { dark: false, accent: '#5B21B6' },
        sections: [
          { id: 'ex1-h', kind: 'header', brand: 'Slow Brew', links: ['Menu', 'Visit'] },
          { id: 'ex1-hero', kind: 'hero', heading: 'Morning, brewed slow.', text: 'A small café with big beans, open every day from 7am.', cta: 'See the menu', ctaTarget: '' },
          { id: 'ex1-cards', kind: 'cards', heading: 'What we do', items: [
            { title: 'Menu', text: 'Espresso, filter and cold brew, plus pastries baked at 6am.' },
            { title: 'Visit us', text: '12 Rose Lane. Walk in, sit down, stay a while.' }
          ] },
          { id: 'ex1-form', kind: 'form', heading: 'Get the weekly menu', text: 'One email a week, on Monday morning.', button: 'Sign up' },
          { id: 'ex1-f', kind: 'footer', text: 'Slow Brew — open 7am to 3pm, every day.' }
        ]
      }
    },
    {
      id: 'pricing',
      name: 'Pricing page',
      blurb: 'Header, hero, three pricing cards, footer.',
      sketchSvg: pricingSketch,
      layout: {
        version: 1, title: 'Postbox — Simple pricing',
        theme: { dark: false, accent: '#166534' },
        sections: [
          { id: 'ex2-h', kind: 'header', brand: 'Postbox', links: ['Pricing', 'About'] },
          { id: 'ex2-hero', kind: 'hero', heading: 'Simple pricing.', text: 'Start free. Pay when it earns its keep.', cta: 'Start free', ctaTarget: '' },
          { id: 'ex2-cards', kind: 'cards', heading: 'Pick a plan', items: [
            { title: 'Starter — $0', text: '100 letters a month, one mailbox.' },
            { title: 'Pro — $12', text: 'Unlimited letters, custom domain, priority support.' },
            { title: 'Team — $29', text: 'Everything in Pro, plus shared inboxes for up to 5 people.' }
          ] },
          { id: 'ex2-text', kind: 'text', heading: 'No surprises', text: 'Prices are per month, in US dollars. Cancel anytime — your letters stay readable for 90 days after you leave.' },
          { id: 'ex2-f', kind: 'footer', text: 'Postbox — cancel anytime.' }
        ]
      }
    },
    {
      id: 'portfolio',
      name: 'Portfolio page',
      blurb: 'Header, hero, three work cards, footer.',
      sketchSvg: portfolioSketch,
      layout: {
        version: 1, title: 'Mara — Designer portfolio',
        theme: { dark: false, accent: '#B45309' },
        sections: [
          { id: 'ex3-h', kind: 'header', brand: 'Mara', links: ['Work', 'Contact'] },
          { id: 'ex3-hero', kind: 'hero', heading: 'I make interfaces people enjoy using.', text: 'Product designer, six years, three continents. Currently open for freelance.', cta: 'See work', ctaTarget: '' },
          { id: 'ex3-cards', kind: 'cards', heading: 'Selected work', items: [
            { title: 'Shop app', text: 'Checkout redesign — 22% fewer abandoned carts in the first month.' },
            { title: 'Bank app', text: 'A savings flow people actually finish.' },
            { title: 'Map app', text: 'Offline-first maps for field teams.' }
          ] },
          { id: 'ex3-f', kind: 'footer', text: 'Mara — hello@mara.design' }
        ]
      }
    }
  ];

  function svgToDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var api = { EXAMPLES: EXAMPLES, svgToDataUrl: svgToDataUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SketchExamples = api;
})(typeof window !== 'undefined' ? window : globalThis);
