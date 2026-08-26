import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlideshowModal } from '../SlideshowModal.js';

describe('SlideshowModal', () => {
  let modalInstance;
  const sampleProject = {
    id: 1,
    title: 'JsonExport Pro',
    category: 'web',
    description: 'Convert JSON to Excel cleanly.',
    details: 'Full details about JsonExport project architecture.',
    live_link: 'https://jsonexport.example.com',
    images: [
      { url: 'projects/jsonexport/slide1.png', caption: 'Slide 1 caption' },
      { url: 'projects/jsonexport/slide2.png', caption: 'Slide 2 caption' }
    ]
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    modalInstance = new SlideshowModal();
    modalInstance.init();
  });

  afterEach(() => {
    if (modalInstance) {
      modalInstance.destroy();
    }
    document.body.innerHTML = '';
  });

  it('renders modal into DOM with accessible attributes', () => {
    const modalEl = document.getElementById('slideshow-modal');
    expect(modalEl).not.toBeNull();
    expect(modalEl.getAttribute('role')).toBe('dialog');
    expect(modalEl.getAttribute('aria-modal')).toBe('true');
  });

  it('opens modal with project data and locks body scroll', () => {
    modalInstance.open(sampleProject);

    const modalEl = document.getElementById('slideshow-modal');
    expect(modalEl.classList.contains('active')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    const titleEl = modalEl.querySelector('.modal-title');
    expect(titleEl.textContent).toBe('JsonExport Pro');

    const imgEl = modalEl.querySelector('#slide-img');
    expect(imgEl.src).toContain('projects/jsonexport/slide1.png');

    const captionEl = modalEl.querySelector('#slide-caption');
    expect(captionEl.textContent).toBe('Slide 1 caption');

    const counterEl = modalEl.querySelector('#slide-counter');
    expect(counterEl.textContent).toBe('1 / 3'); // 2 images + 1 info slide
  });

  it('navigates through slides with next() and prev()', () => {
    modalInstance.open(sampleProject);

    // Slide 1 (Image 1)
    expect(modalInstance.currentSlideIndex).toBe(0);

    // Next -> Slide 2 (Image 2)
    modalInstance.next();
    expect(modalInstance.currentSlideIndex).toBe(1);
    const imgEl = document.getElementById('slide-img');
    expect(imgEl.src).toContain('projects/jsonexport/slide2.png');

    // Next -> Slide 3 (Info slide)
    modalInstance.next();
    expect(modalInstance.currentSlideIndex).toBe(2);
    const infoSlide = document.getElementById('info-slide');
    const imageSlide = document.getElementById('image-slide');
    expect(imageSlide.style.display).toBe('none');
    expect(infoSlide.style.display).toBe('flex');

    const infoTitle = document.getElementById('info-title');
    expect(infoTitle.textContent).toBe('JsonExport Pro');

    // Next -> Wraps back to Slide 1
    modalInstance.next();
    expect(modalInstance.currentSlideIndex).toBe(0);
    expect(imageSlide.style.display).toBe('flex');
    expect(infoSlide.style.display).toBe('none');

    // Prev -> Wraps to Slide 3 (Info slide)
    modalInstance.prev();
    expect(modalInstance.currentSlideIndex).toBe(2);
  });

  it('closes modal on close() and restores body scroll', () => {
    modalInstance.open(sampleProject);
    modalInstance.close();

    const modalEl = document.getElementById('slideshow-modal');
    expect(modalEl.classList.contains('active')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('handles keyboard navigation (Escape, ArrowRight, ArrowLeft)', () => {
    modalInstance.open(sampleProject);

    // ArrowRight
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(modalInstance.currentSlideIndex).toBe(1);

    // ArrowLeft
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(modalInstance.currentSlideIndex).toBe(0);

    // Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const modalEl = document.getElementById('slideshow-modal');
    expect(modalEl.classList.contains('active')).toBe(false);
  });
});
