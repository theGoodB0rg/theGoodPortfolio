// Shared blog card markup.
//
// The homepage preview, the blog index and scripts/prerender.js all render the
// same card from here, so a post cannot be described one way in the grid and
// another way in the prerendered HTML.

import { escapeHtml, safeUrl } from './escape.js';

const CATEGORY_LABELS = {
  web: 'Web Dev',
  mobile: 'Mobile Dev',
  tutorial: 'Tutorial',
  thoughts: 'Thoughts'
};

export function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || '';
}

// Fixed to en-US rather than the visitor's locale so the server-rendered date
// and the client-rendered date are always the same string.
export function formatDate(dateString, style = 'long') {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

export function getPostInitials(title) {
  if (!title) return '??';
  return title.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Every post gets its own directory so it is a real, crawlable URL rather than
// a query string against one shared page. `prefix` lets a page that already
// lives inside /blog/ link sideways to its neighbours.
export function postUrl(slug, prefix = '') {
  return `${prefix}blog/${encodeURIComponent(slug)}/`;
}

export function renderBlogCardHTML(post, index = 0, options = {}) {
  const { prefix = '', dateStyle = 'long' } = options;
  const title = escapeHtml(post.title);
  const initials = escapeHtml(getPostInitials(post.title));

  const image = post.thumbnail
    ? `<picture><source srcset="${safeUrl(post.thumbnail.replace(/\.(png|jpg|jpeg)$/i, '.webp'))}" type="image/webp"><img src="${safeUrl(post.thumbnail)}" alt="${title}" loading="lazy" decoding="async" data-fallback-initials="${initials}"></picture>`
    : `<div class="blog-placeholder" aria-hidden="true">${initials}</div>`;

  return `<article class="blog-card glass fade-in-up" style="animation-delay: ${(index * 0.1).toFixed(2)}s">
    <div class="blog-card-image">
      ${image}
      ${post.featured ? '<span class="featured-badge">Featured</span>' : ''}
    </div>
    <div class="blog-card-content">
      <div class="blog-card-meta">
        <span class="blog-category">${escapeHtml(getCategoryLabel(post.category))}</span>
        <time class="blog-date" datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date, dateStyle))}</time>
      </div>
      <h3>${title}</h3>
      <p class="blog-excerpt">${escapeHtml(post.excerpt)}</p>
      <div class="blog-card-footer">
        <span class="reading-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${escapeHtml(post.readingTime)} min read
        </span>
        <a href="${postUrl(post.slug, prefix)}" class="read-more-link" aria-label="Read ${title}">
          Read More →
        </a>
      </div>
    </div>
  </article>`;
}

// Shared image-failure handling for any container holding blog cards.
export function attachBlogCardListeners(container) {
  if (!container || container.dataset.listenersAttached === 'true') return;
  container.dataset.listenersAttached = 'true';

  // `error` does not bubble, so listen during the capture phase.
  container.addEventListener('error', (event) => {
    const img = event.target;
    if (!img || img.tagName !== 'IMG') return;
    const placeholder = document.createElement('div');
    placeholder.className = 'blog-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = img.dataset.fallbackInitials || '??';
    (img.closest('picture') || img).replaceWith(placeholder);
  }, true);
}
