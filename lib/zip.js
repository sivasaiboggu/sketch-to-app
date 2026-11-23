/* zip.js — a tiny dependency-free ZIP writer (stored entries, no compression).
   Enough for exporting a small site. CRC32 table is generated at load. */
(function (root) {
  'use strict';

  var table = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function u16(n) { return [n & 0xFF, (n >> 8) & 0xFF]; }
  function u32(n) { return [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]; }
  function concat(arrays) {
    var len = arrays.reduce(function (a, b) { return a + b.length; }, 0);
    var out = new Uint8Array(len), off = 0;
    arrays.forEach(function (a) { out.set(a, off); off += a.length; });
    return out;
  }

  /* files: [{ name, content }] where content is a string (UTF-8) or Uint8Array.
     Returns a Uint8Array holding a valid .zip. */
  function createZip(files) {
    if (!Array.isArray(files) || files.length === 0) throw new Error('No files to zip.');
    var enc = new TextEncoder();
    var chunks = [], central = [], offset = 0;
    files.forEach(function (f) {
      if (typeof f.name !== 'string' || !f.name) throw new Error('Zip entry needs a name.');
      var data = typeof f.content === 'string' ? enc.encode(f.content) : f.content;
      var name = enc.encode(f.name);
      var crc = crc32(data);
      var header = concat([
        new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
        new Uint8Array(u16(20)), new Uint8Array(u16(0)), new Uint8Array(u16(0)),
        new Uint8Array(u16(0)), new Uint8Array(u16(0)),
        new Uint8Array(u32(crc)), new Uint8Array(u32(data.length)), new Uint8Array(u32(data.length)),
        new Uint8Array(u16(name.length)), new Uint8Array(u16(0)), name, data
      ]);
      chunks.push(header);
      central.push(concat([
        new Uint8Array([0x50, 0x4B, 0x01, 0x02]),
        new Uint8Array(u16(20)), new Uint8Array(u16(20)), new Uint8Array(u16(0)), new Uint8Array(u16(0)),
        new Uint8Array(u16(0)), new Uint8Array(u16(0)),
        new Uint8Array(u32(crc)), new Uint8Array(u32(data.length)), new Uint8Array(u32(data.length)),
        new Uint8Array(u16(name.length)), new Uint8Array(u16(0)), new Uint8Array(u16(0)),
        new Uint8Array(u16(0)), new Uint8Array(u16(0)), new Uint8Array(u32(0)),
        new Uint8Array(u32(offset)), name
      ]));
      offset += header.length;
    });
    var centralDir = concat(central);
    var end = concat([
      new Uint8Array([0x50, 0x4B, 0x05, 0x06]),
      new Uint8Array(u16(0)), new Uint8Array(u16(0)),
      new Uint8Array(u16(files.length)), new Uint8Array(u16(files.length)),
      new Uint8Array(u32(centralDir.length)), new Uint8Array(u32(offset)),
      new Uint8Array(u16(0))
    ]);
    return concat(chunks.concat([centralDir, end]));
  }

  var api = { crc32: crc32, createZip: createZip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SketchZip = api;
})(typeof window !== 'undefined' ? window : globalThis);
