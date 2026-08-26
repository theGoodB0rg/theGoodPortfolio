import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TouchHandler } from '../TouchHandler.js';

describe('TouchHandler', () => {
  let element;
  let onSwipeLeft;
  let onSwipeRight;
  let onSwipeDown;
  let handler;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    onSwipeLeft = vi.fn();
    onSwipeRight = vi.fn();
    onSwipeDown = vi.fn();

    handler = new TouchHandler(element, {
      onSwipeLeft,
      onSwipeRight,
      onSwipeDown,
      threshold: 40,
    });
  });

  function createTouchEvent(type, clientX, clientY) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    event.changedTouches = [{ clientX, clientY }];
    event.touches = type === 'touchend' ? [] : [{ clientX, clientY }];
    return event;
  }

  it('triggers onSwipeLeft when swiping left past threshold', () => {
    element.dispatchEvent(createTouchEvent('touchstart', 200, 100));
    element.dispatchEvent(createTouchEvent('touchend', 100, 105)); // deltaX = -100, deltaY = 5

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeDown).not.toHaveBeenCalled();
  });

  it('triggers onSwipeRight when swiping right past threshold', () => {
    element.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    element.dispatchEvent(createTouchEvent('touchend', 220, 105)); // deltaX = 120, deltaY = 5

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeDown).not.toHaveBeenCalled();
  });

  it('triggers onSwipeDown when swiping downwards past threshold', () => {
    element.dispatchEvent(createTouchEvent('touchstart', 150, 100));
    element.dispatchEvent(createTouchEvent('touchend', 155, 220)); // deltaX = 5, deltaY = 120

    expect(onSwipeDown).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does not trigger callbacks for small movements below threshold', () => {
    element.dispatchEvent(createTouchEvent('touchstart', 100, 100));
    element.dispatchEvent(createTouchEvent('touchend', 110, 105)); // deltaX = 10, deltaY = 5

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeDown).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on destroy()', () => {
    handler.destroy();

    element.dispatchEvent(createTouchEvent('touchstart', 200, 100));
    element.dispatchEvent(createTouchEvent('touchend', 50, 100));

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
