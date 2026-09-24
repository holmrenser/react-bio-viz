import { cx, css } from "@emotion/css";

import { describeHover } from "./CursorTooltip";
import type { MSAHover } from "../types";

/** A persistent status-line readout of the hovered cell, for when a floating tooltip isn't wanted. */
export function CursorPositionBadge({ hover }: { hover: MSAHover | null }) {
  return (
    <div
      className={cx(
        "text-muted-foreground",
        css({ fontSize: 11, fontFamily: "ui-monospace, monospace", minHeight: "1.4em" })
      )}
    >
      {hover ? describeHover(hover) : " "}
    </div>
  );
}
