"use client";

import { useEffect } from "react";
import { setBag } from "@/lib/bag";

// Empty the bag after a paid order. It renders nothing.
export function ClearBag() {
  useEffect(() => {
    setBag([]);
  }, []);
  return null;
}
