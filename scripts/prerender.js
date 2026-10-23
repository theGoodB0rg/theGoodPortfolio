// Build-time prerendering.
//
// The site is static, but its two most important sections were not: the
// project grid and every blog post were injected by JavaScript after a fetch.
// Crawlers that do not run JS -- which is most AI crawlers and every social
// unfurler -- saw a portfolio with no projects and a post that said "Loading
// article...". This step bakes that content into the shipped HTML.
//
// It runs after `vite build` and rewrites files in dist/ in place, reusing the
// very same render functions the browser uses so the two cannot drift.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

import { renderProjectCardHTML, renderFiltersHTML } from '../src/project-card.js';
import { renderBlogCardHTML, postUrl, getCategoryLabel, formatDate } from '../src/blog-card.js';
import { escapeHtml } from '../src/escape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

const SITE_URL = 'https://thegoodb0rg.pages.dev';
const AUTHOR = 'Olorunfemi John';

const readJson = file => JSON.parse(fs.readFileSync(path.join(PUBLIC, 'data', file), 'utf-8'));
const readDist = file => fs.readFileSync(path.join(DIST, file), 'utf-8');
const writeDist = (file, html) => {
  const target = path.join(DIST, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf-8');
};

const absolute = relPath => `${SITE_URL}/${String(relPath).replace(/^\.?\//, '')}`;

// ---------------------------------------------------------------- head tags

function setHead(document, { title, description, canonical, ogType = 'website', image, publishedTime, tags }) {
  const head = document.head;

  const upsert = (selector, create) => {
    let el = head.querySelector(selector);
    if (!el) {
      el = create();
      head.appendChild(el);
    }
    return el;
  };

  if (title) {
    const titleEl = upsert('title', () => document.createElement('title'));
    titleEl.textContent = title;
  }

  const meta = (attr, key, value) => {
    if (!value) return;
    const el = upsert(`meta[${attr}="${key}"]`, () => {
      const m = document.createElement('meta');
      m.setAttribute(attr, key);
      return m;
    });
    el.setAttribute('content', value);
  };

  meta('name', 'description', description);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', canonical);
  meta('property', 'og:type', ogType);
  meta('property', 'og:image', image);
  meta('property', 'og:site_name', AUTHOR);
  meta('name', 'twitter:card', 'summary_large_image');
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  meta('name', 'twitter:image', image);

  if (publishedTime) {
    meta('property', 'article:published_time', publishedTime);
    meta('property', 'article:author', AUTHOR);
  }
  (tags || []).forEach(tag => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'article:tag');
    m.setAttribute('content', tag);
    head.appendChild(m);
  });

  // One canonical per page, so the Cloudflare host wins over the GitHub Pages
  // mirror instead of the two competing as duplicate content.
  if (canonical) {
    const link = upsert('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    });
    link.setAttribute('href', canonical);
  }
}

function addJsonLd(document, data) {
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  // JSON.stringify escapes nothing HTML-significant except via this guard:
  // a "</script>" inside a string value would otherwise close the tag early.
  script.textContent = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  document.head.appendChild(script);
}

// ------------------------------------------------------------------- index

