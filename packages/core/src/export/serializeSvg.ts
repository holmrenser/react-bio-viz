/** Presentation properties copied from computed style, so the file needs no stylesheet. */
const INLINED_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "visibility",
] as const;

/** @public */
export interface SerializeSvgOptions {
  /**
   * Replace the viewBox with the bounding box of the drawing plus `padding`, so the file shows the
   * whole figure rather than whatever part was panned into view. @defaultValue true
   */
  fitToContent?: boolean;
  /** Padding around the content when fitting, in user units. @defaultValue 10 */
  padding?: number;
  /** Background fill behind the drawing (e.g. `"white"`); none when omitted. */
  background?: string;
}

/**
 * @public
 * Serializes a rendered `<svg>` to a standalone SVG document. The library styles SVG partly with
 * class-based CSS and theme variables (`currentColor`, `var(--background)`), none of which travel
 * with the markup — so the computed style of every element is inlined first, and the result looks
 * the same outside the page. Interactive-only elements (invisible hit areas) are dropped.
 */
export function serializeSvg(svg: SVGSVGElement, options: SerializeSvgOptions = {}): string {
  const { fitToContent = true, padding = 10, background } = options;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sources = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const targets = [clone, ...Array.from(clone.querySelectorAll("*"))];

  sources.forEach((source, index) => {
    const target = targets[index] as SVGElement;
    const computed = window.getComputedStyle(source);
    for (const property of INLINED_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (value) target.style.setProperty(property, value);
    }
    target.removeAttribute("class");
  });
  // Hit areas are transparent strokes that only exist to catch clicks.
  clone.querySelectorAll('[stroke="transparent"]').forEach((element) => element.remove());

  if (fitToContent && typeof svg.getBBox === "function") {
    try {
      const box = svg.getBBox();
      if (box.width > 0 && box.height > 0) {
        const x = box.x - padding;
        const y = box.y - padding;
        const width = box.width + 2 * padding;
        const height = box.height + 2 * padding;
        clone.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
        clone.setAttribute("width", String(Math.ceil(width)));
        clone.setAttribute("height", String(Math.ceil(height)));
      }
    } catch {
      // getBBox throws for an unrendered svg; keep the current viewBox.
    }
  }

  if (background) {
    const [x, y, width, height] = (clone.getAttribute("viewBox") ?? `0 0 ${clone.getAttribute("width")} ${clone.getAttribute("height")}`)
      .split(/\s+/)
      .map(Number);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    Object.entries({ x, y, width, height, fill: background }).forEach(([key, value]) => rect.setAttribute(key, String(value)));
    clone.insertBefore(rect, clone.firstChild);
  }

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.style.removeProperty("touch-action");
  return new XMLSerializer().serializeToString(clone);
}

/**
 * @public
 * Rasterises an SVG document (e.g. from {@link serializeSvg}) to a PNG blob at `scale` × its size.
 */
export async function svgToPng(svgText: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load the SVG for rasterising"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png")
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
