import './style.css'
import { SlideshowModal } from './components/SlideshowModal/SlideshowModal.js'
import { getProjectDestinations, getLiveLinkKind, getLiveLinkLabel } from './project-links.js'
import { escapeHtml } from './escape.js'
import { renderBlogCardHTML, attachBlogCardListeners } from './blog-card.js'
import {
  categoryLabels,
  categoryOrder,
  filterProjects,
  getInitials,
  truncateText,
  renderImageContent,
  renderActionButtons,
  renderProjectCardHTML,
  renderCompactCardHTML,
  renderPortfolioHTML,
  renderFiltersHTML
} from './project-card.js'

export {
  categoryLabels,
  categoryOrder,
  filterProjects,
  getInitials,
  truncateText,
  renderImageContent,
  renderActionButtons,
  renderProjectCardHTML,
  renderCompactCardHTML,
  renderPortfolioHTML,
  renderFiltersHTML
}

// Slideshow Modal Instance
const slideshowModal = typeof document !== 'undefined' ? new SlideshowModal().init() : null;

// Project Data State
let projects = [];

// DOM Elements (guarded for node / test environments)
const grid = typeof document !== 'undefined' ? document.getElementById('portfolio-grid') : null;
const filterContainer = typeof document !== 'undefined' ? document.querySelector('.portfolio-filters') : null;

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
  grid.innerHTML = renderPortfolioHTML(projects, filter);
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
