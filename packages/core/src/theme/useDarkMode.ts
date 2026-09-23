import { useSyncExternalStore } from "react";

/**
 * Reads the theme the way the shipped stylesheet defines it: a `dark` class on the root element.
 * Deliberately not `prefers-color-scheme` — a host app that lets the user override the OS theme
 * toggles the class, and the class is what actually drives the CSS variables in `styles.css`.
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
 * Whether the host app is currently in dark mode, following the same convention the library's
 * stylesheet uses — a `dark` class on `<html>` — and re-rendering when that class is toggled.
 *
 * SVG surfaces should prefer `currentColor` and theme tokens (`text-muted-foreground`, `border`)
 * over this hook: they follow the theme for free. It exists for canvas rendering, which has no
 * access to CSS custom properties and so needs a concrete light/dark decision — see
 * {@link residueColor}'s `darkMode` argument.
 */
export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, readIsDark, getServerSnapshot);
}
