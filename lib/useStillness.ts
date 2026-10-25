import { useSyncExternalStore } from "react";

// True when the visitor asks the system for less motion. It is false on the server and in the first render, and
// the real value after that, so the server and the browser give the same first page.
const QUERY = "(prefers-reduced-motion: reduce)";

export function useStillness() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
