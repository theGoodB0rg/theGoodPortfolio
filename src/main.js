import './style.css'

// Project Data
const projects = [
  {
    id: 1,
    title: "E-Commerce Platform",
    category: "web",
    tags: ["React", "Node.js", "MongoDB"],
    description: "A full-featured online store with cart and payment integration.",
    details: "Built a scalable e-commerce solution handling 10k+ concurrent users. Features include real-time inventory tracking, stripe payment integration, and a custom admin dashboard.",
    link: "https://example.com/demo",
    images: [
      { url: "https://via.placeholder.com/800x600/005f99/fff?text=Dashboard+Overview", caption: "Admin Dashboard with real-time analytics" },
      { url: "https://via.placeholder.com/800x600/004d80/fff?text=Product+Page", caption: "Responsive Product Details view" },
      { url: "https://via.placeholder.com/800x600/003366/fff?text=Checkout+Flow", caption: "Seamless multi-step checkout process" }
    ],
    thumb: "https://via.placeholder.com/400x300/005f99/fff?text=E-Com+Thumb"
  },
  {
    id: 2,
    title: "Fitness Tracker App",
    category: "mobile",
    tags: ["Kotlin", "Jetpack Compose", "Room"],
    description: "Android application to track daily workouts and nutrition.",
    details: "A native Android app focused on offline-first capability using Room database. Implements Material You design and syncs with Google Fit API.",
    link: "https://play.google.com/store/apps/details?id=example",
    images: [
      { url: "https://via.placeholder.com/800x600/004d40/fff?text=Home+Screen", caption: "Daily Activity Summary" },
      { url: "https://via.placeholder.com/800x600/00695c/fff?text=Workout+Log", caption: "Interactive Workout Logging" },
      { url: "https://via.placeholder.com/800x600/00796b/fff?text=Stats+Graph", caption: "Progress visualization over time" }
    ],
    thumb: "https://via.placeholder.com/400x300/004d40/fff?text=Fitness+Thumb"
  },
  {
    id: 3,
    title: "Portfolio Website",
    category: "web",
    tags: ["Vite", "Vanilla JS", "CSS3"],
    description: "The premium portfolio website you are looking at right now.",
    details: "Designed to showcase development skills using only native web technologies. Features custom glassmorphism, performant animations, and a dynamic project loader.",
    link: "#",
    images: [
      { url: "https://via.placeholder.com/800x600/101010/fff?text=Hero+Section", caption: "First impression with hero animations" },
      { url: "https://via.placeholder.com/800x600/202020/fff?text=Portfolio+Grid", caption: "Filterable project grid layout" }
    ],
    thumb: "https://via.placeholder.com/400x300/101010/fff?text=Portfolio+Thumb"
  },
  {
    id: 4,
    title: "Chat Messenger",
    category: "mobile",
    tags: ["Kotlin", "Firebase"],
    description: "Real-time messaging app with media sharing capabilities.",
    details: "Secure messaging app using Firebase Realtime Database. Supports end-to-end encryption for private chats and group messaging features.",
    link: "https://github.com/example/chat",
    images: [
      { url: "https://via.placeholder.com/800x600/263238/fff?text=Chat+List", caption: "Recent conversations list" },
      { url: "https://via.placeholder.com/800x600/37474f/fff?text=Message+View", caption: "Chat interface with media support" }
    ],
    thumb: "https://via.placeholder.com/400x300/263238/fff?text=Chat+Thumb"
  }
];

// DOM Elements
const grid = document.getElementById('portfolio-grid');
const filterBtns = document.querySelectorAll('.filter-btn');

// Slideshow State
let currentProject = null;
let currentSlideIndex = 0; // Changed from ImageIndex to SlideIndex to account for final slide

// Render Projects
function renderProjects(filter = 'all') {
  grid.innerHTML = '';

  const filtered = filter === 'all'
    ? projects
    : projects.filter(p => p.category === filter);

  filtered.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card glass fade-in-up';
    // Add click handler for slideshow
    card.onclick = () => openSlideshow(project.id);

    card.innerHTML = `
      <div class="card-image">
        <img src="${project.thumb}" alt="${project.title}">
        <div class="view-overlay flex-center">View Project</div>
      </div>
      <div class="card-content">
        <div class="card-tags">${project.tags.join(' • ')}</div>
        <h3>${project.title}</h3>
        <p class="card-description">${project.description}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Event Listeners
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProjects(btn.dataset.filter);
  });
});

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
  // Total slides = images + 1 (final info slide)
  const totalSlides = currentProject.images.length + 1;
  currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
  updateSlide();
}

function prevSlide() {
  const totalSlides = currentProject.images.length + 1;
  currentSlideIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
  updateSlide();
}

function updateSlide() {
  if (!currentProject) return;
  const totalSlides = currentProject.images.length + 1;

  // Footer Info
  footerTitle.textContent = currentProject.title;

  if (currentSlideIndex < currentProject.images.length) {
    // Image Slide
    imageSlide.style.display = 'flex';
    infoSlide.style.display = 'none';

    // Set Content
    const data = currentProject.images[currentSlideIndex];
    slideImg.src = data.url;
    slideCaption.textContent = data.caption;

    slideCounter.textContent = `Image ${currentSlideIndex + 1} of ${currentProject.images.length}`;
  } else {
    // Final Info Slide
    imageSlide.style.display = 'none';
    infoSlide.style.display = 'flex';

    // Set Content
    infoTitle.textContent = currentProject.title;
    infoDesc.textContent = currentProject.details;
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
renderProjects();

// Intersection Observer
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, observerOptions);

document.querySelectorAll('section').forEach(section => observer.observe(section));
