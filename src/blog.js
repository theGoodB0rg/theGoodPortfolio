import './style.css'
import { renderBlogCardHTML, attachBlogCardListeners, getCategoryLabel, formatDate, postUrl } from './blog-card.js';
import { escapeHtml, safeUrl } from './escape.js';

// Blog State
let blogPosts = [];

// Which page this is, and how far it sits below the site root. Posts live at
// /blog/<slug>/ once prerendered, so the path can no longer be inferred from
// the filename -- the page declares both on <body>.
const pageKind = document.body.dataset.page
    || (window.location.pathname.includes('blog-post') ? 'blog-post' : 'blog-index');
const dataBase = document.body.dataset.base || './';

if (pageKind === 'blog-index') {
    initBlogIndex();
} else if (pageKind === 'blog-post') {
    initBlogPost();
}

// ============================================
// BLOG INDEX PAGE
// ============================================

async function initBlogIndex() {
    await loadBlogPosts();
    setupFilters();
    renderBlogGrid();

    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.blog-card').forEach(card => observer.observe(card));
}

async function loadBlogPosts() {
    try {
        const response = await fetch(`${dataBase}data/blog.json`);
        if (!response.ok) throw new Error('Failed to load blog posts');
        blogPosts = await response.json();

        // Sort by date (newest first)
        blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error loading blog posts:', error);
        const grid = document.getElementById('blog-grid');
        if (grid) {
            grid.innerHTML = '<p class="error-msg">Failed to load blog posts. Please try again later.</p>';
        }
    }
}

function setupFilters() {
    const filterButtons = document.querySelectorAll('#blog-filter-buttons .filter-btn');

    filterButtons.forEach(btn => {
        if (!btn.hasAttribute('aria-pressed')) {
            btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        }
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            // Render filtered posts
            renderBlogGrid(btn.dataset.filter);
        });
    });
}

function renderBlogGrid(filter = 'all') {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;

    const filtered = filter === 'all'
        ? blogPosts
        : blogPosts.filter(post => post.category === filter);

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-state">No posts found in this category.</p>';
        announcePostCount(0, filter);
        return;
    }

    grid.innerHTML = filtered.map((post, index) => renderBlogCardHTML(post, index)).join('');
    attachBlogCardListeners(grid);
    announcePostCount(filtered.length, filter);
}

function announcePostCount(count, filter) {
    const status = document.getElementById('blog-status');
    if (!status) return;
    const label = filter === 'all' ? '' : ` in ${getCategoryLabel(filter)}`;
    status.textContent = count === 0
        ? `No posts${label}.`
        : `Showing ${count} ${count === 1 ? 'post' : 'posts'}${label}.`;
}

// ============================================
// BLOG POST PAGE
// ============================================

async function initBlogPost() {
    const article = document.getElementById('blog-post');
    const prerendered = article && article.dataset.prerendered === 'true';

    // A prerendered page already carries the post inline, so it needs no
    // network round trip and must not be repainted.
    const inline = document.getElementById('post-data');
    let post = null;

    if (inline) {
        try {
            post = JSON.parse(inline.textContent);
        } catch (error) {
            console.error('Could not read embedded post data:', error);
        }
    }

    if (!post) {
        await loadBlogPosts();
        const slug = document.body.dataset.slug
            || new URLSearchParams(window.location.search).get('slug');

        if (!slug) {
            showError('No blog post specified');
            return;
        }

        post = blogPosts.find(p => p.slug === slug);

        if (!post) {
            showError('Blog post not found');
            return;
        }
    }

    if (!prerendered) {
        renderBlogPost(post);
    }

    setupReadingProgress();
    setupShareButtons(post);
    setupBackToTop();
    setupCodeCopy();
    highlightCode();
}

