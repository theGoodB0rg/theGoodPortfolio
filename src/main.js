import './style.css'

// Project Data State
let projects = [];

// Fetch Projects
async function loadProjects() {
  try {
    const response = await fetch('/src/data/projects.json');
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
