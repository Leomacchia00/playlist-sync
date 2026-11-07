import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, px) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = y * stride + 1 + x * 4;
      raw[d] = px[s];
      raw[d + 1] = px[s + 1];
      raw[d + 2] = px[s + 2];
      raw[d + 3] = px[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function makeIcon(size, { rounded = 0, glyphScale = 0.42, opaque = false } = {}) {
  const px = new Uint8Array(size * size * 4);
  const c0 = [59, 130, 246];
  const c1 = [139, 92, 246];
  const cx = size / 2;
  const cy = size / 2;
  const g = size * glyphScale;
  const ax = cx - g * 0.35;
  const ay = cy - g * 0.42;
  const bx = cx - g * 0.35;
  const by = cy + g * 0.42;
  const tx = cx + g * 0.55;
  const ty = cy;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const qx = Math.min(Math.max(x, rounded), size - 1 - rounded);
      const qy = Math.min(Math.max(y, rounded), size - 1 - rounded);
      const insideRect = (x - qx) ** 2 + (y - qy) ** 2 <= rounded * rounded;
      const t = (x + y) / (2 * size);
      px[i] = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      px[i + 1] = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      px[i + 2] = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      px[i + 3] = insideRect || opaque ? 255 : 0;
      if (insideRect && inTriangle(x + 0.5, y + 0.5, ax, ay, bx, by, tx, ty)) {
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
        px[i + 3] = 255;
      }
    }
  }
  return encodePNG(size, size, px);
}

const icons = {
  'favicon-32.png': makeIcon(32, { rounded: 8 }),
  'icon-192.png': makeIcon(192, { rounded: 44 }),
  'icon-512.png': makeIcon(512, { rounded: 118 }),
  'icon-maskable-512.png': makeIcon(512, { rounded: 0, glyphScale: 0.3, opaque: true }),
  'apple-touch-icon.png': makeIcon(180, { rounded: 0, opaque: true }),
};

for (const [name, png] of Object.entries(icons)) {
  writeFileSync(path.join(outDir, name), png);
  console.log('generata', name, png.length, 'byte');
}
