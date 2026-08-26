import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validateProjectImages } from '../../scripts/validate-images.js';

describe('Automated Image Optimization & Budget Validation', () => {
  it('passes validation with 0 missing images and 0 budget violations', async () => {
    const { errors, report } = await validateProjectImages();
    expect(errors.length).toBe(0);
    expect(report.length).toBeGreaterThan(0);
  });

  it('guarantees all referenced project media have a corresponding WebP file', () => {
    const projectsPath = path.resolve(process.cwd(), 'public/data/projects.json');
    const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

    projectsData.forEach(p => {
      if (p.thumb) {
        const webp = path.resolve(process.cwd(), 'public', p.thumb.replace(/^\.\//, '').replace(/\.(png|jpg|jpeg|gif)$/i, '.webp'));
        expect(fs.existsSync(webp), 'Missing WebP for thumb: ' + webp).toBe(true);
      }
      (p.images || []).forEach(img => {
        if (img.url) {
          const webp = path.resolve(process.cwd(), 'public', img.url.replace(/^\.\//, '').replace(/\.(png|jpg|jpeg|gif)$/i, '.webp'));
          expect(fs.existsSync(webp), 'Missing WebP for slide: ' + webp).toBe(true);
        }
      });
    });
  });

  it('enforces that animated GIFs have an animated WebP counterpart under budget', () => {
    const gifWebP = path.resolve(process.cwd(), 'public/projects/videomascot/demo_overlay.webp');
    expect(fs.existsSync(gifWebP)).toBe(true);
    const stat = fs.statSync(gifWebP);
    expect(stat.size).toBeGreaterThan(1000);
    expect(stat.size).toBeLessThan(90 * 1024);
  });
});
