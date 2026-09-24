import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "react-bio-viz/style.css";

/**
 * Frames a live example and hands it the width it has to work with — the components take pixel
 * sizes, and a docs column is responsive. `not-content` opts the example out of Starlight's
 * markdown typography (list margins, link colours) so the components render as they would in an app.
 */
export function Demo({ children, minWidth = 320 }: { children: (width: number) => ReactNode; minWidth?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(Math.max(minWidth, Math.floor(element.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minWidth]);
  return (
    <div ref={ref} className="rbv-demo not-content">
      {width > 0 && children(width)}
    </div>
  );
}