function prerenderIndex(projects, posts) {
  const dom = new JSDOM(readDist('index.html'));
  const { document } = dom.window;

  const filters = document.querySelector('.portfolio-filters');
  if (filters) filters.innerHTML = renderFiltersHTML(projects);

  const grid = document.getElementById('portfolio-grid');
  if (grid) {
    grid.innerHTML = projects.map((p, i) => renderProjectCardHTML(p, i)).join('');
    grid.dataset.prerendered = 'true';
  }

  const status = document.getElementById('portfolio-status');
  if (status) status.textContent = `Showing ${projects.length} projects.`;

  const previewGrid = document.getElementById('blog-preview-grid');
  if (previewGrid) {
    previewGrid.innerHTML = posts
      .slice(0, 3)
      .map((post, i) => renderBlogCardHTML(post, i, { dateStyle: 'short' }))
      .join('');
    previewGrid.dataset.prerendered = 'true';
  }

  setHead(document, { canonical: `${SITE_URL}/` });

  addJsonLd(document, {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#person`,
        name: AUTHOR,
        alternateName: 'Olorunfemi J.E.',
        jobTitle: 'AI Automation & Full-Stack Engineer',
        description:
          'AI automation and full-stack engineer building production AI pipelines, data tools, and full-stack platforms.',
        url: `${SITE_URL}/`,
        image: absolute('profile.png'),
        email: 'mailto:theregalstarlite@gmail.com',
        sameAs: [
          'https://github.com/theGoodB0rg',
          'https://www.linkedin.com/in/john-olorunfemi',
          'https://x.com/JohnOlorun90448'
        ],
        knowsAbout: [
          'AI Automation',
          'LLM Pipelines',
          'Full-Stack Development',
          'Android Development',
          'Kotlin',
          'Jetpack Compose',
          'Python',
          'TypeScript',
          'Web Accessibility',
          'WCAG 2.2',
          'Cyber Security'
        ],
        alumniOf: [
          { '@type': 'CollegeOrUniversity', name: 'Kogi State University, Anyigba' },
          { '@type': 'CollegeOrUniversity', name: 'University of Ibadan' }
        ],
        worksFor: { '@type': 'Organization', name: 'UtilityFirst' }
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: `${AUTHOR} — Portfolio`,
        publisher: { '@id': `${SITE_URL}/#person` },
        inLanguage: 'en'
      },
      {
        '@type': 'ItemList',
        name: 'Selected Work',
        numberOfItems: projects.length,
        itemListElement: projects.map((project, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: project.title,
            description: project.description || project.details,
            applicationCategory: project.category === 'mobile' ? 'MobileApplication' : 'WebApplication',
            keywords: (project.tags || []).join(', '),
            author: { '@id': `${SITE_URL}/#person` },
            ...(project.play_store_link || project.live_link || project.link
              ? { url: project.play_store_link || project.live_link || project.link }
              : {})
          }
        }))
      }
    ]
  });

  writeDist('index.html', dom.serialize());
  return projects.length;
}

// -------------------------------------------------------------- blog index

function prerenderBlogIndex(posts) {
  const dom = new JSDOM(readDist('blog.html'));
  const { document } = dom.window;

  const grid = document.getElementById('blog-grid');
  if (grid) {
    grid.innerHTML = posts.map((post, i) => renderBlogCardHTML(post, i)).join('');
    grid.dataset.prerendered = 'true';
  }

  const status = document.getElementById('blog-status');
  if (status) status.textContent = `Showing ${posts.length} posts.`;

  setHead(document, { canonical: `${SITE_URL}/blog.html` });

  addJsonLd(document, {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE_URL}/blog.html#blog`,
    name: `${AUTHOR} — Blog`,
    url: `${SITE_URL}/blog.html`,
    author: { '@type': 'Person', name: AUTHOR, url: `${SITE_URL}/` },
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      datePublished: post.date,
      url: absolute(postUrl(post.slug)),
      description: post.excerpt
    }))
  });

  writeDist('blog.html', dom.serialize());
}

// --------------------------------------------------------------- blog post