function renderBlogPost(post) {
    const baseUrl = 'https://thegoodb0rg.pages.dev';
    const postUrl = `${baseUrl}/blog-post?slug=${post.slug}`;

    // Update page title and meta
    document.getElementById('page-title').textContent = `${post.title} - Olorunfemi John`;
    document.getElementById('page-description').setAttribute('content', post.excerpt);

    // Update OG tags
    const ogTitle = `${post.title} — Olorunfemi John`;
    const ogImage = post.thumbnail ? `${baseUrl}/${post.thumbnail}` : `${baseUrl}/og-image.png`;

    setMeta('og-title', 'content', ogTitle);
    setMeta('og-description', 'content', post.excerpt);
    setMeta('og-image', 'content', ogImage);
    setMeta('twitter-title', 'content', ogTitle);
    setMeta('twitter-description', 'content', post.excerpt);
    setMeta('twitter-image', 'content', ogImage);

    // Update og:url to point to the specific post
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', postUrl);

    // Update article header
    document.getElementById('article-category').textContent = getCategoryLabel(post.category);
    document.getElementById('article-date').textContent = formatDate(post.date);
    document.getElementById('article-reading-time').textContent = `${post.readingTime} min read`;
    document.getElementById('article-title').textContent = post.title;
    document.getElementById('article-author').textContent = post.author;

    // Featured image
    const featuredImageContainer = document.getElementById('featured-image-container');
    if (post.thumbnail) {
        featuredImageContainer.innerHTML = `<picture><source srcset="${post.thumbnail.replace(/\.(png|jpg|jpeg)$/i, '.webp')}" type="image/webp"><img src="${post.thumbnail}" alt="${post.title}" loading="lazy"></picture>`;
    } else {
        featuredImageContainer.style.display = 'none';
    }

    // Article content
    document.getElementById('article-content').innerHTML = post.content;

    // Tags
    const tagsContainer = document.getElementById('article-tags');
    tagsContainer.innerHTML = post.tags.map(tag =>
        `<span class="tag">${tag}</span>`
    ).join('');

    // Post navigation
    renderPostNavigation(post);
}

function renderPostNavigation(currentPost) {
    const currentIndex = blogPosts.findIndex(p => p.id === currentPost.id);
    const prevPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;
    const nextPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;

    const navContainer = document.getElementById('post-navigation');

    let navHTML = '<div class="nav-links">';

    if (prevPost) {
        navHTML += `
      <a href="blog-post.html?slug=${prevPost.slug}" class="nav-link prev-link">
        <span class="nav-label">← Previous</span>
        <span class="nav-title">${prevPost.title}</span>
      </a>
    `;
    } else {
        navHTML += '<div></div>';
    }

    if (nextPost) {
        navHTML += `
      <a href="blog-post.html?slug=${nextPost.slug}" class="nav-link next-link">
        <span class="nav-label">Next →</span>
        <span class="nav-title">${nextPost.title}</span>
      </a>
    `;
    }

    navHTML += '</div>';
    navContainer.innerHTML = navHTML;
}

function setupReadingProgress() {
    const progressBar = document.getElementById('reading-progress');

    window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = window.scrollY;
        const progress = (scrolled / documentHeight) * 100;

        progressBar.style.width = `${Math.min(progress, 100)}%`;
    });
}

function setupShareButtons(post) {
    const url = window.location.href;
    const title = post.title;

    // Twitter
    document.getElementById('share-twitter').addEventListener('click', () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    });

    // LinkedIn
    document.getElementById('share-linkedin').addEventListener('click', () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(linkedinUrl, '_blank', 'width=550,height=420');
    });

    // Copy Link
    document.getElementById('share-copy').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(url);
            const btn = document.getElementById('share-copy');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });
}

function setupBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function setupCodeCopy() {
    // Add copy buttons to code blocks
    document.querySelectorAll('pre code').forEach((block) => {
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.textContent = 'Copy';

        button.addEventListener('click', async () => {
            const code = block.textContent;
            try {
                await navigator.clipboard.writeText(code);
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        });

        const pre = block.parentElement;
        pre.style.position = 'relative';
        pre.appendChild(button);
    });
}

// Syntax highlighting is opt-in. highlight.js used to load from cdnjs on every
// post page -- roughly 100KB of third-party script and CSS for the zero code
// blocks the posts actually contain, and the one thing standing between this
// site and a CSP without a third-party script-src.
//
// To bring it back when a post needs it, bundle a subset rather than a CDN:
//   npm i highlight.js
//   import hljs from 'highlight.js/lib/core';
//   import javascript from 'highlight.js/lib/languages/javascript';
//   hljs.registerLanguage('javascript', javascript);
//   import 'highlight.js/styles/atom-one-dark.css';
// and assign it to `window.hljs`, or call hljs.highlightElement here directly.
function highlightCode() {
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================


function setMeta(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
}

function showError(message) {
    const content = document.getElementById('article-content');
    if (content) {
        content.innerHTML = `
      <div class="error-state">
        <h2>Oops!</h2>
        <p>${message}</p>
        <a href="blog.html" class="btn btn-primary">Back to Blog</a>
      </div>
    `;
    }
}
