import './style.css'
import { SlideshowModal } from './components/SlideshowModal/SlideshowModal.js'
import { getProjectDestinations, getLiveLinkKind, getLiveLinkLabel } from './project-links.js'

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
  const fallbackText = getInitials(project.title);
  if (!project.thumb) {
    return `<div class="card-placeholder" aria-hidden="true">${fallbackText}</div>`;
  }
  const thumbWebp = project.thumb.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');

  return `<picture>
    <source srcset="${thumbWebp}" type="image/webp">
    <img src="${project.thumb}" alt="${project.title}" loading="lazy" decoding="async" onerror="this.closest('.card-image').innerHTML='<div class=\\'card-placeholder\\'>${fallbackText}</div>'">
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
      <a href="${dest.url}" target="_blank" rel="noopener noreferrer" class="card-btn ${dest.type}" aria-label="${dest.aria}" onclick="event.stopPropagation()">
        ${ACTION_ICONS[dest.type] || ICON_EXTERNAL}
        ${dest.label}
      </a>`).join('');

  return `<div class="card-actions">${buttons}</div>`;
}

// Project Card DOM Generator
export function createProjectCard(project, index = 0) {
  const card = document.createElement('div');
  card.className = 'project-card glass fade-in-up';
  card.style.animationDelay = `${index * 0.08}s`;

  const imageContent = renderImageContent(project);
  const displayDesc = project.description || project.details || '';
  const actionsHtml = renderActionButtons(project);
  const hasImages = project.images && project.images.length > 0;

  const overlayHtml = hasImages ? `<div class="view-overlay flex-center">View Screenshots</div>` : '';
  const cursorStyle = hasImages ? 'cursor: pointer;' : '';
  const clickAttr = hasImages ? `onclick="openSlideshow(${project.id})" tabindex="0" role="button" aria-label="View screenshots for ${project.title}"` : '';

  card.innerHTML = `
    <div class="card-image" ${clickAttr} style="${cursorStyle}">
      ${imageContent}
      ${overlayHtml}
    </div>
    <div class="card-content">
      <div class="card-tags">${(project.tags || []).slice(0, 3).join(' • ')}</div>
      <h3 ${hasImages ? `onclick="openSlideshow(${project.id})" style="cursor: pointer;"` : ''}>${project.title}</h3>
      <p class="card-description">${displayDesc}</p>
      ${actionsHtml}
    </div>
  `;
  return card;
}

// Dynamic Filters
export function generateFilters() {
  if (!filterContainer) return;
  const existingCategories = new Set(projects.map(p => p.category || 'other'));
  const categories = categoryOrder.filter(cat => cat === 'all' || existingCategories.has(cat));

  existingCategories.forEach(cat => {
    if (!categories.includes(cat)) categories.push(cat);
  });

  const html = categories.map(cat => `
    <button class="filter-btn ${cat === 'all' ? 'active' : ''}" data-filter="${cat}">
      ${categoryLabels[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1))}
    </button>
  `).join('');

  filterContainer.innerHTML = html;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.dataset.filter);
    });
  });
}

// Render Projects
export function renderProjects(filter = 'all') {
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = filterProjects(projects, filter);

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state">No projects found in this category.</div>';
    return;
  }

  filtered.forEach((project, index) => {
    const card = createProjectCard(project, index);
    grid.appendChild(card);
  });
}

// Fetch Projects
export async function loadProjects() {
  if (typeof fetch === 'undefined') return;
  try {
    const response = await fetch('data/projects.json');
    if (!response.ok) throw new Error('Failed to load projects');
    projects = await response.json();

    generateFilters();
    renderProjects();

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

export function getBlogCategoryLabel(category) {
  const labels = {
    'web': 'Web Dev',
    'mobile': 'Mobile Dev',
    'tutorial': 'Tutorial',
    'thoughts': 'Thoughts'
  };
  return labels[category] || category;
}

export function formatBlogDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function createBlogPreviewCard(post, index) {
  const card = document.createElement('div');
  card.className = 'blog-card glass fade-in-up';
  card.style.animationDelay = `${index * 0.1}s`;

  const categoryLabel = getBlogCategoryLabel(post.category);
  const formattedDate = formatBlogDate(post.date);

  card.innerHTML = `
    <div class="blog-card-image">
      ${post.thumbnail ?
      `<picture><source srcset="${post.thumbnail.replace(/\.(png|jpg|jpeg)$/i, '.webp')}" type="image/webp"><img src="${post.thumbnail}" alt="${post.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'blog-placeholder\\'>${getInitials(post.title)}</div>'"></picture>` :
      `<div class="blog-placeholder">${getInitials(post.title)}</div>`
    }
      ${post.featured ? '<span class="featured-badge">Featured</span>' : ''}
    </div>
    <div class="blog-card-content">
      <div class="blog-card-meta">
        <span class="blog-category">${categoryLabel}</span>
        <span class="blog-date">${formattedDate}</span>
      </div>
      <h3>${post.title}</h3>
      <p class="blog-excerpt">${post.excerpt}</p>
      <div class="blog-card-footer">
        <span class="reading-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${post.readingTime} min read
        </span>
        <a href="blog-post.html?slug=${post.slug}" class="read-more-link">
          Read More →
        </a>
      </div>
    </div>
  `;

  return card;
}

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

    previewGrid.innerHTML = '';

    latestPosts.forEach((post, index) => {
      const card = createBlogPreviewCard(post, index);
      previewGrid.appendChild(card);
    });
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
    document.body.style.overflow = 'hidden';
    certLightboxClose.focus();
  }

  function closeCertLightbox() {
    certLightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    certThumbBtn.focus();
  }

  if (certThumbBtn && certLightbox && certLightboxClose) {
    certThumbBtn.addEventListener('click', openCertLightbox);
    certLightboxClose.addEventListener('click', closeCertLightbox);
    certLightbox.addEventListener('click', (e) => {
      if (e.target === certLightbox) closeCertLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && certLightbox.classList.contains('is-open')) closeCertLightbox();
    });
  }
}

export { getProjectDestinations, getLiveLinkKind, getLiveLinkLabel };
