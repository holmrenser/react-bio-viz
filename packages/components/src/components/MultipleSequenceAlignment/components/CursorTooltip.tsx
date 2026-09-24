import { css } from "@emotion/css";

import type { MSAHover } from "../types";

/** `<name> · col <n> · <residue>` for the hovered cell — shared by the tooltip and the badge. */
export function describeHover(hover: MSAHover): string {
  const position = `col ${hover.col + 1}`;
  return hover.residue ? `${hover.label} · ${position} · ${hover.residue}` : `${hover.label} · ${position}`;
}

/** A small floating tooltip that follows the cursor while it's over the alignment. */
export function CursorTooltip({ hover }: { hover: MSAHover | null }) {
  if (!hover) return null;
  return (
    <div
      className={css({
        position: "fixed",
        pointerEvents: "none",
        background: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgb(0 0 0 / 0.15)",
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 11,
        fontFamily: "ui-monospace, monospace",
        zIndex: 1000,
        whiteSpace: "nowrap",
      })}
      style={{ left: hover.clientX + 14, top: hover.clientY + 18 }}
    >
      {describeHover(hover)}
    </div>
  );
}
