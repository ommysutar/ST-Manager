import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const iconsDir = join(publicDir, "icons");
const splashDir = join(publicDir, "splash");

const BRAND = {
  bg: [0x11, 0x11, 0x11],
  surface: [0x1f, 0x1f, 0x1f],
  accent: [0xf5, 0xf5, 0xf5],
  muted: [0x9c, 0xa3, 0xaf],
  ring: [0x3f, 0x3f, 0x46],
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])) >>> 0);
  return Buffer.concat([length, type, data, crc]);
}

function createPng(width, height, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLength = 1 + width * 4;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const offset = rowStart + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    pngChunk(Buffer.from("IHDR"), ihdr),
    pngChunk(Buffer.from("IDAT"), deflateSync(raw)),
    pngChunk(Buffer.from("IEND"), Buffer.alloc(0)),
  ]);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function roundedRectDistance(x, y, width, height, radius) {
  const cx = clamp(x, radius, width - radius);
  const cy = clamp(y, radius, height - radius);
  const dx = x - cx;
  const dy = y - cy;
  return Math.hypot(dx, dy) - radius;
}

function drawIconPixel(x, y, size, maskable) {
  const padding = maskable ? size * 0.1 : size * 0.08;
  const inner = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const radius = inner * 0.22;
  const cardLeft = padding;
  const cardTop = padding;
  const cardRight = size - padding;
  const cardBottom = size - padding;

  const dist = roundedRectDistance(x, y, inner, inner, radius);
  const inCard =
    x >= cardLeft && x <= cardRight && y >= cardTop && y <= cardBottom && dist <= 0;

  if (!inCard) {
    return [...BRAND.bg, 255];
  }

  const localX = x - cardLeft;
  const localY = y - cardTop;
  const ring = roundedRectDistance(localX, localY, inner, inner, radius);
  if (ring > -2 && ring <= 0) {
    return [...BRAND.ring, 255];
  }

  const tile = inner / 8;
  const checker =
    (Math.floor(localX / tile) + Math.floor(localY / tile)) % 2 === 0
      ? BRAND.surface
      : BRAND.bg;
  let color = checker;

  const barWidth = inner * 0.12;
  const barHeight = inner * 0.04;
  const barY = cardTop + inner * 0.2;
  const barX = cx - barWidth / 2;
  if (x >= barX && x <= barX + barWidth && y >= barY && y <= barY + barHeight) {
    color = BRAND.accent;
  }

  const glyphSize = inner * (maskable ? 0.34 : 0.38);
  const glyphLeft = cx - glyphSize * 0.55;
  const glyphTop = cy - glyphSize * 0.18;
  const stroke = glyphSize * 0.18;

  function inRect(px, py, left, top, width, height) {
    return px >= left && px <= left + width && py >= top && py <= top + height;
  }

  const sLeft = glyphLeft;
  const sTop = glyphTop;
  const sWidth = glyphSize * 0.34;
  const sHeight = glyphSize * 0.72;
  const tLeft = glyphLeft + glyphSize * 0.42;
  const tTop = glyphTop;
  const tWidth = glyphSize * 0.72;
  const tHeight = glyphSize * 0.18;
  const tStemLeft = tLeft + glyphSize * 0.52;
  const tStemTop = tTop;
  const tStemWidth = stroke;
  const tStemHeight = glyphSize * 0.72;

  if (
    inRect(x, y, sLeft, sTop, stroke, sHeight) ||
    inRect(x, y, sLeft, sTop + sHeight - stroke, sWidth, stroke) ||
    inRect(x, y, sLeft + sWidth - stroke, sTop, stroke, sHeight) ||
    inRect(x, y, tLeft, tTop, tWidth, tHeight) ||
    inRect(x, y, tStemLeft, tStemTop, tStemWidth, tStemHeight)
  ) {
    color = BRAND.accent;
  }

  return [...color, 255];
}

function drawSplashPixel(x, y, width, height) {
  const cx = width / 2;
  const iconSize = Math.min(width, height) * 0.22;
  const iconX = Math.floor(cx - iconSize / 2);
  const iconY = Math.floor(height * 0.38 - iconSize / 2);
  const localX = x - iconX;
  const localY = y - iconY;

  if (localX >= 0 && localY >= 0 && localX < iconSize && localY < iconSize) {
    return drawIconPixel(localX, localY, iconSize, false);
  }

  const titleY = height * 0.38 + iconSize / 2 + height * 0.05;
  const titleHeight = height * 0.035;
  const titleWidth = width * 0.42;
  const subtitleY = titleY + titleHeight + height * 0.02;
  const subtitleHeight = height * 0.02;
  const subtitleWidth = width * 0.5;

  if (
    y >= titleY &&
    y <= titleY + titleHeight &&
    x >= cx - titleWidth / 2 &&
    x <= cx + titleWidth / 2
  ) {
    const t = (x - (cx - titleWidth / 2)) / titleWidth;
    const bar = Math.sin(t * Math.PI * 6) > -0.2;
    return bar ? [...BRAND.accent, 255] : [...BRAND.bg, 255];
  }

  if (
    y >= subtitleY &&
    y <= subtitleY + subtitleHeight &&
    x >= cx - subtitleWidth / 2 &&
    x <= cx + subtitleWidth / 2
  ) {
    const t = (x - (cx - subtitleWidth / 2)) / subtitleWidth;
    const bar = Math.sin(t * Math.PI * 10) > 0.15;
    return bar ? [...BRAND.muted, 255] : [...BRAND.bg, 255];
  }

  const vignette = Math.hypot((x - cx) / width, (y - height * 0.42) / height);
  const shade = clamp(1 - vignette * 0.35, 0.75, 1);
  return [
    Math.round(BRAND.bg[0] * shade),
    Math.round(BRAND.bg[1] * shade),
    Math.round(BRAND.bg[2] * shade),
    255,
  ];
}

function writePng(path, width, height, pixelFn) {
  writeFileSync(path, createPng(width, height, pixelFn));
}

mkdirSync(iconsDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });

const iconSizes = [
  { name: "icon-192x192.png", size: 192, maskable: false },
  { name: "icon-512x512.png", size: 512, maskable: false },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "icon-maskable-192x192.png", size: 192, maskable: true },
  { name: "icon-maskable-512x512.png", size: 512, maskable: true },
];

for (const icon of iconSizes) {
  writePng(join(iconsDir, icon.name), icon.size, icon.size, (x, y, w, h) =>
    drawIconPixel(x, y, Math.min(w, h), icon.maskable),
  );
  console.log(`Generated ${icon.name}`);
}

const splashScreens = [
  { name: "iphone-se.png", width: 750, height: 1334 },
  { name: "iphone-8.png", width: 750, height: 1334 },
  { name: "iphone-14.png", width: 1170, height: 2532 },
  { name: "iphone-14-pro.png", width: 1179, height: 2556 },
  { name: "iphone-14-pro-max.png", width: 1290, height: 2796 },
  { name: "iphone-15-pro-max.png", width: 1290, height: 2796 },
  { name: "ipad-10.png", width: 1620, height: 2160 },
  { name: "ipad-pro-11.png", width: 1668, height: 2388 },
  { name: "ipad-pro-12.png", width: 2048, height: 2732 },
];

for (const splash of splashScreens) {
  writePng(join(splashDir, splash.name), splash.width, splash.height, (x, y, w, h) =>
    drawSplashPixel(x, y, w, h),
  );
  console.log(`Generated splash ${splash.name}`);
}

console.log("PWA assets generated.");
