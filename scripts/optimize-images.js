import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const MAX_DIM = 2000;
const WEBP_QUALITY = 80;
const SKIP_DIRS = new Set(['node_modules', '.git']);

const extensions = new Set(['.png', '.jpg', '.jpeg']);

let converted = 0;
let skipped = 0;
let resized = 0;
let bytesSaved = 0;

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) results.push(...await walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function optimize(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!extensions.has(ext)) return;

  const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  const stat = await fs.promises.stat(filePath);
  const sizeKB = (stat.size / 1024).toFixed(0);

  // Skip if WebP exists and is newer than source
  try {
    const webpStat = await fs.promises.stat(webpPath);
    if (webpStat.mtimeMs >= stat.mtimeMs) {
      skipped++;
      return;
    }
  } catch { /* WebP doesn't exist, proceed */ }

  try {
    const img = sharp(filePath);
    const meta = await img.metadata();
    let pipeline = img;

    // Resize if too large
    if (meta.width > MAX_DIM || meta.height > MAX_DIM) {
      pipeline = pipeline.resize({
        width: meta.width > meta.height ? MAX_DIM : undefined,
        height: meta.height > meta.width ? MAX_DIM : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
      resized++;
    }

    await pipeline
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);

    const webpStat = await fs.promises.stat(webpPath);

    // Discard WebP if it's larger than the original
    if (webpStat.size > stat.size) {
      await fs.promises.unlink(webpPath);
      skipped++;
      const rel = path.relative(PUBLIC, filePath);
      console.log(`  ${rel}  ${sizeKB}KB — skipped (WebP larger than source)`);
      return;
    }

    const saved = stat.size - webpStat.size;
    bytesSaved += saved;
    converted++;

    const rel = path.relative(PUBLIC, filePath);
    console.log(`  ${rel}  ${sizeKB}KB → ${(webpStat.size / 1024).toFixed(0)}KB  (-${(saved / stat.size * 100).toFixed(0)}%)`);
  } catch (err) {
    console.error(`  ✘ ${path.relative(PUBLIC, filePath)}: ${err.message}`);
  }
}

async function main() {
  console.log('Optimizing images...');
  const start = Date.now();
  const files = await walk(PUBLIC);
  for (const f of files) await optimize(f);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (converted > 0) {
    console.log(`\nConverted ${converted}`);
    if (resized > 0) console.log(`Resized ${resized} (max ${MAX_DIM}px)`);
    console.log(`Skipped ${skipped} (already up to date)`);
    console.log(`Saved ${(bytesSaved / 1024 / 1024).toFixed(1)} MB`);
  }
  console.log(`Done in ${elapsed}s`);
}

main().catch(err => { console.error(err); process.exit(1); });
