import './style.css'

// Project Data
const projects = [
  {
    id: 1,
    title: "E-Commerce Platform",
    category: "web",
    tags: ["React", "Node.js", "MongoDB"],
    description: "A full-featured online store with cart and payment integration.",
    image: "https://via.placeholder.com/400x300/333/fff?text=Web+Project+1"
  },
  {
    id: 2,
    title: "Fitness Tracker App",
    category: "mobile",
    tags: ["Kotlin", "Jetpack Compose", "Room"],
    description: "Android application to track daily workouts and nutrition.",
    image: "https://via.placeholder.com/400x300/333/fff?text=Mobile+App+1"
  },
  {
    id: 3,
    title: "Portfolio Website",
    category: "web",
    tags: ["Vite", "Vanilla JS", "CSS3"],
    description: "The premium portfolio website you are looking at right now.",
    image: "https://via.placeholder.com/400x300/333/fff?text=Web+Project+2"
  },
  {
    id: 4,
    title: "Chat Messenger",
    category: "mobile",
    tags: ["Kotlin", "Firebase"],
    description: "Real-time messaging app with media sharing capabilities.",
    image: "https://via.placeholder.com/400x300/333/fff?text=Mobile+App+2"
  }
];

// DOM Elements
const grid = document.getElementById('portfolio-grid');
const filterBtns = document.querySelectorAll('.filter-btn');

// Render Projects
function renderProjects(filter = 'all') {
  grid.innerHTML = '';

  const filtered = filter === 'all'
    ? projects
    : projects.filter(p => p.category === filter);

  // Animation delay logic could go here

  filtered.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card glass fade-in-up';
    card.innerHTML = `
      <div class="card-image">
        <img src="${project.image}" alt="${project.title}">
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
    // Remove active class
    filterBtns.forEach(b => b.classList.remove('active'));
    // Add active class
    btn.classList.add('active');

    // Filter
    renderProjects(btn.dataset.filter);
  });
});

// Initial Render
renderProjects();

// Intersection Observer for scroll animations
const observerOptions = {
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
  observer.observe(section);
});
