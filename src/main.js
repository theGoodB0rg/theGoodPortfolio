import './style.css'

// Project Data State
let projects = [];

// Fetch Projects
async function loadProjects() {
  try {
    const response = await fetch('data/projects.json');
    if (!response.ok) throw new Error('Failed to load projects');
    projects = await response.json();

    generateFilters();
    renderProjects();

    // Update Intersection Observer for new elements
    setTimeout(() => {
      document.querySelectorAll('.project-card').forEach(card => observer.observe(card));
    }, 100);
  } catch (error) {
    console.error('Error loading projects:', error);
    grid.innerHTML = '<p class="error-msg">Failed to load projects. Please try again later.</p>';
  }
}

// DOM Elements
const grid = document.getElementById('portfolio-grid');
const filterContainer = document.querySelector('.portfolio-filters');

// Slideshow State
let currentProject = null;
let currentSlideIndex = 0;

// Dynamic Filters
function generateFilters() {
  // Get unique categories
  const categories = ['all', ...new Set(projects.map(p => p.category || 'other'))];

  const html = categories.map(cat => `
        <button class="filter-btn ${cat === 'all' ? 'active' : ''}" data-filter="${cat}">
            ${cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
    `).join('');

  filterContainer.innerHTML = html;

  // Add Listeners
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.dataset.filter);
    });
  });
}

// Render Projects
function renderProjects(filter = 'all') {
  grid.innerHTML = '';

  const filtered = filter === 'all'
    ? projects
    : projects.filter(p => p.category === filter);

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state">No projects found in this category.</div>';
    return;
  }

  filtered.forEach((project, index) => {
    const card = document.createElement('div');
    card.className = 'project-card glass fade-in-up';
    card.style.animationDelay = `${index * 0.1}s`; // Staggered animation

    // Add click handler
    card.onclick = () => openSlideshow(project.id);

    // Image Handling
    let imageContent;
    if (project.thumb) {
      imageContent = `<img src="${project.thumb}" alt="${project.title}" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\'>${getInitials(project.title)}</div>'">`;
    } else {
      imageContent = `<div class="card-placeholder">${getInitials(project.title)}</div>`;
    }

    card.innerHTML = `
      <div class="card-image">
        ${imageContent}
        <div class="view-overlay flex-center">View Project</div>
      </div>
      <div class="card-content">
        <div class="card-tags">${(project.tags || []).slice(0, 3).join(' • ')}</div>
        <h3>${project.title}</h3>
        <p class="card-description">${truncateText(project.description || '', 100)}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Helpers
function getInitials(title) {
  if (!title) return '??';
  return title.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function truncateText(text, limit) {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.substring(0, limit) + '...';
}

// Slideshow Modal Logic
const modalHtml = `
  <div id="slideshow-modal" class="modal">
    <button class="close-btn">&times;</button>
    <div class="modal-content glass">
      <button class="nav-btn prev-btn">&#10094;</button>
      
      <div class="slide-container">
        <!-- Image Slide -->
        <div id="image-slide" class="slide-view active">
          <img id="slide-img" src="" alt="Project Slide">
          <div class="slide-caption-wrapper">
             <p id="slide-caption"></p>
          </div>
        </div>
        
        <!-- Final Info Slide -->
        <div id="info-slide" class="slide-view">
          <div class="info-content">
             <h2 id="info-title"></h2>
             <div class="info-details">
               <p id="info-desc"></p>
             </div>
             <a id="info-link" href="#" target="_blank" class="btn btn-primary">Visit Project</a>
           </div>
        </div>
      </div>

      <button class="nav-btn next-btn">&#10095;</button>
      
      <div class="slide-info-footer">
        <h3 id="footer-title"></h3>
        <p id="slide-counter"></p>
      </div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHtml);

const modal = document.getElementById('slideshow-modal');
const imageSlide = document.getElementById('image-slide');
const infoSlide = document.getElementById('info-slide');

const slideImg = document.getElementById('slide-img');
const slideCaption = document.getElementById('slide-caption');
const infoTitle = document.getElementById('info-title');
const infoDesc = document.getElementById('info-desc');
const infoLink = document.getElementById('info-link');

const footerTitle = document.getElementById('footer-title');
const slideCounter = document.getElementById('slide-counter');

// Modal Controls
function openSlideshow(projectId) {
  currentProject = projects.find(p => p.id === projectId);
  if (!currentProject) return;

  currentSlideIndex = 0;
  updateSlide();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSlideshow() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function nextSlide() {
  if (!currentProject) return;
  const images = currentProject.images || [];
  const totalSlides = images.length + 1;
  currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
  updateSlide();
}

function prevSlide() {
  if (!currentProject) return;
  const images = currentProject.images || [];
  const totalSlides = images.length + 1;
  currentSlideIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
  updateSlide();
}

function updateSlide() {
  if (!currentProject) return;
  const images = currentProject.images || [];

  // Footer Info
  footerTitle.textContent = currentProject.title;

  if (currentSlideIndex < images.length) {
    // Image Slide
    imageSlide.style.display = 'flex';
    infoSlide.style.display = 'none';

    // Set Content
    const data = images[currentSlideIndex];
    slideImg.src = data.url;
    slideCaption.textContent = data.caption || '';

    // Hide caption if empty
    let captionWrapper = document.querySelector('.slide-caption-wrapper');
    if (captionWrapper) {
      captionWrapper.style.display = data.caption ? 'block' : 'none';
    }

    slideCounter.textContent = `Image ${currentSlideIndex + 1} of ${images.length}`;
  } else {
    // Final Info Slide
    imageSlide.style.display = 'none';
    infoSlide.style.display = 'flex';

    // Set Content
    infoTitle.textContent = currentProject.title;
    infoDesc.textContent = currentProject.details || currentProject.description || "No specific details available.";
    infoLink.href = currentProject.link;

    slideCounter.textContent = `Project Details`;
  }
}

// Modal Listeners
document.querySelector('.close-btn').onclick = closeSlideshow;
document.querySelector('.next-btn').onclick = (e) => { e.stopPropagation(); nextSlide(); };
document.querySelector('.prev-btn').onclick = (e) => { e.stopPropagation(); prevSlide(); };

modal.onclick = (e) => {
  if (e.target === modal) closeSlideshow();
};

document.addEventListener('keydown', (e) => {
  if (!modal.classList.contains('active')) return;
  if (e.key === 'Escape') closeSlideshow();
  if (e.key === 'ArrowRight') nextSlide();
  if (e.key === 'ArrowLeft') prevSlide();
});

// Initial Render
loadProjects();

// Intersection Observer
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, observerOptions);

document.querySelectorAll('section').forEach(section => observer.observe(section));

// ============================================
// TESTIMONIALS CAROUSEL
// ============================================

let testimonials = [];
let currentTestimonialIndex = 0;
let testimonialInterval;

async function loadTestimonials() {
  try {
    const response = await fetch('/data/testimonials.json');
    if (!response.ok) return; // Silently fail if testimonials not available

    testimonials = await response.json();

    if (testimonials.length === 0) return;

    renderTestimonials();
    setupTestimonialNavigation();
    startTestimonialAutoRotate();
  } catch (error) {
    console.error('Error loading testimonials:', error);
  }
}

function renderTestimonials() {
  const track = document.getElementById('testimonials-track');
  const dotsContainer = document.getElementById('testimonial-dots');

  if (!track || !dotsContainer) return;

  // Render testimonial cards
  track.innerHTML = testimonials.map((testimonial, index) => `
    <div class="testimonial-card glass ${index === 0 ? 'active' : ''}">
      <div class="quote-icon">"</div>
      <p class="testimonial-text">${testimonial.testimonial}</p>
      <div class="testimonial-author">
        ${testimonial.avatar ?
      `<img src="${testimonial.avatar}" alt="${testimonial.name}" class="author-avatar">` :
      `<div class="author-avatar-placeholder">${testimonial.name.charAt(0)}</div>`
    }
        <div class="author-info">
          <h4>${testimonial.name}</h4>
          <p>${testimonial.role} at ${testimonial.company}</p>
        </div>
      </div>
      ${testimonial.rating ? `
        <div class="testimonial-rating">
          ${'★'.repeat(testimonial.rating)}${'☆'.repeat(5 - testimonial.rating)}
        </div>
      ` : ''}
    </div>
  `).join('');

  // Render dots
  dotsContainer.innerHTML = testimonials.map((_, index) => `
    <button class="testimonial-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Go to testimonial ${index + 1}"></button>
  `).join('');
}

function setupTestimonialNavigation() {
  const prevBtn = document.querySelector('.prev-testimonial');
  const nextBtn = document.querySelector('.next-testimonial');
  const dots = document.querySelectorAll('.testimonial-dot');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showTestimonial(currentTestimonialIndex - 1);
      resetTestimonialAutoRotate();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      showTestimonial(currentTestimonialIndex + 1);
      resetTestimonialAutoRotate();
    });
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      showTestimonial(parseInt(dot.dataset.index));
      resetTestimonialAutoRotate();
    });
  });
}

