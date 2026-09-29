/**
 * @public
 * Add `css` to the document as a `<style id={id}>` element, once. The element goes first in
 * `<head>`, so any stylesheet the host loads — including an explicit import of the same file —
 * comes later in the cascade and wins ties. A no-op on the server (no `document`) and when an
 * element with `id` already exists.
 *
 * `react-bio-viz` calls this on import with its own stylesheet, which is what makes importing
 * `react-bio-viz/style.css` optional.
 */
export function injectStyleSheet(css: string, id: string): void {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.prepend(style);
}
