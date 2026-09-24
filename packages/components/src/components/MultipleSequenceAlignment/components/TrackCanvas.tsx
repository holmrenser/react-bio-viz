import { useEffect, useRef } from "react";
import { getDevicePixelRatio, qualityGradient, SELECTION_LITERAL } from "@react-bio-viz/core";

import { CELL_FILL_RATIO } from "../constants";
import { logoColumn } from "../utils/logo";
import type { ColumnStat } from "../utils/msaAnalysis";

/** Below this letter height (px) a logo letter is drawn as a plain bar — too small to read. */
const MIN_LOGO_LETTER_HEIGHT = 3;
/** Reference font size used to measure glyphs before stretching them to their slot. */
const LOGO_REFERENCE_FONT_SIZE = 200;

/**
 * One track below the alignment, sharing its horizontal pan/zoom: quality bars for per-column
 * scores, or stacked letters for a sequence logo. Clicking selects the column under the pointer,
 * with the same Shift (extend) / Cmd-Ctrl (toggle) modifiers as everywhere else in the MSA.
 */
export function TrackCanvas({
  kind,
  scores,
  columnStats,
  alphabetSize,
  letterColor,
  x0,
  x1,
  width,
  height,
  darkMode,
  selectedColumns,
  hoverCol,
  onColumnClick,
  onHoverColChange,
}: {
  kind: "bars" | "logo";
  /** 0–1 per column, for `"bars"`. */
  scores?: readonly number[];
  /** For `"logo"`. */
  columnStats?: readonly ColumnStat[];
  alphabetSize: number;
  /** Colour of a logo letter, from the MSA's current colour style. */
  letterColor: (char: string, col: number) => string;
  x0: number;
  x1: number;
  width: number;
  height: number;
  darkMode: boolean;
  selectedColumns: readonly number[];
  hoverCol: number | null;
  onColumnClick: (col: number, event: React.MouseEvent) => void;
  onHoverColChange: (col: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spanX = x1 - x0;
  const cellW = spanX > 0 ? width / spanX : 0;
  const columnCount = kind === "logo" ? (columnStats?.length ?? 0) : (scores?.length ?? 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cellW <= 0) return;
    const dpr = getDevicePixelRatio();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const firstCol = Math.max(0, Math.floor(x0));
    const lastCol = Math.min(columnCount, Math.ceil(x1));
    const barWidth = cellW >= 6 ? cellW * CELL_FILL_RATIO : cellW;
    const colX = (col: number) => (col - x0) * cellW;

    ctx.fillStyle = SELECTION_LITERAL.fill;
    for (const col of selectedColumns) {
      if (col + 1 > x0 && col < x1) ctx.fillRect(colX(col), 0, cellW, height);
    }

    if (kind === "bars" && scores) {
      for (let col = firstCol; col < lastCol; col += 1) {
        const score = Math.max(0, Math.min(1, scores[col] ?? 0));
        const barHeight = score * height;
        ctx.fillStyle = qualityGradient(score, darkMode);
        ctx.fillRect(colX(col), height - barHeight, Math.max(1, barWidth), barHeight);
      }
    }

    if (kind === "logo" && columnStats) {
      ctx.font = `${LOGO_REFERENCE_FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = "alphabetic";
      const metrics = ctx.measureText("G");
      const capHeight = (metrics.actualBoundingBoxAscent ?? 0) + (metrics.actualBoundingBoxDescent ?? 0) || LOGO_REFERENCE_FONT_SIZE * 0.7;
      const ascent = metrics.actualBoundingBoxAscent ?? capHeight;
      for (let col = firstCol; col < lastCol; col += 1) {
        const letters = logoColumn(columnStats[col], alphabetSize);
        const stackHeight = letters.reduce((sum, letter) => sum + letter.height, 0) * height;
        let y = height - stackHeight;
        for (const letter of letters) {
          const letterHeight = letter.height * height;
          ctx.fillStyle = letterColor(letter.char, col);
          if (letterHeight < MIN_LOGO_LETTER_HEIGHT || cellW < 4) {
            ctx.fillRect(colX(col), y, Math.max(1, barWidth), letterHeight);
          } else {
            const glyphWidth = ctx.measureText(letter.char).width || LOGO_REFERENCE_FONT_SIZE * 0.6;
            ctx.save();
            ctx.translate(colX(col), y);
            ctx.scale(barWidth / glyphWidth, letterHeight / capHeight);
            ctx.fillText(letter.char, 0, ascent);
            ctx.restore();
          }
          y += letterHeight;
        }
      }
    }

    if (hoverCol !== null && hoverCol + 1 > x0 && hoverCol < x1) {
      ctx.fillStyle = "rgba(48, 92, 222, 0.12)";
      ctx.fillRect(colX(hoverCol), 0, Math.max(1, cellW), height);
    }
  }, [kind, scores, columnStats, alphabetSize, letterColor, x0, x1, cellW, width, height, darkMode, selectedColumns, hoverCol, columnCount]);

  const colAt = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.floor(x0 + (event.clientX - rect.left) / cellW);
    return col >= 0 && col < columnCount ? col : null;
  };

  return (
    <canvas
      ref={canvasRef}
      data-pan-ignore
      style={{ width, height, cursor: "crosshair" }}
      onClick={(event) => {
        const col = colAt(event);
        if (col !== null) onColumnClick(col, event);
      }}
      onMouseMove={(event) => onHoverColChange(colAt(event))}
      onMouseLeave={() => onHoverColChange(null)}
    />
  );
}
