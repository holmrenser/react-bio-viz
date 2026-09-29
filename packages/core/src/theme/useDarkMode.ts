import { useSyncExternalStore } from "react";

/**
 * The `dark` class on `<html>`, as the shipped stylesheet reads it — not `prefers-color-scheme`,
 * which a host's own theme switch would not change.
 */
function readIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

// Server snapshot: no DOM, so nothing can be dark.
const getServerSnapshot = () => false;

/**
 * @public
 * Whether the host is in dark mode — a `dark` class on `<html>`, as the stylesheet reads it —
 * re-rendering when that changes. For canvas, which can't read CSS custom properties; SVG should
 * use `currentColor` and theme tokens instead.
 */
export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, readIsDark, getServerSnapshot);
}
