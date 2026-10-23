import './style.css'
import { SlideshowModal } from './components/SlideshowModal/SlideshowModal.js'
import { getProjectDestinations, getLiveLinkKind, getLiveLinkLabel } from './project-links.js'
import { escapeHtml, safeUrl } from './escape.js'
import { renderBlogCardHTML, attachBlogCardListeners } from './blog-card.js'

// Slideshow Modal Instance
const slideshowModal = typeof document !== 'undefined' ? new SlideshowModal().init() : null;

// Project Data State
let projects = [];

// DOM Elements (guarded for node / test environments)
const grid = typeof document !== 'undefined' ? document.getElementById('portfolio-grid') : null;
const filterContainer = typeof document !== 'undefined' ? document.querySelector('.portfolio-filters') : null;

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

  return `<article class="project-card glass fade-in-up" style="animation-delay: ${(index * 0.08).toFixed(2)}s">
    ${imageBlock}
    <div class="card-content">
      <p class="card-tags">${escapeHtml((project.tags || []).slice(0, 3).join(' • '))}</p>
      <h3${headingAttrs}>${title}</h3>
      <p class="card-description">${escapeHtml(displayDesc)}</p>
      ${renderActionButtons(project)}
    </div>
  </article>`;
}

// Project Card DOM Generator
export function createProjectCard(project, index = 0) {
  const template = document.createElement('template');
  template.innerHTML = renderProjectCardHTML(project, index).trim();
  return template.content.firstElementChild;
}

// Dynamic Filters
export function generateFilters() {
  if (!filterContainer) return;
  const existingCategories = new Set(projects.map(p => p.category || 'other'));
  const categories = categoryOrder.filter(cat => cat === 'all' || existingCategories.has(cat));

  existingCategories.forEach(cat => {
    if (!categories.includes(cat)) categories.push(cat);
  });

  // aria-pressed tells a screen reader which filter is currently applied;
  // the `active` class alone only communicates that visually.
  const html = categories.map(cat => `
    <button type="button" class="filter-btn ${cat === 'all' ? 'active' : ''}" data-filter="${escapeHtml(cat)}" aria-pressed="${cat === 'all' ? 'true' : 'false'}">
      ${escapeHtml(categoryLabels[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1)))}
    </button>
  `).join('');

  filterContainer.innerHTML = html;

  filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterContainer.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      renderProjects(btn.dataset.filter);
    });
  });
}

// Announce the result of a filter change. The grid itself is not a live region
// — re-announcing 16 cards would be unusable — so a short status message
// carries the count instead.
function announceProjectCount(count, filter) {
  const status = typeof document !== 'undefined' ? document.getElementById('portfolio-status') : null;
  if (!status) return;
  const label = categoryLabels[filter] || filter;
  status.textContent = count === 0
    ? `No projects in ${label}.`
    : `Showing ${count} ${count === 1 ? 'project' : 'projects'}${filter === 'all' ? '' : ` in ${label}`}.`;
}

// Render Projects
export function renderProjects(filter = 'all') {
  if (!grid) return;

  const filtered = filterProjects(projects, filter);

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="empty-state">No projects found in this category.</p>';
    announceProjectCount(0, filter);
    return;
  }

  grid.innerHTML = filtered.map((project, index) => renderProjectCardHTML(project, index)).join('');
  announceProjectCount(filtered.length, filter);
}

// Delegated interaction for the grid. One listener on the container covers
// every card, including cards that were prerendered into the HTML at build
// time and so were never created by this script.
export function attachGridListeners(container) {
  if (!container || container.dataset.listenersAttached === 'true') return;
  container.dataset.listenersAttached = 'true';

  container.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-slideshow-id]');
    if (!trigger) return;
    const id = Number(trigger.dataset.slideshowId);
    openSlideshow(Number.isNaN(id) ? trigger.dataset.slideshowId : id);
  });

  // `error` does not bubble, so this listener runs in the capture phase.
  container.addEventListener('error', (event) => {
    const img = event.target;
    if (!img || img.tagName !== 'IMG') return;
    const picture = img.closest('picture');
    const initials = img.dataset.fallbackInitials || '??';
    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = initials;
    (picture || img).replaceWith(placeholder);
  }, true);
}

