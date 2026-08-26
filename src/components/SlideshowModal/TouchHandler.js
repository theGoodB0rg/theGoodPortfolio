/**
 * TouchHandler
 * Provides robust, lightweight touch gesture recognition (swipe left/right/down)
 * for mobile and touch-enabled devices.
 */
export class TouchHandler {
  /**
   * @param {HTMLElement} element - Target element to listen for touch gestures
   * @param {Object} options
   * @param {Function} [options.onSwipeLeft]
   * @param {Function} [options.onSwipeRight]
   * @param {Function} [options.onSwipeDown]
   * @param {number} [options.threshold=40] - Minimum delta in px to register a swipe
   */
  constructor(element, options = {}) {
    this.element = element;
    this.onSwipeLeft = options.onSwipeLeft || null;
    this.onSwipeRight = options.onSwipeRight || null;
    this.onSwipeDown = options.onSwipeDown || null;
    this.threshold = options.threshold || 40;

    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.isTracking = false;

    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);

    this.bindEvents();
  }

  bindEvents() {
    if (!this.element) return;
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: true });
  }

  handleTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) {
      this.isTracking = false;
      return;
    }
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
    this.isTracking = true;
  }

  handleTouchMove(e) {
    if (!this.isTracking) return;
    // We can observe movement if needed for interactive drag
  }

  handleTouchEnd(e) {
    if (!this.isTracking) return;
    this.isTracking = false;

    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Prefer horizontal swipe if absX > absY
    if (absX > this.threshold && absX > absY) {
      if (deltaX < 0) {
        this.onSwipeLeft?.();
      } else {
        this.onSwipeRight?.();
      }
    } else if (deltaY > this.threshold * 1.2 && absY > absX) {
      // Downward swipe to dismiss
      this.onSwipeDown?.();
    }
  }

  handleTouchCancel() {
    this.isTracking = false;
  }

  destroy() {
    if (!this.element) return;
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }
}