function showTestimonial(index) {
  if (testimonials.length === 0) return;

  // Wrap around
  if (index < 0) index = testimonials.length - 1;
  if (index >= testimonials.length) index = 0;

  currentTestimonialIndex = index;

  // Update cards
  const cards = document.querySelectorAll('.testimonial-card');
  cards.forEach((card, i) => {
    card.classList.toggle('active', i === index);
  });

  // Update dots
  const dots = document.querySelectorAll('.testimonial-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

function startTestimonialAutoRotate() {
  testimonialInterval = setInterval(() => {
    showTestimonial(currentTestimonialIndex + 1);
  }, 5000); // Rotate every 5 seconds
}

function resetTestimonialAutoRotate() {
  clearInterval(testimonialInterval);
  startTestimonialAutoRotate();
}

// Load testimonials
loadTestimonials();

// ============================================
// BLOG PREVIEW ON HOMEPAGE
// ============================================

async function loadBlogPreview() {
  try {
    const response = await fetch('/data/blog.json');
    if (!response.ok) return; // Silently fail if blog not available

    const blogPosts = await response.json();

    // Sort by date and get latest 3
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

    // Observe blog cards for animations
    document.querySelectorAll('.blog-card').forEach(card => observer.observe(card));
  } catch (error) {
    console.error('Error loading blog preview:', error);
  }
}

function createBlogPreviewCard(post, index) {
  const card = document.createElement('div');
  card.className = 'blog-card glass fade-in-up';
  card.style.animationDelay = `${index * 0.1}s`;

  const categoryLabel = getCategoryLabel(post.category);
  const formattedDate = formatBlogDate(post.date);

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

function getCategoryLabel(category) {
  const labels = {
    'web': 'Web Dev',
    'mobile': 'Mobile Dev',
    'tutorial': 'Tutorial',
    'thoughts': 'Thoughts'
  };
  return labels[category] || category;
}

function formatBlogDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Load blog preview
loadBlogPreview();
