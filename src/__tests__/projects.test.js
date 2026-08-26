import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  filterProjects,
  getInitials,
  truncateText,
  renderImageContent,
  renderActionButtons,
  categoryLabels,
  categoryOrder
} from '../main.js';

const projectsPath = path.resolve(process.cwd(), 'public/data/projects.json');
const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

describe('Projects Data & Structure', () => {
  it('loads valid project list', () => {
    expect(Array.isArray(projectsData)).toBe(true);
    expect(projectsData.length).toBeGreaterThanOrEqual(10);
  });

  it('includes TapConvert with required metadata and screenshots', () => {
    const tapConvert = projectsData.find(p => p.title === 'TapConvert');
    expect(tapConvert).toBeDefined();
    expect(tapConvert.category).toBe('mobile');
    expect(tapConvert.featured).toBe(true);
    expect(tapConvert.link).toBe('https://github.com/theGoodB0rg/tap-convert');
    expect(tapConvert.images.length).toBeGreaterThanOrEqual(4);
    expect(tapConvert.thumb).toContain('projects/tap_convert');
  });

  it('enforces strict privacy: proprietary projects must NOT expose git repo links', () => {
    const privateProjects = ['Universal Undo', '49Blox — Digital Music Collectibles', 'Dainty Proofreader'];
    privateProjects.forEach(title => {
      const proj = projectsData.find(p => p.title.includes(title) || title.includes(p.title));
      if (proj) {
        expect(proj.link).toBeUndefined();
      }
    });
  });

  it('validates all referenced media paths exist in public folder', () => {
    projectsData.forEach(p => {
      if (p.thumb) {
        const fullThumb = path.resolve(process.cwd(), 'public', p.thumb.replace(/^\.\//, ''));
        expect(fs.existsSync(fullThumb), `Thumb missing for ${p.title}: ${fullThumb}`).toBe(true);
      }
      (p.images || []).forEach(img => {
        if (img.url) {
          const fullImg = path.resolve(process.cwd(), 'public', img.url.replace(/^\.\//, ''));
          expect(fs.existsSync(fullImg), `Image missing for ${p.title}: ${fullImg}`).toBe(true);
        }
      });
    });
  });
});

describe('Projects Filtering & Helpers', () => {
  it('filters by category accurately', () => {
    const all = filterProjects(projectsData, 'all');
    expect(all.length).toBe(projectsData.length);

    const mobile = filterProjects(projectsData, 'mobile');
    expect(mobile.length).toBeGreaterThan(0);
    mobile.forEach(p => expect(p.category).toBe('mobile'));

    const python = filterProjects(projectsData, 'python');
    expect(python.length).toBeGreaterThan(0);
    python.forEach(p => expect(p.category).toBe('python'));

    const web = filterProjects(projectsData, 'web');
    expect(web.length).toBeGreaterThan(0);
    web.forEach(p => expect(p.category).toBe('web'));
  });

  it('generates correct initials', () => {
    expect(getInitials('TapConvert')).toBe('TA');
    expect(getInitials('Video Mascot')).toBe('VM');
    expect(getInitials('Universal Undo')).toBe('UU');
    expect(getInitials('')).toBe('??');
  });

  it('truncates text safely', () => {
    expect(truncateText('Short text', 20)).toBe('Short text');
    expect(truncateText('This is a longer text that exceeds the limit', 10)).toBe('This is a...');
  });

  it('renders safe image content with WebP picture fallback', () => {
    const sampleWithThumb = { title: 'Test App', thumb: './projects/tap_convert/00_dashboard_overview.png' };
    const html = renderImageContent(sampleWithThumb);
    expect(html).toContain('<picture>');
    expect(html).toContain('type="image/webp"');
    expect(html).toContain('00_dashboard_overview.webp');
    expect(html).toContain('onerror=');

    const sampleNoThumb = { title: 'Test App', thumb: '' };
    const placeholderHtml = renderImageContent(sampleNoThumb);
    expect(placeholderHtml).toContain('card-placeholder');
    expect(placeholderHtml).toContain('TA');
  });

  it('renders action buttons according to project links', () => {
    const projWithGitOnly = { title: 'Repo', category: 'python', link: 'https://github.com/test/test' };
    const html1 = renderActionButtons(projWithGitOnly);
    expect(html1).toContain('Source Code');
    expect(html1).not.toContain('View Live Site');
    expect(html1).not.toContain('Google Play');

    const projWithLiveOnly = { title: 'App', category: 'web', live_link: 'https://example.com' };
    const html2 = renderActionButtons(projWithLiveOnly);
    expect(html2).toContain('View Live Site');
    expect(html2).not.toContain('Source Code');
  });
});