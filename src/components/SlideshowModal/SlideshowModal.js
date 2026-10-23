import { TouchHandler } from './TouchHandler.js';
import './slideshow.css';
import { getProjectDestinations } from '../../project-links.js';

/**
 * SlideshowModal Component
 * Encapsulated, accessible, mobile-responsive lightbox & slideshow modal.
 */
export class SlideshowModal {
  constructor(options = {}) {
    this.options = options;
    this.currentProject = null;
    this.currentSlideIndex = 0;
    this.touchHandler = null;
    this.isOpen = false;
    this.lastFocusedElement = null;

    // Bound methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.next = this.next.bind(this);
    this.prev = this.prev.bind(this);
    this.close = this.close.bind(this);
  }

  init() {
    this.render();
    this.bindEvents();
    return this;
  }

  get totalSlides() {
    if (!this.currentProject) return 0;
    const images = this.currentProject.images || [];
    // Total slides = image count + 1 (info slide)
    return images.length + 1;
  }

  render() {
    let existing = document.getElementById('slideshow-modal');
    if (existing) {
      this.modalEl = existing;
    } else {
      const template = `
        <div id="slideshow-modal" class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Project details and screenshots" tabindex="-1">
          <div class="modal-dialog">
            <!-- Modal Header Bar -->
            <div class="modal-header">
              <div class="modal-header-info">
                <h3 class="modal-title" id="modal-project-title"></h3>
                <span class="modal-counter" id="slide-counter" aria-live="polite"></span>
              </div>
              <button type="button" class="modal-close-btn" aria-label="Close dialog">&times;</button>
            </div>

            <!-- Modal Stage / Viewport -->
            <div class="modal-stage">
              <!-- Navigation Buttons -->
              <button type="button" class="modal-nav-btn prev-btn" aria-label="Previous slide">&#10094;</button>
              
              <!-- Slide Content -->
              <div class="slide-container">
                <!-- Image Slide -->
                <div id="image-slide" class="slide-view active">
                  <div class="slide-img-box">
                    <picture>
                      <source id="slide-source" srcset="" type="image/webp">
                      <img id="slide-img" src="" alt="Project Slide" loading="lazy">
                    </picture>
                  </div>
                  <div class="slide-caption-wrapper">
                    <p id="slide-caption" class="slide-caption"></p>
                  </div>
                </div>

                <!-- Final Info Slide -->
                <div id="info-slide" class="slide-view" style="display: none;">
                  <div class="info-content">
                    <h2 id="info-title"></h2>
                    <div class="info-details">
                      <p id="info-desc"></p>
                    </div>
                    <div class="info-actions">
                      <a id="info-link" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Visit Project</a>
                      <a id="info-link-alt" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" hidden>Visit Website</a>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button" class="modal-nav-btn next-btn" aria-label="Next slide">&#10095;</button>
            </div>

            <!-- Mobile Swipe Hint / Indicator -->
            <div class="modal-indicators" id="modal-dots" aria-hidden="true"></div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', template);
      this.modalEl = document.getElementById('slideshow-modal');
    }

    // Cache elements
    this.dialogEl = this.modalEl.querySelector('.modal-dialog');
    this.stageEl = this.modalEl.querySelector('.modal-stage');
    this.imageSlide = this.modalEl.querySelector('#image-slide');
    this.infoSlide = this.modalEl.querySelector('#info-slide');
    this.slideImg = this.modalEl.querySelector('#slide-img');
    this.slideSource = this.modalEl.querySelector('#slide-source');
    this.slideCaption = this.modalEl.querySelector('#slide-caption');
    this.captionWrapper = this.modalEl.querySelector('.slide-caption-wrapper');
    this.infoTitle = this.modalEl.querySelector('#info-title');
    this.infoDesc = this.modalEl.querySelector('#info-desc');
    this.infoLink = this.modalEl.querySelector('#info-link');
    this.infoLinkAlt = this.modalEl.querySelector('#info-link-alt');
    this.titleEl = this.modalEl.querySelector('#modal-project-title');
    this.slideCounter = this.modalEl.querySelector('#slide-counter');
    this.dotsContainer = this.modalEl.querySelector('#modal-dots');
    this.closeBtn = this.modalEl.querySelector('.modal-close-btn');
    this.prevBtn = this.modalEl.querySelector('.prev-btn');
    this.nextBtn = this.modalEl.querySelector('.next-btn');

    // Attach Touch Handler for swipe gestures
    if (this.dialogEl) {
      this.touchHandler = new TouchHandler(this.dialogEl, {
        onSwipeLeft: this.next,
        onSwipeRight: this.prev,
        onSwipeDown: this.close,
        threshold: 35
      });
    }
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prev();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.next();
      });
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', this.handleBackdropClick);
    }

    window.addEventListener('keydown', this.handleKeyDown);
  }

  handleBackdropClick(e) {
    if (e.target === this.modalEl) {
      this.close();
    }
  }

  handleKeyDown(e) {
    if (!this.isOpen) return;

    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'Tab') {
      this.trapFocus(e);
    } else if (e.key === 'ArrowRight') {
      this.next();
    } else if (e.key === 'ArrowLeft') {
      this.prev();
    }
  }

  // Keep Tab inside the dialog. Without this, focus walks out into the page
  // behind the modal, which is still visible but not reachable by pointer.
  trapFocus(e) {
    const focusable = Array.from(
      this.modalEl.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(el => el.offsetParent !== null || el === document.activeElement);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  open(project, initialIndex = 0) {
    if (!project) return;
    this.currentProject = project;
    this.currentSlideIndex = initialIndex;
    this.lastFocusedElement = document.activeElement;
    this.isOpen = true;

    this.renderDots();
    this.updateSlide();

    this.modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    if (this.closeBtn) {
      this.closeBtn.focus();
    }
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.remove('active');
    document.body.style.overflow = '';

    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }

  next() {
    if (!this.currentProject || this.totalSlides === 0) return;
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.totalSlides;
    this.updateSlide();
  }

  prev() {
    if (!this.currentProject || this.totalSlides === 0) return;
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.totalSlides) % this.totalSlides;
    this.updateSlide();
  }

  goTo(index) {
    if (index >= 0 && index < this.totalSlides) {
      this.currentSlideIndex = index;
      this.updateSlide();
    }
  }

  renderDots() {
    if (!this.dotsContainer) return;
    const total = this.totalSlides;
    let dotsHtml = '';
    for (let i = 0; i < total; i++) {
      dotsHtml += `<button type="button" class="modal-dot ${i === this.currentSlideIndex ? 'active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`;
    }
    this.dotsContainer.innerHTML = dotsHtml;

    this.dotsContainer.querySelectorAll('.modal-dot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.goTo(parseInt(btn.dataset.index, 10));
      });
    });
  }

  updateSlide() {
    if (!this.currentProject) return;
    const images = this.currentProject.images || [];

    // Header Project Title
    if (this.titleEl) {
      this.titleEl.textContent = this.currentProject.title;
    }

    // Update Dots
    if (this.dotsContainer) {
      this.dotsContainer.querySelectorAll('.modal-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === this.currentSlideIndex);
      });
    }

    if (this.currentSlideIndex < images.length) {
      // Image Slide View
      if (this.imageSlide) this.imageSlide.style.display = 'flex';
      if (this.infoSlide) this.infoSlide.style.display = 'none';

      const data = images[this.currentSlideIndex];
      if (this.slideImg) {
        this.slideImg.src = data.url;
        this.slideImg.alt = data.caption || `${this.currentProject.title} Screenshot ${this.currentSlideIndex + 1}`;
      }
      if (this.slideSource) {
        this.slideSource.srcset = (data.url || '').replace(/\.(png|jpg|jpeg)$/i, '.webp');
      }

      if (this.slideCaption) {
        this.slideCaption.textContent = data.caption || '';
      }

      if (this.captionWrapper) {
        this.captionWrapper.style.display = data.caption ? 'block' : 'none';
      }

      if (this.slideCounter) {
        this.slideCounter.textContent = `${this.currentSlideIndex + 1} / ${this.totalSlides}`;
      }
    } else {
      // Final Info Slide View
      if (this.imageSlide) this.imageSlide.style.display = 'none';
      if (this.infoSlide) this.infoSlide.style.display = 'flex';

      if (this.infoTitle) {
        this.infoTitle.textContent = this.currentProject.title;
      }

      if (this.infoDesc) {
        this.infoDesc.textContent = this.currentProject.details || this.currentProject.description || 'No specific details available.';
      }

      const destinations = getProjectDestinations(this.currentProject);

      if (this.infoLink) {
        this.applyDestination(this.infoLink, destinations[0]);
      }

      if (this.infoLinkAlt) {
        this.applyDestination(this.infoLinkAlt, destinations[1]);
      }

      if (this.slideCounter) {
        this.slideCounter.textContent = `${this.totalSlides} / ${this.totalSlides}`;
      }
    }
  }

  // Point one of the info-slide buttons at a destination, or hide it outright
  // when the project has no second place to go.
  applyDestination(anchor, destination) {
    if (!destination) {
      anchor.hidden = true;
      anchor.style.display = 'none';
      return;
    }
    anchor.hidden = false;
    anchor.style.display = 'inline-flex';
    anchor.href = destination.url;
    anchor.textContent = destination.label;
    anchor.setAttribute('aria-label', destination.aria);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.touchHandler) {
      this.touchHandler.destroy();
    }
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
  }
}
