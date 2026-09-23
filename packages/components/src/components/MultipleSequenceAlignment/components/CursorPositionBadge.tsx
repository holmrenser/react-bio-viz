import { cx, css } from "@emotion/css";

import { describeHover, type HoverCell } from "./CursorTooltip";
import type { AlignedSequences } from "../types";

/** A persistent status-line readout of the hovered cell, for when a floating tooltip isn't wanted. */
export function CursorPositionBadge({ hover, msa }: { hover: HoverCell | null; msa: AlignedSequences }) {
  return (
    <div
      className={cx(
        "text-muted-foreground",
        css({ fontSize: 11, fontFamily: "ui-monospace, monospace", minHeight: "1.4em" })
      )}
    >
      {hover ? describeHover(hover, msa) : " "}
    </div>
  );
}