// Fetch Projects
export async function loadProjects() {
  if (typeof fetch === 'undefined') return;
  try {
    const response = await fetch('data/projects.json');
    if (!response.ok) throw new Error('Failed to load projects');
    projects = await response.json();

    generateFilters();

    // Cards prerendered at build time are already correct, so the first load
    // only attaches behaviour. Re-rendering here would blank the grid and
    // repaint identical markup.
    if (!grid || grid.dataset.prerendered !== 'true') {
      renderProjects();
    } else {
      announceProjectCount(projects.length, 'all');
    }
    attachGridListeners(grid);

    if (typeof observer !== 'undefined') {
      setTimeout(() => {
        document.querySelectorAll('.project-card').forEach(card => observer.observe(card));
      }, 100);
    }
  } catch (error) {
    console.error('Error loading projects:', error);
    if (grid) {
      grid.innerHTML = '<p class="error-msg">Failed to load projects. Please try again later.</p>';
    }
  }
}

// Slideshow Modal Bridge
export function openSlideshow(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (project && slideshowModal) {
    slideshowModal.open(project);
  }
}

if (typeof window !== 'undefined') {
  window.openSlideshow = openSlideshow;
}

// ============================================
// BLOG PREVIEW ON HOMEPAGE
// ============================================

export async function loadBlogPreview() {
  if (typeof fetch === 'undefined') return;
  try {
    const response = await fetch('data/blog.json');
    if (!response.ok) return;

    const blogPosts = await response.json();
    const latestPosts = blogPosts
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    const previewGrid = document.getElementById('blog-preview-grid');
    if (!previewGrid) return;

    // Already prerendered at build time: attach behaviour, do not repaint.
    if (previewGrid.dataset.prerendered !== 'true') {
      previewGrid.innerHTML = latestPosts
        .map((post, index) => renderBlogCardHTML(post, index, { dateStyle: 'short' }))
        .join('');
    }
    attachBlogCardListeners(previewGrid);
  } catch (error) {
    console.error('Error loading blog preview:', error);
  }
}

// Browser Runtime Initialization
const isTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !isTestEnv) {
  // Initial Render
  loadProjects();

  // Intersection Observer
  if (typeof IntersectionObserver !== 'undefined') {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => observer.observe(section));
  }

  // ============================================
  // SCROLL-BASED HEADER & DESKTOP CTA
  // ============================================

  const headerEl = document.querySelector('header');
  const desktopCta = document.getElementById('desktop-cta');

  function handleScroll() {
    const scrollY = window.scrollY;

    if (headerEl) {
      headerEl.classList.toggle('scrolled', scrollY > 80);
    }

    if (desktopCta) {
      desktopCta.classList.toggle('visible', scrollY > 600);
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Load blog preview
  loadBlogPreview();

  // ============================================
  // CERTIFICATE LIGHTBOX
  // ============================================
  const certThumbBtn = document.getElementById('cert-thumb-btn');
  const certLightbox = document.getElementById('cert-lightbox');
  const certLightboxClose = document.getElementById('cert-lightbox-close');

  function openCertLightbox() {
    certLightbox.classList.add('is-open');
    certLightbox.removeAttribute('inert');
    document.body.style.overflow = 'hidden';
    certLightboxClose.focus();
  }

  function closeCertLightbox() {
    certLightbox.classList.remove('is-open');
    certLightbox.setAttribute('inert', '');
    document.body.style.overflow = '';
    certThumbBtn.focus();
  }

  if (certThumbBtn && certLightbox && certLightboxClose) {
    // Belt and braces alongside `visibility: hidden` in CSS: a closed dialog
    // must not be focusable or announced.
    certLightbox.setAttribute('inert', '');

    certThumbBtn.addEventListener('click', openCertLightbox);
    certLightboxClose.addEventListener('click', closeCertLightbox);
    certLightbox.addEventListener('click', (e) => {
      if (e.target === certLightbox) closeCertLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (!certLightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        closeCertLightbox();
      } else if (e.key === 'Tab') {
        // The dialog holds a single control, so Tab simply stays on it.
        e.preventDefault();
        certLightboxClose.focus();
      }
    });
  }
}

export { getProjectDestinations, getLiveLinkKind, getLiveLinkLabel };
