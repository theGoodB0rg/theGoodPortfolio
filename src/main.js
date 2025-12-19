import './style.css'

// Project Data
const projects = [
  {
    id: 1,
    title: "E-Commerce Platform",
    category: "web",
    tags: ["React", "Node.js", "MongoDB"],
    description: "A full-featured online store with cart and payment integration.",
    images: [
      "https://via.placeholder.com/800x600/333/fff?text=E-Com+Dashboard",
      "https://via.placeholder.com/800x600/444/fff?text=Product+Page",
      "https://via.placeholder.com/800x600/555/fff?text=Checkout+Flow"
    ],
    thumb: "https://via.placeholder.com/400x300/333/fff?text=E-Com+Thumb"
  },
  {
    id: 2,
    title: "Fitness Tracker App",
    category: "mobile",
    tags: ["Kotlin", "Jetpack Compose", "Room"],
    description: "Android application to track daily workouts and nutrition.",
    images: [
      "https://via.placeholder.com/800x600/222/fff?text=Home+Screen",
      "https://via.placeholder.com/800x600/333/fff?text=Workout+Log",
      "https://via.placeholder.com/800x600/444/fff?text=Stats+Graph"
    ],
    thumb: "https://via.placeholder.com/400x300/222/fff?text=Fitness+Thumb"
  },
  {
    id: 3,
    title: "Portfolio Website",
    category: "web",
    tags: ["Vite", "Vanilla JS", "CSS3"],
    description: "The premium portfolio website you are looking at right now.",
    images: [
      "https://via.placeholder.com/800x600/111/fff?text=Hero+Section",
      "https://via.placeholder.com/800x600/222/fff?text=Portfolio+Grid"
    ],
    thumb: "https://via.placeholder.com/400x300/111/fff?text=Portfolio+Thumb"
  },
  {
    id: 4,
    title: "Chat Messenger",
    category: "mobile",
    tags: ["Kotlin", "Firebase"],
    description: "Real-time messaging app with media sharing capabilities.",
    images: [
      "https://via.placeholder.com/800x600/000/fff?text=Chat+List",
      "https://via.placeholder.com/800x600/111/fff?text=Message+View"
    ],
    thumb: "https://via.placeholder.com/400x300/000/fff?text=Chat+Thumb"
  }
];

// DOM Elements
const grid = document.getElementById('portfolio-grid');
const filterBtns = document.querySelectorAll('.filter-btn');

// Slideshow State
let currentProject = null;
let currentImageIndex = 0;

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
        <img id="slide-img" src="" alt="Project Slide">
      </div>
      <button class="nav-btn next-btn">&#10095;</button>
      <div class="slide-info">
        <h3 id="slide-title"></h3>
        <p id="slide-counter"></p>
      </div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHtml);

const modal = document.getElementById('slideshow-modal');
const slideImg = document.getElementById('slide-img');
const slideTitle = document.getElementById('slide-title');
const slideCounter = document.getElementById('slide-counter');

// Modal Controls
function openSlideshow(projectId) {
  currentProject = projects.find(p => p.id === projectId);
  currentImageIndex = 0;
  updateSlide();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSlideshow() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function nextSlide() {
  currentImageIndex = (currentImageIndex + 1) % currentProject.images.length;
  updateSlide();
}

function prevSlide() {
  currentImageIndex = (currentImageIndex - 1 + currentProject.images.length) % currentProject.images.length;
  updateSlide();
}

function updateSlide() {
  if (!currentProject) return;
  slideImg.src = currentProject.images[currentImageIndex];
  slideTitle.textContent = currentProject.title;
  slideCounter.textContent = `${currentImageIndex + 1} / ${currentProject.images.length}`;
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
