import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const PUBLIC = path.join(ROOT, 'public');

export const CONFIG = {
  MAX_DIM: 1280,
  WEBP_QUALITY: 78,
  GIF_WEBP_QUALITY: 75,
  PNG_QUALITY: 82,
  JPEG_QUALITY: 78,
  SKIP_DIRS: new Set(['node_modules', '.git']),
  EXTENSIONS: new Set(['.png', '.jpg', '.jpeg', '.gif'])
};

export async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!CONFIG.SKIP_DIRS.has(entry.name)) results.push(...await walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

export async function optimizeImageFile(filePath, force = false) {
  const ext = path.extname(filePath).toLowerCase();
  if (!CONFIG.EXTENSIONS.has(ext)) return null;

  const isGif = ext === '.gif';
  const webpPath = filePath.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');
  const stat = await fs.promises.stat(filePath);
  const originalSize = stat.size;

  let needsWebP = true;
  if (!force) {
    try {
      const webpStat = await fs.promises.stat(webpPath);
      if (webpStat.mtimeMs >= stat.mtimeMs && webpStat.size > 0 && webpStat.size < 200 * 1024) {
        needsWebP = false;
      }
    } catch {
      // webp doesn't exist
    }
  }

  let webpSaved = 0;
  let inPlaceSaved = 0;
  let didResize = false;

  // 1. Generate / Update WebP (supports animated GIFs and static images)
  if (needsWebP) {
    try {
      const img = sharp(filePath, isGif ? { animated: true } : {});
      const meta = await img.metadata();
      let pipeline = img;

      if (meta.width > CONFIG.MAX_DIM || meta.height > CONFIG.MAX_DIM) {
        pipeline = pipeline.resize({
          width: meta.width > meta.height ? CONFIG.MAX_DIM : undefined,
          height: meta.height > meta.width ? CONFIG.MAX_DIM : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
        didResize = true;
      }

      let currentQuality = isGif ? CONFIG.GIF_WEBP_QUALITY : CONFIG.WEBP_QUALITY;
      const maxBudget = isGif ? 2000 * 1024 : 240 * 1024; // 240KB target to safely pass 250KB budget

      let outBuffer = await pipeline
        .clone()
        .webp({
          quality: currentQuality,
          effort: 6
        })
        .toBuffer();

      // Adaptively step down quality if over budget for static images
      while (!isGif && outBuffer.length > maxBudget && currentQuality > 55) {
        currentQuality -= 6;
        outBuffer = await pipeline
          .clone()
          .webp({
            quality: currentQuality,
            effort: 6
          })
          .toBuffer();
      }

      await fs.promises.writeFile(webpPath, outBuffer);
      webpSaved = Math.max(0, originalSize - outBuffer.length);
    } catch (err) {
      console.error(`  ✘ WebP Error on ${path.relative(PUBLIC, filePath)}: ${err.message}`);
    }
  }

  // 2. In-place optimization for source fallback files (PNG and JPEG)
  if (!isGif) {
    try {
      const tempOut = filePath + '.tmp.opt';
      const img = sharp(filePath);
      const meta = await img.metadata();
      let pipeline = img;

      if (meta.width > CONFIG.MAX_DIM || meta.height > CONFIG.MAX_DIM) {
        pipeline = pipeline.resize({
          width: meta.width > meta.height ? CONFIG.MAX_DIM : undefined,
          height: meta.height > meta.width ? CONFIG.MAX_DIM : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
        didResize = true;
      }

      if (ext === '.png') {
        await pipeline
          .png({ compressionLevel: 9, palette: true, quality: CONFIG.PNG_QUALITY })
          .toFile(tempOut);
      } else if (ext === '.jpg' || ext === '.jpeg') {
        await pipeline
          .jpeg({ quality: CONFIG.JPEG_QUALITY, mozjpeg: true })
          .toFile(tempOut);
      }

      const tempStat = await fs.promises.stat(tempOut);
      if (tempStat.size < originalSize) {
        inPlaceSaved = originalSize - tempStat.size;
        await fs.promises.rename(tempOut, filePath);
      } else {
        await fs.promises.unlink(tempOut);
      }
    } catch (err) {
      // In-place failure is non-fatal
    }
  }

  return {
    filePath,
    originalSize,
    webpSaved,
    inPlaceSaved,
    didResize,
    convertedWebP: needsWebP
  };
}

export async function runOptimization() {
  console.log('⚡ Running Automated Image Optimization Pipeline...');
  const start = Date.now();
  const files = await walk(PUBLIC);
  let convertedCount = 0;
  let resizedCount = 0;
  let totalBytesSaved = 0;

  for (const f of files) {
    const result = await optimizeImageFile(f);
    if (result) {
      if (result.convertedWebP) convertedCount++;
      if (result.didResize) resizedCount++;
      totalBytesSaved += result.webpSaved + result.inPlaceSaved;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✅ Image optimization complete in ${elapsed}s`);
  console.log(`   - WebP files updated/generated: ${convertedCount}`);
  if (resizedCount > 0) console.log(`   - Oversized images clamped to max ${CONFIG.MAX_DIM}px: ${resizedCount}`);
  console.log(`   - Total payload reduction: ${(totalBytesSaved / 1024 / 1024).toFixed(2)} MB`);
}

// Auto-run when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runOptimization().catch(err => {
    console.error('Fatal Image Optimization Error:', err);
    process.exit(1);
  });
}

