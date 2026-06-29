// Generate PWA icons with no external deps: raw RGBA -> PNG via built-in zlib.
// Design echoes the app: deep-ocean globe, orange horizon ring, white reticle
// crosshair, golden core dot, on the app's near-black background.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [5, 7, 13];
const OCEAN = [18, 54, 90];
const OCEAN_DAY = [40, 96, 150];
const RING = [255, 122, 61];
const CORE = [255, 209, 102];
const WHITE = [235, 240, 248];

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Render one icon at `size` px. contentScale<1 keeps content in the maskable safe zone. */
function render(size, contentScale) {
  const SS = 2; // supersample for antialiasing
  const N = size * SS;
  const big = new Uint8Array(N * N * 3);
  const cx = (N - 1) / 2;
  const cy = (N - 1) / 2;
  const rGlobe = (N / 2) * contentScale * 0.9;
  const ringHalf = Math.max(2, N * 0.014);
  const lineHalf = Math.max(1, N * 0.006);
  const coreR = rGlobe * 0.1;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      let c = BG;
      if (d <= rGlobe + ringHalf) {
        if (d >= rGlobe - ringHalf) {
          c = RING; // horizon ring
        } else {
          // ocean with a soft day/night shade left->right
          const day = (dx / rGlobe + 1) / 2;
          c = mix(OCEAN, OCEAN_DAY, Math.max(0, Math.min(1, day)));
          // reticle crosshair
          if (Math.abs(dx) < lineHalf || Math.abs(dy) < lineHalf) c = mix(c, WHITE, 0.8);
          // core dot
          if (d < coreR) c = CORE;
        }
      }
      const o = (y * N + x) * 3;
      big[o] = c[0];
      big[o + 1] = c[1];
      big[o + 2] = c[2];
    }
  }

  // box-downsample SSxSS -> size
  const out = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((y * SS + sy) * N + (x * SS + sx)) * 3;
          r += big[o];
          g += big[o + 1];
          b += big[o + 2];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 3;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
    }
  }
  return out;
}

// --- minimal PNG encoder (RGB, 8-bit) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgb, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  // rows with filter byte 0
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgb.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = new URL('../public/icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
const write = (name, size, scale) => {
  const png = encodePNG(render(size, scale), size);
  writeFileSync(new URL(name, dir), png);
  console.log('wrote', name, png.length, 'bytes');
};
write('icon-192.png', 192, 1.0);
write('icon-512.png', 512, 1.0);
write('maskable-512.png', 512, 0.8); // content inside the adaptive-icon safe zone
