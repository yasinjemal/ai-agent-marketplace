// Generate minimal valid PNG icons for PWA manifest
// Uses raw binary PNG creation (no external dependencies)
import { writeFileSync } from "fs";
import { deflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function createPNG(size, bgR, bgG, bgB) {
  // Create raw pixel data: RGBA for each pixel
  const width = size;
  const height = size;
  const raw = [];

  const cornerRadius = Math.floor(size * 0.167); // ~rounded corners ratio

  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte for each row
    for (let x = 0; x < width; x++) {
      // Check if pixel is inside rounded rect
      const inRoundedRect = isInsideRoundedRect(x, y, width, height, cornerRadius);

      if (inRoundedRect) {
        // Draw "AI" text area (simple block letter approach)
        const isText = isAIText(x, y, width, height);
        if (isText) {
          raw.push(255, 255, 255, 255); // White text
        } else {
          raw.push(bgR, bgG, bgB, 255); // Indigo background
        }
      } else {
        raw.push(0, 0, 0, 0); // Transparent
      }
    }
  }

  const rawBuf = Buffer.from(raw);
  const compressed = deflateSync(rawBuf);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk("IHDR", ihdr);

  // IDAT chunk
  const idatChunk = makeChunk("IDAT", compressed);

  // IEND chunk
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crc32Table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crc32Table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crc32Table[n] = c;
}

function isInsideRoundedRect(x, y, w, h, r) {
  // Check corners
  if (x < r && y < r) return dist(x, y, r, r) <= r;
  if (x >= w - r && y < r) return dist(x, y, w - r - 1, r) <= r;
  if (x < r && y >= h - r) return dist(x, y, r, h - r - 1) <= r;
  if (x >= w - r && y >= h - r) return dist(x, y, w - r - 1, h - r - 1) <= r;
  return true;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function isAIText(x, y, w, h) {
  // Scale-independent text rendering
  // Text centered in the icon, roughly 50% of icon height
  const textTop = Math.floor(h * 0.28);
  const textBot = Math.floor(h * 0.72);
  const textH = textBot - textTop;
  const charW = Math.floor(textH * 0.45);
  const gap = Math.floor(textH * 0.12);
  const totalW = charW * 2 + gap;
  const textLeft = Math.floor((w - totalW) / 2);
  const stroke = Math.max(Math.floor(textH * 0.14), 2);

  // Letter "A"
  const aLeft = textLeft;
  const aRight = aLeft + charW;
  if (x >= aLeft && x < aRight && y >= textTop && y < textBot) {
    const relX = x - aLeft;
    const relY = y - textTop;
    const mid = charW / 2;
    const progress = relY / textH; // 0 at top, 1 at bottom

    // Left leg of A
    const leftEdge = mid - (mid * progress);
    if (relX >= leftEdge && relX < leftEdge + stroke) return true;

    // Right leg of A
    const rightEdge = mid + (mid * progress);
    if (relX >= rightEdge - stroke && relX < rightEdge) return true;

    // Crossbar of A (at ~55% height)
    if (relY >= textH * 0.5 && relY < textH * 0.5 + stroke) {
      if (relX >= leftEdge + stroke && relX < rightEdge - stroke) return true;
    }
  }

  // Letter "I"
  const iLeft = aRight + gap;
  const iRight = iLeft + charW;
  if (x >= iLeft && x < iRight && y >= textTop && y < textBot) {
    const relX = x - iLeft;
    const midI = charW / 2;

    // Top bar
    if (y >= textTop && y < textTop + stroke) return true;
    // Bottom bar
    if (y >= textBot - stroke && y < textBot) return true;
    // Vertical stroke
    if (relX >= midI - stroke / 2 && relX < midI + stroke / 2) return true;
  }

  return false;
}

// Generate icons
const icon192 = createPNG(192, 99, 102, 241); // #6366f1 (indigo-500)
const icon512 = createPNG(512, 99, 102, 241);

writeFileSync(join(publicDir, "icon-192.png"), icon192);
writeFileSync(join(publicDir, "icon-512.png"), icon512);

console.log(`✅ icon-192.png (${icon192.length} bytes)`);
console.log(`✅ icon-512.png (${icon512.length} bytes)`);
