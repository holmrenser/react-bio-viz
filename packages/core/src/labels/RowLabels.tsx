import { useCallback, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";

import { cn } from "../lib/utils";
import { SELECTION_LITERAL } from "../theme/tokens";

/** @public One row of a {@link RowLabels} column. */
export interface RowLabel {
  /** Stable identity: what rename/remove/select callbacks report. */
  id: string;
  /** Displayed text. */
  label: string;
  /** Optional per-row text styling (e.g. a tree clade colour carried over to a label column). */
  style?: { color?: string; fontWeight?: string | number; fontStyle?: string };
}

/** @public An in-progress drag: row `from` (a display index) is currently hovering over index `to`. */
export interface RowReorderPreview {
  from: number;
  to: number;
}

/** @public */
export interface RowLabelsProps {
  rows: RowLabel[];
  /** Pixel height of one row, i.e. the zoomed row pitch of whatever this column sits beside. */
  rowHeight: number;
  /** Pixel offset of row 0's top edge (≤ 0 when scrolled down) — `-viewport.y0 * rowHeight`. */
  offsetY: number;
  width: number;
  height: number;
  /** Defaults to fitting the row height, capped at 12px. */
  fontSize?: number;
  textAlign?: "left" | "right";
  /** Row hovered elsewhere (e.g. on the canvas beside this column), highlighted here too. */
  hoverIndex?: number | null;
  onHoverIndexChange?: (index: number | null) => void;
  selectedIds?: ReadonlySet<string>;
  /** A click (pointer released without dragging) on row `index`; the event carries modifier keys. */
  onRowClick?: (index: number, event: React.PointerEvent) => void;
  /** Enables inline rename (double-click, or the pencil on hover). */
  onRename?: (id: string, name: string) => void;
  /** Enables the × remove button on hover. */
  onRemove?: (id: string) => void;
  /** Enables drag-to-reorder; called once, on drop, with display indices. */
  onReorder?: (from: number, to: number) => void;
  /** Live drag state, so a neighbouring canvas can preview the reorder before it is committed. */
  onReorderPreview?: (preview: RowReorderPreview | null) => void;
  className?: string;
}

const DRAG_THRESHOLD_PX = 4;
/** Below this row pitch labels would be illegible slivers, so text is not drawn at all. */
const MIN_TEXT_ROW_HEIGHT = 6;
const MAX_FONT_SIZE = 12;

/** How far row `index` moves to make room while row `from` is dragged over `to`. */
function rowShift(index: number, from: number, to: number, rowHeight: number): number {
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -rowHeight;
  if (from > to && index >= to && index < from) return rowHeight;
  return 0;
}

/**
 * @public
 * A virtualised column of row labels that stays aligned with a panned/zoomed row axis — the MSA's
 * sequence names, the distance matrix's row names. Hover, click-to-select, inline rename, remove,
 * and drag-to-reorder (with a live preview reported through `onReorderPreview`) are each enabled by
 * passing the matching callback, so a read-only column is just `rows`/`rowHeight`/`offsetY`.
 */
export function RowLabels({
  rows,
  rowHeight,
  offsetY,
  width,
  height,
  fontSize,
  textAlign = "left",
  hoverIndex,
  onHoverIndexChange,
  selectedIds,
  onRowClick,
  onRename,
  onRemove,
  onReorder,
  onReorderPreview,
  className,
}: RowLabelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localHover, setLocalHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; to: number; clientY: number; grabOffset: number } | null>(null);
  const pendingRef = useRef<{ index: number; x: number; y: number; grabOffset: number } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null);

  const effectiveFontSize = fontSize ?? Math.min(MAX_FONT_SIZE, Math.max(1, rowHeight * 0.75));
  const showText = rowHeight >= MIN_TEXT_ROW_HEIGHT;
  const effectiveHover = drag ? null : (hoverIndex ?? localHover);

  const indexAt = useCallback(
    (clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const top = rect?.top ?? 0;
      const raw = Math.floor((clientY - top - offsetY) / rowHeight);
      return Math.max(0, Math.min(rows.length - 1, raw));
    },
    [offsetY, rowHeight, rows.length]
  );

  const setHover = (index: number | null) => {
    setLocalHover(index);
    onHoverIndexChange?.(index);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (renaming || event.button > 0) return;
    const rowTop = offsetY + index * rowHeight + (containerRef.current?.getBoundingClientRect().top ?? 0);
    pendingRef.current = { index, x: event.clientX, y: event.clientY, grabOffset: event.clientY - rowTop };
    try {
      containerRef.current?.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pending = pendingRef.current;
    if (pending && !drag && onReorder) {
      if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < DRAG_THRESHOLD_PX) return;
      const next = { from: pending.index, to: pending.index, clientY: event.clientY, grabOffset: pending.grabOffset };
      pendingRef.current = null;
      setDrag(next);
      onReorderPreview?.({ from: next.from, to: next.to });
      return;
    }
    if (drag) {
      const to = indexAt(event.clientY);
      if (to !== drag.to) onReorderPreview?.({ from: drag.from, to });
      setDrag({ ...drag, to, clientY: event.clientY });
      return;
    }
    if (!pending) setHover(indexAt(event.clientY));
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    try {
      containerRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
    if (drag) {
      if (!cancelled && drag.to !== drag.from) onReorder?.(drag.from, drag.to);
      setDrag(null);
      onReorderPreview?.(null);
      return;
    }
    if (pending && !cancelled) onRowClick?.(pending.index, event);
  };

  const commitRename = () => {
    if (!renaming) return;
    const name = renaming.draft.trim();
    const current = rows.find((row) => row.id === renaming.id)?.label;
    if (name && name !== current) onRename?.(renaming.id, name);
    setRenaming(null);
  };

  const first = Math.max(0, Math.floor(-offsetY / rowHeight) - 1);
  const last = Math.min(rows.length - 1, Math.ceil((height - offsetY) / rowHeight) + 1);
  const visible: number[] = [];
  for (let index = first; index <= last; index += 1) visible.push(index);

  const containerRect = containerRef.current?.getBoundingClientRect();

  return (
    <div
      ref={containerRef}
      className={cn("relative shrink-0 overflow-hidden select-none", className)}
      style={{ width, height, touchAction: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endPointer(event, false)}
      onPointerCancel={(event) => endPointer(event, true)}
      onPointerLeave={() => {
        if (!drag && !pendingRef.current) setHover(null);
      }}
    >
      {visible.map((index) => {
        const row = rows[index];
        const isDragged = drag?.from === index;
        const isHovered = effectiveHover === index;
        const isSelected = selectedIds?.has(row.id) ?? false;
        const isRenaming = renaming?.id === row.id;
        const shift = drag ? rowShift(index, drag.from, drag.to, rowHeight) : 0;
        return (
          <div
            key={index}
            data-row-index={index}
            className="absolute left-0 flex items-center gap-0.5 overflow-hidden whitespace-nowrap"
            style={{
              top: offsetY + index * rowHeight + shift,
              height: rowHeight,
              width,
              fontSize: effectiveFontSize,
              paddingLeft: textAlign === "left" ? 4 : undefined,
              paddingRight: textAlign === "right" ? 4 : undefined,
              justifyContent: textAlign === "right" ? "flex-end" : "flex-start",
              opacity: isDragged ? 0 : 1,
              background: isSelected ? SELECTION_LITERAL.fill : isHovered ? "rgb(var(--rbv-accent-rgb) / 0.15)" : undefined,
              cursor: drag ? "grabbing" : onReorder ? "grab" : onRowClick ? "pointer" : "default",
              transition: drag && !isDragged ? "top 120ms ease" : undefined,
              ...row.style,
            }}
            onPointerDown={(event) => onPointerDown(event, index)}
          >
            {isHovered && !isRenaming && showText && onRename && (
              <button
                type="button"
                title="Rename"
                aria-label={`Rename ${row.label}`}
                className="shrink-0 opacity-50 hover:opacity-100"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setRenaming({ id: row.id, draft: row.label });
                }}
              >
                <Pencil style={{ width: effectiveFontSize, height: effectiveFontSize }} />
              </button>
            )}
            {isHovered && !isRenaming && showText && onRemove && (
              <button
                type="button"
                title="Remove"
                aria-label={`Remove ${row.label}`}
                className="shrink-0 opacity-50 hover:opacity-100"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(row.id);
                }}
              >
                <X style={{ width: effectiveFontSize, height: effectiveFontSize }} />
              </button>
            )}
            {isRenaming ? (
              <input
                autoFocus
                aria-label="New name"
                value={renaming.draft}
                className="w-full rounded-sm border bg-background px-1"
                style={{ fontSize: effectiveFontSize, height: Math.max(12, rowHeight - 2) }}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => setRenaming({ id: row.id, draft: event.target.value })}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") commitRename();
                  if (event.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              showText && (
                <span
                  className="overflow-hidden text-ellipsis"
                  onDoubleClick={
                    onRename
                      ? (event) => {
                          event.stopPropagation();
                          setRenaming({ id: row.id, draft: row.label });
                        }
                      : undefined
                  }
                >
                  {row.label}
                </span>
              )
            )}
          </div>
        );
      })}

      {drag && (
        <>
          <div
            className="pointer-events-none absolute left-0 z-10 h-0.5 w-full rounded-sm bg-current opacity-60"
            style={{ top: offsetY + drag.to * rowHeight }}
          />
          <div
            className="pointer-events-none fixed z-50 overflow-hidden rounded-sm bg-background whitespace-nowrap shadow-md"
            style={{
              left: containerRect?.left ?? 0,
              top: drag.clientY - drag.grabOffset,
              width,
              height: rowHeight,
              lineHeight: `${rowHeight}px`,
              fontSize: effectiveFontSize,
              paddingLeft: 4,
            }}
          >
            {rows[drag.from]?.label}
          </div>
        </>
      )}
    </div>
  );
}
