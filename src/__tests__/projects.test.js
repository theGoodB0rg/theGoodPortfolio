import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  filterProjects,
  getInitials,
  truncateText,
  renderImageContent,
  renderActionButtons,
  renderProjectCardHTML,
  renderPortfolioHTML,
  getLiveLinkLabel,
  getLiveLinkKind,
  getProjectDestinations,
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

    const automation = filterProjects(projectsData, 'automation');
    expect(automation.length).toBeGreaterThan(0);
    automation.forEach(p => expect(p.category).toBe('automation'));

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
    // The fallback is wired up by a delegated listener, not an inline
    // handler, so the markup can run under a CSP without 'unsafe-inline'.
    expect(html).not.toContain('onerror=');
    expect(html).toContain('data-fallback-initials="TA"');

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

  it('keeps every project inside the declared category set', () => {
    const known = new Set(categoryOrder.filter(c => c !== 'all'));
    projectsData.forEach(p => {
      expect(known.has(p.category), `${p.title} has unknown category "${p.category}"`).toBe(true);
    });

    // Automation leads, because that is what the rest of the page sells.
    expect(categoryOrder[1]).toBe('automation');
    expect(categoryLabels.automation).toBe('AI & Automation');
  });

  it('splits the portfolio into a flagship tier and a compact tier', () => {
    const html = renderPortfolioHTML(projectsData);
    const flagshipCount = projectsData.filter(p => p.featured).length;

    expect(html).toContain('portfolio-tier-flagship');
    expect(html).toContain('portfolio-tier-compact');
    expect(html).toContain('More work');

    const compactCards = html.match(/project-card-compact/g) || [];
    expect(compactCards.length).toBe(projectsData.length - flagshipCount);

    // The compact tier carries no image slots: half of it has no screenshot,
    // and an empty frame reads as broken rather than as "none yet".
    const compactSection = html.slice(html.indexOf('portfolio-tier-compact'));
    expect(compactSection).not.toContain('<picture>');
  });

  it('still tiers correctly when a filter excludes every flagship project', () => {
    const html = renderPortfolioHTML(projectsData, 'security');
    expect(html).toContain('project-card-compact');
    // Nothing to be "more" than, so no heading.
    expect(html).not.toContain('More work');
  });

  it('renders traction metrics as a labelled list, and omits them when absent', () => {
    const withMetrics = {
      id: 5,
      title: 'Universal Undo',
      category: 'mobile',
      metrics: ['500+ installs', 'Organic — zero ad spend']
    };
    const html = renderProjectCardHTML(withMetrics);

    expect(html).toContain('<ul class="card-metrics" aria-label="Traction for Universal Undo">');
    expect(html).toContain('<li>500+ installs</li>');

    // No empty list for the projects that have nothing to show.
    expect(renderProjectCardHTML({ id: 6, title: 'Quiet', category: 'web' })).not.toContain('card-metrics');
  });

  it('keeps the published traction claims in step with the Play listing', () => {
    const uu = projectsData.find(p => p.title === 'Universal Undo');

    // 500+ is what the public Play Store listing shows, so it is verifiable
    // by anyone who clicks through.
    expect(uu.installs).toBe(500);
    expect(uu.metrics[0]).toBe('500+ installs');

    // The listing displays no star rating, so the site must not claim one.
    const claims = uu.metrics.join(' ').toLowerCase();
    expect(claims).not.toMatch(/star|rating|\d\.\d\s*★/);
  });

  it('exposes the screenshot viewer as a real, keyboard-operable button', () => {
    const withImages = {
      id: 5,
      title: 'Universal Undo',
      category: 'mobile',
      images: [{ url: './a.png', caption: 'a' }],
      thumb: './a.png'
    };
    const html = renderProjectCardHTML(withImages);

    // A <button> is activated by Enter and Space for free; the old
    // div[role=button][onclick] was focusable but did nothing from a keyboard.
    expect(html).toContain('<button type="button" class="card-image card-image-trigger"');
    expect(html).toContain('aria-label="View screenshots for Universal Undo"');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('onclick=');

    const withoutImages = { id: 6, title: 'No Shots', category: 'web' };
    expect(renderProjectCardHTML(withoutImages)).not.toContain('card-image-trigger');
  });

  it('escapes project data before it reaches innerHTML', () => {
    const hostile = {
      id: 7,
      title: '<img src=x onerror=alert(1)>',
      category: 'web',
      description: '"><script>alert(2)</script>',
      live_link: 'javascript:alert(3)',
      tags: ['<b>tag</b>']
    };
    const html = renderProjectCardHTML(hostile);

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:alert');
    expect(html).toContain('&lt;img src=x');
  });

  it('distinguishes a store listing from the marketing site beside it', () => {
    const app = {
      title: 'Universal Undo',
      category: 'mobile',
      live_link: 'https://universalundo.app/',
      play_store_link: 'https://play.google.com/store/apps/details?id=com.universalundo'
    };

    const html = renderActionButtons(app);

    // The website must never be labelled as if it were the download.
    expect(html).toContain('Get it on Google Play');
    expect(html).toContain('Visit Website');
    expect(html).not.toContain('Get App');

    // Different styles, so the two never read as the same action.
    expect(html).toContain('card-btn store');
    expect(html).toContain('card-btn site');

    // The store listing leads, because installing is the real call to action.
    expect(html.indexOf('card-btn store')).toBeLessThan(html.indexOf('card-btn site'));

    // Each destination spells itself out for screen readers.
    expect(html).toContain('aria-label="Get Universal Undo on Google Play (opens in a new tab)"');
    expect(html).toContain('aria-label="Visit the Universal Undo website (opens in a new tab)"');
  });

  it('still calls a mobile project without a store listing a download', () => {
    const app = { title: 'Sideloaded', category: 'mobile', live_link: 'https://example.com' };
    expect(getLiveLinkLabel(app)).toBe('Get App');
    expect(getLiveLinkKind(app)).toBe('app');
  });

  it('lets a project override its own link label', () => {
    const app = { title: 'Thing', category: 'web', live_link: 'https://example.com', live_link_label: 'Try the demo' };
    expect(getLiveLinkLabel(app)).toBe('Try the demo');
  });

  it('orders destinations store, site, then source', () => {
    const app = {
      title: 'Everything',
      category: 'mobile',
      link: 'https://github.com/x/y',
      live_link: 'https://example.com',
      play_store_link: 'https://play.google.com/store/apps/details?id=x'
    };
    expect(getProjectDestinations(app).map(d => d.type)).toEqual(['store', 'site', 'source']);
  });
});