import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const PUBLIC = path.join(ROOT, 'public');

export const BUDGETS = {
  THUMB_MAX_KB_BASELINE: 90,
  SLIDE_MAX_KB: 250,
  MAX_DIMENSION: 1600
};

export async function validateProjectImages() {
  const projectsPath = path.join(PUBLIC, 'data', 'projects.json');
  if (!fs.existsSync(projectsPath)) {
    throw new Error('Missing projects.json at ' + projectsPath);
  }

  const projects = JSON.parse(await fs.promises.readFile(projectsPath, 'utf8'));
  const errors = [];
  const report = [];

  for (const p of projects) {
    const imagesToCheck = [];
    if (p.thumb) {
      imagesToCheck.push({ url: p.thumb, isThumb: true, context: `${p.title} (thumb)` });
    }
    for (const img of (p.images || [])) {
      if (img.url) {
        imagesToCheck.push({ url: img.url, isThumb: false, context: `${p.title} (slide)` });
      }
    }

    for (const item of imagesToCheck) {
      const relPath = item.url.replace(/^\.\//, '');
      const sourceFile = path.join(PUBLIC, relPath);
      const webpFile = sourceFile.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');

      if (!fs.existsSync(sourceFile)) {
        errors.push(`Missing source image: ${item.context} -> ${relPath}`);
        continue;
      }

      const sourceStat = await fs.promises.stat(sourceFile);
      const sourceKB = sourceStat.size / 1024;

      if (!fs.existsSync(webpFile)) {
        errors.push(`Missing WebP optimization: ${item.context} -> ${path.relative(PUBLIC, webpFile)}`);
      } else {
        const webpStat = await fs.promises.stat(webpFile);
        const webpKB = webpStat.size / 1024;
        const maxBudget = item.isThumb ? BUDGETS.THUMB_MAX_KB_BASELINE : BUDGETS.SLIDE_MAX_KB;

        if (webpKB > maxBudget) {
          errors.push(`Budget violation: ${item.context} WebP is ${webpKB.toFixed(1)}KB (budget: ${maxBudget}KB)`);
        }

        report.push({
          project: p.title,
          file: relPath,
          sourceKB: sourceKB.toFixed(1),
          webpKB: webpKB.toFixed(1),
          budgetKB: maxBudget,
          status: 'OK'
        });
      }
    }
  }

  return { errors, report };
}

export async function runValidation() {
  console.log('🔍 Validating Image Optimization & Budget Compliance...');
  const { errors, report } = await validateProjectImages();

  if (errors.length > 0) {
    console.error('❤️ Image Validation Failed:');
    errors.forEach(e => console.error('   • ' + e));
    process.exit(1);
  }

  console.log(`✅ All ${report.length} project media assets verified successfully!`);
  console.log('   - 100% WebP coverage (zero 404 risks)');
  console.log('   - 100% within performance budgets (<90KB thumbs, <250KB slides)');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runValidation().catch(err => {
    console.error('Fatal Validation Error:', err);
    process.exit(1);
  });
}
