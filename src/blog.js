import './style.css'

// Blog State
let blogPosts = [];

// Determine which page we're on
const currentPage = window.location.pathname.split('/').pop();

// Initialize based on page
if (currentPage === 'blog.html' || currentPage === '') {
    initBlogIndex();
} else if (currentPage === 'blog-post.html') {
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
        const response = await fetch('./data/blog.json');
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
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Render filtered posts
            renderBlogGrid(btn.dataset.filter);
        });
    });
}

function renderBlogGrid(filter = 'all') {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const filtered = filter === 'all'
        ? blogPosts
        : blogPosts.filter(post => post.category === filter);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">No posts found in this category.</div>';
        return;
    }

    filtered.forEach((post, index) => {
        const card = createBlogCard(post, index);
        grid.appendChild(card);
    });
}

function createBlogCard(post, index) {
    const card = document.createElement('div');
    card.className = 'blog-card glass fade-in-up';
    card.style.animationDelay = `${index * 0.1}s`;

    const categoryLabel = getCategoryLabel(post.category);
    const formattedDate = formatDate(post.date);

    card.innerHTML = `
    <div class="blog-card-image">
      ${post.thumbnail ?
            `<img src="${post.thumbnail}" alt="${post.title}" onerror="this.parentElement.innerHTML='<div class=\\'blog-placeholder\\'>${getInitials(post.title)}</div>'">` :
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

// ============================================
// BLOG POST PAGE
// ============================================

async function initBlogPost() {
    await loadBlogPosts();

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        showError('No blog post specified');
        return;
    }

    const post = blogPosts.find(p => p.slug === slug);

    if (!post) {
        showError('Blog post not found');
        return;
    }

    renderBlogPost(post);
    setupReadingProgress();
    setupShareButtons(post);
    setupBackToTop();
    setupCodeCopy();
    highlightCode();
}

function renderBlogPost(post) {
    // Update page title and meta
    document.getElementById('page-title').textContent = `${post.title} - Olorunfemi John`;
    document.getElementById('page-description').setAttribute('content', post.excerpt);

    // Update article header
    document.getElementById('article-category').textContent = getCategoryLabel(post.category);
    document.getElementById('article-date').textContent = formatDate(post.date);
    document.getElementById('article-reading-time').textContent = `${post.readingTime} min read`;
    document.getElementById('article-title').textContent = post.title;
    document.getElementById('article-author').textContent = post.author;

    // Featured image
    const featuredImageContainer = document.getElementById('featured-image-container');
    if (post.thumbnail) {
        featuredImageContainer.innerHTML = `<img src="${post.thumbnail}" alt="${post.title}">`;
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

function getCategoryLabel(category) {
    const labels = {
        'web': 'Web Dev',
        'mobile': 'Mobile Dev',
        'tutorial': 'Tutorial',
        'thoughts': 'Thoughts'
    };
    return labels[category] || category;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getInitials(title) {
    if (!title) return '??';
    return title.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
