import { css } from "@emotion/css";

import type { AlignedSequences } from "../types";

/** @public The cell under the pointer, in data coordinates plus the screen coords that produced it. */
export interface HoverCell {
  row: number;
  col: number;
  clientX: number;
  clientY: number;
}

/** `<name> · col <n> · <residue>` for the hovered cell — shared by the tooltip and the badge. */
export function describeHover(hover: HoverCell, msa: AlignedSequences): string {
  const sequence = msa[hover.row];
  const residue = sequence?.sequence[hover.col];
  const label = sequence?.header ?? "?";
  return residue ? `${label} · col ${hover.col + 1} · ${residue}` : `${label} · col ${hover.col + 1}`;
}

/** A small floating tooltip that follows the cursor while it's over the alignment. */
export function CursorTooltip({ hover, msa }: { hover: HoverCell | null; msa: AlignedSequences }) {
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
      {describeHover(hover, msa)}
    </div>
  );
}
