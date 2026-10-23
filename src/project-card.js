// Pure project-card rendering.
//
// No DOM access and no CSS import, so scripts/prerender.js can import this
// module under Node and produce exactly the markup the browser would.

import { escapeHtml, safeUrl } from './escape.js';
import { getProjectDestinations, getLiveLinkKind, getLiveLinkLabel } from './project-links.js';

// Category display labels and preferred ordering
export const categoryLabels = {
  all: 'All',
  mobile: 'Android & Systems',
  web: 'Web & Tools',
  python: 'Python & AI',
  security: 'Security'
};

export const categoryOrder = ['all', 'mobile', 'web', 'python', 'security'];

// Filter Helper
export function filterProjects(allProjects, filter = 'all') {
  if (!allProjects || !Array.isArray(allProjects)) return [];
  if (filter === 'all') return allProjects;
  return allProjects.filter(p => p.category === filter);
}

// Helpers
export function getInitials(title) {
  if (!title) return '??';
  const words = title.split(/[\s—–-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.substring(0, 2).toUpperCase();
}

export function truncateText(text, limit = 120) {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.substring(0, limit).trimEnd() + '...';
}

// Safe Image Markup Renderer
export function renderImageContent(project) {
  const fallbackText = escapeHtml(getInitials(project.title));
  if (!project.thumb) {
    return `<div class="card-placeholder" aria-hidden="true">${fallbackText}</div>`;
  }
  const thumbWebp = project.thumb.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');

  // A failed load is handled by a delegated listener on the grid rather than an
  // inline onerror attribute, so the page needs no script-src 'unsafe-inline'.
  return `<picture>
    <source srcset="${safeUrl(thumbWebp)}" type="image/webp">
    <img src="${safeUrl(project.thumb)}" alt="${escapeHtml(project.title)}" loading="lazy" decoding="async" data-fallback-initials="${fallbackText}">
  </picture>`;
}

// Action Buttons Renderer

// Icons used by the project card actions. Each destination gets its own glyph so
// two buttons on the same card never read as the same action.
const ICON_EXTERNAL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>`;

const ICON_GLOBE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>`;

const ICON_PLAY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>`;

const ICON_GITHUB = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
           <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>`;

const ACTION_ICONS = {
  store: ICON_PLAY,
  site: ICON_GLOBE,
  live: ICON_EXTERNAL,
  source: ICON_GITHUB
};

export function renderActionButtons(project) {
  const buttons = getProjectDestinations(project).map(dest => `
      <a href="${safeUrl(dest.url)}" target="_blank" rel="noopener noreferrer" class="card-btn ${escapeHtml(dest.type)}" aria-label="${escapeHtml(dest.aria)}">
        ${ACTION_ICONS[dest.type] || ICON_EXTERNAL}
        ${escapeHtml(dest.label)}
      </a>`).join('');

  return `<div class="card-actions">${buttons}</div>`;
}

// Project Card Markup
//
// Returns a string so the same markup can be produced at build time by
// scripts/prerender.js and at runtime in the browser. Interaction is wired up
// by delegated listeners on the grid, never by inline attributes.
export function renderProjectCardHTML(project, index = 0) {
  const displayDesc = project.description || project.details || '';
  const hasImages = Boolean(project.images && project.images.length > 0);
  const title = escapeHtml(project.title);

  // The screenshot viewer is a real <button>, so Enter and Space work. The
  // previous markup put onclick on a div with role="button", which is
  // focusable and announced as a button but does nothing from the keyboard.
  const imageInner = `
      ${renderImageContent(project)}
      ${hasImages ? `<span class="view-overlay flex-center" aria-hidden="true">View Screenshots</span>` : ''}`;

  const imageBlock = hasImages
    ? `<button type="button" class="card-image card-image-trigger" data-slideshow-id="${escapeHtml(project.id)}" aria-label="View screenshots for ${title}">${imageInner}</button>`
    : `<div class="card-image">${imageInner}</div>`;

  // The heading stays a plain heading. It keeps a pointer cursor and a click
  // handler as a redundant convenience for mouse users, but it is not a second
  // tab stop and is not announced as a control: the image button above already
  // exposes this function to the keyboard and to assistive technology.
  const headingAttrs = hasImages ? ` class="card-title is-clickable" data-slideshow-id="${escapeHtml(project.id)}"` : ' class="card-title"';

  // Traction figures, where a project has any worth stating. A list rather
  // than styled spans, so a screen reader announces how many there are.
  const metrics = (project.metrics || []).filter(Boolean);
  const metricsBlock = metrics.length
    ? `<ul class="card-metrics" aria-label="Traction for ${title}">
        ${metrics.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
      </ul>`
    : '';

  return `<article class="project-card glass fade-in-up" style="animation-delay: ${(index * 0.08).toFixed(2)}s">
    ${imageBlock}
    <div class="card-content">
      <p class="card-tags">${escapeHtml((project.tags || []).slice(0, 3).join(' • '))}</p>
      <h3${headingAttrs}>${title}</h3>
      <p class="card-description">${escapeHtml(displayDesc)}</p>
      ${metricsBlock}
      ${renderActionButtons(project)}
    </div>
  </article>`;
}

// Filter buttons, rendered as markup so the build can emit them too.
export function renderFiltersHTML(projects, activeFilter = 'all') {
  const existing = new Set(projects.map(p => p.category || 'other'));
  const categories = categoryOrder.filter(cat => cat === 'all' || existing.has(cat));
  existing.forEach(cat => {
    if (!categories.includes(cat)) categories.push(cat);
  });

  return categories.map(cat => `
    <button type="button" class="filter-btn ${cat === activeFilter ? 'active' : ''}" data-filter="${escapeHtml(cat)}" aria-pressed="${cat === activeFilter ? 'true' : 'false'}">
      ${escapeHtml(categoryLabels[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1)))}
    </button>
  `).join('');
}

export { getProjectDestinations, getLiveLinkKind, getLiveLinkLabel };