// A post page lives two directories below the root, so document-relative
// links written for the root ("index.html", "./profile.png") have to be
// rewritten. Vite already emits absolute /assets/ paths, which need no change.
function rewriteRelativeUrls(document, prefix) {
  const attrs = [['a', 'href'], ['img', 'src'], ['source', 'srcset'], ['link', 'href'], ['script', 'src']];

  for (const [tag, attr] of attrs) {
    document.querySelectorAll(`${tag}[${attr}]`).forEach(el => {
      const value = el.getAttribute(attr);
      if (!value) return;
      // Leave absolute URLs, protocol-relative URLs, fragments and data URIs.
      if (/^(https?:)?\/\//.test(value) || value.startsWith('/') || value.startsWith('#') || value.startsWith('data:') || value.startsWith('mailto:')) return;
      el.setAttribute(attr, prefix + value.replace(/^\.\//, ''));
    });
  }
}

// A post page sits at /blog/<slug>/, so a sibling post is two levels up and
// back down again -- '../' alone would resolve to /blog/blog/<slug>/.
function renderPostNavigation(prev, next) {
  let html = '<div class="post-nav-links">';
  if (prev) {
    html += `<a href="${postUrl(prev.slug, '../../')}" class="nav-link prev-link" rel="prev">
        <span class="nav-label">← Previous</span>
        <span class="nav-title">${escapeHtml(prev.title)}</span>
      </a>`;
  }
  if (next) {
    html += `<a href="${postUrl(next.slug, '../../')}" class="nav-link next-link" rel="next">
        <span class="nav-label">Next →</span>
        <span class="nav-title">${escapeHtml(next.title)}</span>
      </a>`;
  }
  html += '</div>';
  return html;
}

function prerenderPost(post, prev, next, template) {
  const dom = new JSDOM(template);
  const { document } = dom.window;
  const canonical = absolute(postUrl(post.slug));
  const image = post.thumbnail ? absolute(post.thumbnail) : absolute('og-image.png');

  rewriteRelativeUrls(document, '../../');

  document.body.dataset.page = 'blog-post';
  document.body.dataset.base = '../../';
  document.body.dataset.slug = post.slug;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('article-category', getCategoryLabel(post.category));
  set('article-date', formatDate(post.date));
  set('article-reading-time', `${post.readingTime} min read`);
  set('article-title', post.title);
  set('article-author', post.author || AUTHOR);

  const dateEl = document.getElementById('article-date');
  if (dateEl) dateEl.setAttribute('datetime', post.date);

  const featured = document.getElementById('featured-image-container');
  if (featured) {
    featured.innerHTML = post.thumbnail
      ? `<picture><source srcset="../../${post.thumbnail.replace(/\.(png|jpg|jpeg)$/i, '.webp')}" type="image/webp"><img src="../../${post.thumbnail}" alt="${escapeHtml(post.title)}" loading="eager" decoding="async"></picture>`
      : '';
  }

  // post.content is hand-authored HTML in blog.json, so it is inserted as
  // markup by design -- the same way the client already rendered it.
  const content = document.getElementById('article-content');
  if (content) content.innerHTML = post.content || '';

  const tagsEl = document.getElementById('article-tags');
  if (tagsEl) {
    tagsEl.innerHTML = (post.tags || [])
      .map(tag => `<span class="article-tag">${escapeHtml(tag)}</span>`)
      .join('');
  }

  const nav = document.getElementById('post-navigation');
  if (nav) nav.innerHTML = renderPostNavigation(prev, next);

  const article = document.getElementById('blog-post');
  if (article) article.dataset.prerendered = 'true';

  // Embed the post so the client needs no fetch and no query string.
  const data = document.createElement('script');
  data.setAttribute('type', 'application/json');
  data.id = 'post-data';
  data.textContent = JSON.stringify({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    category: post.category,
    readingTime: post.readingTime,
    tags: post.tags || []
  }).replace(/</g, '\\u003c');
  document.body.appendChild(data);

  setHead(document, {
    title: `${post.title} — ${AUTHOR}`,
    description: post.excerpt,
    canonical,
    ogType: 'article',
    image,
    publishedTime: post.date,
    tags: post.tags
  });

  addJsonLd(document, {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author || AUTHOR, url: `${SITE_URL}/` },
    publisher: { '@type': 'Person', name: AUTHOR, url: `${SITE_URL}/` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    url: canonical,
    image,
    keywords: (post.tags || []).join(', '),
    articleSection: getCategoryLabel(post.category),
    timeRequired: `PT${post.readingTime}M`,
    inLanguage: 'en'
  });

  writeDist(path.join('blog', post.slug, 'index.html'), dom.serialize());
}

// Old ?slug= links keep working: the stub forwards to the real URL.
// The forwarding logic lives in its own file rather than an inline <script>,
// so the Content-Security-Policy can refuse inline script outright.
function writeRedirectStub(posts) {
  const map = Object.fromEntries(posts.map(p => [p.slug, postUrl(p.slug, '')]));

  writeDist(
    'blog-redirect.js',
    `// Generated by scripts/prerender.js -- forwards legacy /blog-post.html?slug=
// links to the per-post URLs introduced when the blog became prerendered.
const MAP = ${JSON.stringify(map, null, 2)};

const slug = new URLSearchParams(window.location.search).get('slug');
const target = slug && Object.prototype.hasOwnProperty.call(MAP, slug) ? MAP[slug] : 'blog.html';

const fallback = document.getElementById('fallback');
if (fallback) fallback.href = target;

window.location.replace(target);
`
  );

  writeDist(
    'blog-post.html',
    `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Redirecting — ${AUTHOR}</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${SITE_URL}/blog.html">
</head>
<body>
<p>Redirecting to the article. <a id="fallback" href="blog.html">Continue to the blog</a>.</p>
<script type="module" src="blog-redirect.js"></script>
</body>
</html>
`
  );
}

// ----------------------------------------------------- discovery artefacts

function writeSitemap(posts) {
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE_URL}/blog.html`, priority: '0.8', changefreq: 'weekly' },
    ...posts.map(post => ({
      loc: absolute(postUrl(post.slug)),
      lastmod: post.date,
      priority: '0.7',
      changefreq: 'monthly'
    }))
  ];

  const body = urls
    .map(
      u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  writeDist(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
  );
}

function writeRobots() {
  // The point of this build step is to be readable by AI, so the major AI
  // crawlers are allowed explicitly rather than left to a default. Abusive
  // traffic belongs behind edge rate limiting, not a robots directive.
  writeDist(
    'robots.txt',
    `# Everything here is meant to be read, by people and by machines alike.
User-agent: *
Allow: /

# Named explicitly so a future default-deny does not quietly hide this site.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
  );
}

function writeFeed(posts) {
  const items = posts
    .map(
      post => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${absolute(postUrl(post.slug))}</link>
      <guid isPermaLink="true">${absolute(postUrl(post.slug))}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeHtml(post.excerpt)}</description>
      <category>${escapeHtml(getCategoryLabel(post.category))}</category>
    </item>`
    )
    .join('\n');

  writeDist(
    'feed.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${AUTHOR} — Blog</title>
    <link>${SITE_URL}/blog.html</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Deep dives and dev notes on AI automation, full-stack engineering and Android.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`
  );
}

