import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const W = 1200;
const H = 630;
const PHOTO_SIZE = 280;
const BORDER = 5;
const INNER = PHOTO_SIZE - BORDER * 2;
const PHOTO_X = 790;
const PHOTO_Y = 170;

async function generate() {
  const bg = sharp({
    create: { width: W, height: H, channels: 4, background: { r: 14, g: 17, b: 28, alpha: 1 } }
  });

  const glow = () => Buffer.from(`
    <svg width="${W}" height="${H}">
      <defs>
        <radialGradient id="g" cx="72%" cy="35%" r="55%">
          <stop offset="0%" stop-color="rgba(232,168,76,0.1)" />
          <stop offset="100%" stop-color="rgba(232,168,76,0)" />
        </radialGradient>
        <radialGradient id="h" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(232,168,76,0.15)" />
          <stop offset="100%" stop-color="rgba(232,168,76,0)" />
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)" />
      <circle cx="${PHOTO_X + PHOTO_SIZE/2}" cy="${PHOTO_Y + PHOTO_SIZE/2}" r="${PHOTO_SIZE/2 + 30}" fill="url(#h)" />
    </svg>
  `);

  const accentBar = () => Buffer.from(`
    <svg width="${W}" height="${H}">
      <defs>
        <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#E8A84C" />
          <stop offset="100%" stop-color="#D4782E" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="5" height="${H}" fill="url(#bar)" />
    </svg>
  `);

  const textOverlay = () => Buffer.from(`
    <svg width="${W}" height="${H}">
      <text x="55" y="205" font-family="'Outfit','Segoe UI',sans-serif" font-size="60" font-weight="700" fill="#F5F0E8">Olorunfemi John</text>
      <text x="55" y="268" font-family="'JetBrains Mono','Consolas',monospace" font-size="22" fill="#E8A84C" letter-spacing="2">FULL-STACK DEVELOPER &amp; TECHNICAL ARCHITECT</text>
      <text x="55" y="335" font-family="'Inter','Segoe UI',sans-serif" font-size="19" fill="rgba(245,240,232,0.55)" font-style="italic">"I build tools people actually use"</text>
      <text x="55" y="570" font-family="'JetBrains Mono','Consolas',monospace" font-size="15" fill="rgba(245,240,232,0.3)" letter-spacing="1">thegoodb0rg.pages.dev</text>
    </svg>
  `);

  // Gradient ring behind photo
  const ring = await sharp({
    create: { width: PHOTO_SIZE, height: PHOTO_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{
    input: Buffer.from(`
      <svg width="${PHOTO_SIZE}" height="${PHOTO_SIZE}">
        <defs>
          <linearGradient id="r" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E8A84C" />
            <stop offset="100%" stop-color="#D4782E" />
          </linearGradient>
        </defs>
        <circle cx="${PHOTO_SIZE/2}" cy="${PHOTO_SIZE/2}" r="${PHOTO_SIZE/2}" fill="url(#r)" />
      </svg>
    `),
    blend: 'over'
  }]).png().toBuffer();

  // Circular photo
  const photoPath = path.join(ROOT, 'public', 'john_glasses_casual.png');
  const circleMask = Buffer.from(`
    <svg width="${INNER}" height="${INNER}">
      <circle cx="${INNER/2}" cy="${INNER/2}" r="${INNER/2}" fill="white" />
    </svg>
  `);
  const photoCircular = await sharp(await sharp(photoPath).resize(INNER, INNER, { fit: 'cover' }).toBuffer())
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const result = await bg
    .composite([
      { input: await glow(), top: 0, left: 0 },
      { input: await accentBar(), top: 0, left: 0 },
      { input: await textOverlay(), top: 0, left: 0 },
      { input: ring, top: PHOTO_Y, left: PHOTO_X },
      { input: photoCircular, top: PHOTO_Y + BORDER, left: PHOTO_X + BORDER },
    ])
    .png()
    .toFile(path.join(ROOT, 'public', 'og-image.png'));

  console.log(`OG image: ${result.width}x${result.height} (${(result.size / 1024).toFixed(0)}KB)`);
}

generate().catch(err => { console.error(err); process.exit(1); });
