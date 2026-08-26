// Mobile Navigation Toggle Logic
export function setupMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  const navItems = document.querySelectorAll('.nav-links a');

  if (hamburger && navLinks) {
    if (!hamburger.hasAttribute('aria-expanded')) {
      hamburger.setAttribute('aria-expanded', 'false');
    }

    const toggleMenu = (open) => {
      const shouldOpen = typeof open === 'boolean' ? open : !navLinks.classList.contains('nav-active');
      navLinks.classList.toggle('nav-active', shouldOpen);
      hamburger.classList.toggle('is-active', shouldOpen);
      hamburger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    };

    hamburger.onclick = (e) => {
      e.stopPropagation();
      toggleMenu();
    };

    // Close mobile menu when a link is clicked
    navItems.forEach(link => {
      link.onclick = () => {
        if (navLinks.classList.contains('nav-active')) {
          toggleMenu(false);
        }
      };
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('nav-active') && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
        toggleMenu(false);
      }
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('nav-active')) {
        toggleMenu(false);
      }
    });
  }
}

// Initialize on load
if (typeof document !== 'undefined') {
  setupMobileNav();

  // Update Copyright Year dynamically
  const currentYear = new Date().getFullYear();
  document.querySelectorAll('.copyright-year').forEach(el => {
    el.textContent = currentYear;
  });
}
