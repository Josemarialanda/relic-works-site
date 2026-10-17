"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

export type SwipeDirection = "left" | "right" | "up" | "down";

// The smallest movement, in px, that is a swipe and not a tap.
const MIN_DISTANCE = 40;

// Swipe gestures for touch and pen. A mouse is ignored, so the desktop does not change.
// "active" is true while a finger is down. After a swipe, the next click is cancelled,
// so a swipe that starts on a link does not also open that link.
export function useSwipe(onSwipe: (d: SwipeDirection) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const [active, setActive] = useState(false);

  const end = () => {
    start.current = null;
    setActive(false);
  };

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !e.isPrimary) return;
      start.current = { x: e.clientX, y: e.clientY };
      // Some browsers send no click after a swipe, so clear the flag at the next touch.
      swiped.current = false;
      setActive(true);
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      if (!s || !e.isPrimary) return;
      end();
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN_DISTANCE) return;
      swiped.current = true;
      onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down");
    },
    // The browser cancels the pointer when it scrolls the page.
    onPointerCancel: end,
    onClickCapture: (e: MouseEvent) => {
      if (!swiped.current) return;
      swiped.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return { active, handlers };
}
