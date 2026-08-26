import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupMobileNav } from '../mobile-menu.js';

describe('Mobile Navigation Component', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header class="glass">
        <nav class="container">
          <div class="logo">Olorunfemi<span class="logo-dot">.</span></div>
          <ul class="nav-links flex-center">
            <li><a href="#about">About</a></li>
            <li><a href="#portfolio">Work</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <button class="hamburger" aria-label="Menu" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </nav>
      </header>
    `;
    setupMobileNav();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('initializes hamburger button with aria-expanded false', () => {
    const hamburger = document.querySelector('.hamburger');
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles mobile menu active classes and aria-expanded on click', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    // Click to open
    hamburger.click();
    expect(navLinks.classList.contains('nav-active')).toBe(true);
    expect(hamburger.classList.contains('is-active')).toBe(true);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');

    // Click to close
    hamburger.click();
    expect(navLinks.classList.contains('nav-active')).toBe(false);
    expect(hamburger.classList.contains('is-active')).toBe(false);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes mobile menu when a nav link is clicked', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const workLink = document.querySelector('a[href="#portfolio"]');

    // Open menu
    hamburger.click();
    expect(navLinks.classList.contains('nav-active')).toBe(true);

    // Click link
    workLink.click();
    expect(navLinks.classList.contains('nav-active')).toBe(false);
    expect(hamburger.classList.contains('is-active')).toBe(false);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes mobile menu on Escape key press', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    // Open menu
    hamburger.click();
    expect(navLinks.classList.contains('nav-active')).toBe(true);

    // Press Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(navLinks.classList.contains('nav-active')).toBe(false);
    expect(hamburger.classList.contains('is-active')).toBe(false);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('delegates clicks from inner span elements to toggle the menu', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const firstSpan = hamburger.querySelector('span');

    // Click on the child span element directly
    firstSpan.click();
    expect(navLinks.classList.contains('nav-active')).toBe(true);
    expect(hamburger.classList.contains('is-active')).toBe(true);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');

    // Click span again to close
    firstSpan.click();
    expect(navLinks.classList.contains('nav-active')).toBe(false);
    expect(hamburger.classList.contains('is-active')).toBe(false);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('handles rapid toggling consistently', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    for (let i = 0; i < 5; i++) {
      hamburger.click();
      expect(navLinks.classList.contains('nav-active')).toBe(true);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');

      hamburger.click();
      expect(navLinks.classList.contains('nav-active')).toBe(false);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    }
  });
});