// A plain-text index for LLM agents: the whole site in one cheap fetch.
function writeLlmsTxt(projects, posts) {
  const projectLines = projects
    .map(p => {
      const links = [p.play_store_link && `Google Play: ${p.play_store_link}`, p.live_link && `Website: ${p.live_link}`, p.link && `Source: ${p.link}`]
        .filter(Boolean)
        .join(' | ');
      return `- **${p.title}** (${p.category}) — ${p.description || p.details}${links ? `\n  ${links}` : ''}`;
    })
    .join('\n');

  const postLines = posts
    .map(post => `- [${post.title}](${absolute(postUrl(post.slug))}) — ${post.excerpt}`)
    .join('\n');

  writeDist(
    'llms.txt',
    `# ${AUTHOR}

> AI automation and full-stack engineer. Designs end-to-end systems: production
> AI pipelines, data tools, and full-stack platforms. M.Sc. Cyber Security
> (University of Ibadan), B.Sc. Computer Science (Kogi State University).
> Web accessibility engineer and assistive-technology auditor at AudioEye.

Site: ${SITE_URL}/
Contact: theregalstarlite@gmail.com
GitHub: https://github.com/theGoodB0rg
LinkedIn: https://www.linkedin.com/in/john-olorunfemi

## Projects

${projectLines}

## Publications

- **CyberSec: Vulnerability Detection Platform for Ethical Hacking** — Olorunfemi J.E.,
  Adeniji O.D. et al., Dept. of Computer Science, University of Ibadan.
  Accepted for Springer LNNS publication, WorldS4 2026, London, 28–30 July 2026.
  Reduced interaction cost by ~95% (377 actions → 20) with near-zero time overhead.

## Writing

${postLines}

## Machine-readable data

- Projects: ${SITE_URL}/data/projects.json
- Blog posts: ${SITE_URL}/data/blog.json
- Sitemap: ${SITE_URL}/sitemap.xml
- RSS: ${SITE_URL}/feed.xml
`
  );
}

// ------------------------------------------------------------------- main

function main() {
  if (!fs.existsSync(DIST)) {
    throw new Error('dist/ not found — run vite build first.');
  }

  const projects = readJson('projects.json');
  const posts = readJson('blog.json').sort((a, b) => new Date(b.date) - new Date(a.date));

  // blog-post.html is both the template for every post page and, by the end of
  // this run, the ?slug= redirect stub that replaces it. Running the script
  // twice against the same dist/ would therefore build all eight posts out of
  // the stub. Fail loudly instead of producing eight redirect pages.
  const template = readDist('blog-post.html');
  if (template.includes('blog-redirect.js')) {
    throw new Error(
      'dist/blog-post.html is the redirect stub from a previous prerender run, not the page template. ' +
      'Run a full `npm run build` (vite build regenerates the template) rather than `npm run prerender` on its own.'
    );
  }

  prerenderIndex(projects, posts);
  prerenderBlogIndex(posts);

  posts.forEach((post, i) => {
    // Newest first, so "previous" is the next item along.
    prerenderPost(post, posts[i + 1] || null, posts[i - 1] || null, template);
  });

  writeRedirectStub(posts);
  writeSitemap(posts);
  writeRobots();
  writeFeed(posts);
  writeLlmsTxt(projects, posts);

  console.log('🧱 Prerendered static HTML:');
  console.log(`   - index.html: ${projects.length} project cards + ${Math.min(3, posts.length)} post previews`);
  console.log(`   - blog.html: ${posts.length} post cards`);
  console.log(`   - blog/<slug>/index.html: ${posts.length} full articles`);
  console.log('   - sitemap.xml, robots.txt, feed.xml, llms.txt');
}

main();
