import { useEffect } from "react";
import { GAP_COLOR } from "@react-bio-viz/core";
import { css } from "@emotion/css";

import { HIGHLIGHT_MATCH_COLOR } from "../constants";
import { cellColor, type ColorStyle, type ColumnColorContext } from "../utils/colorStyle";
import { computeHighlightMask } from "../utils/highlight";
import type { AlignedSequences } from "../types";

/**
 * Renders the full-resolution alignment once into an off-screen `<canvas>` at `cellSize`
 * native resolution. Separated from the on-screen viewport crop so panning/zooming only costs a
 * cheap `drawImage` crop+scale instead of re-rasterizing every residue on every interaction.
 */
export function OffscreenCanvas({
  msa,
  colorStyle,
  colorContext,
  darkMode,
  showLetters,
  cellSize,
  canvasRef,
  highlightPattern,
  highlightUseRegex,
  showOnlyDifferences,
  referenceSequence,
}: {
  msa: AlignedSequences;
  colorStyle: ColorStyle;
  colorContext: ColumnColorContext;
  darkMode: boolean;
  showLetters: boolean;
  cellSize: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** When set, overrides normal coloring: matching residues render bright, everything else dims. */
  highlightPattern?: string;
  highlightUseRegex?: boolean;
  /** When true, a residue matching `referenceSequence` at its column is drawn as `·` instead of its letter. */
  showOnlyDifferences?: boolean;
  /** Comparison sequence for `showOnlyDifferences` (typically the alignment's consensus). */
  referenceSequence?: string;
}) {
  const numColumns = msa[0]?.sequence.length ?? 0;
  const numSeqs = msa.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dimColor = darkMode ? GAP_COLOR.dark : GAP_COLOR.light;
    const letterColor = darkMode ? "#e8e8e8" : "#1a1a1a";

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `${cellSize * 0.9}px monospace`;
    context.textAlign = "center";

    msa.forEach(({ sequence }, seqIndex) => {
      const highlightMask = highlightPattern
        ? computeHighlightMask(sequence, highlightPattern, Boolean(highlightUseRegex))
        : null;

      sequence.split("").forEach((letter, colIndex) => {
        const fill = highlightMask
          ? highlightMask[colIndex]
            ? HIGHLIGHT_MATCH_COLOR
            : dimColor
          : cellColor(letter, colIndex, colorStyle, colorContext, darkMode);
        context.fillStyle = fill;
        context.fillRect(colIndex * cellSize, seqIndex * cellSize, cellSize, cellSize);

        if (showLetters) {
          const isSameAsReference = showOnlyDifferences && referenceSequence?.[colIndex] === letter;
          context.fillStyle = letterColor;
          context.fillText(
            isSameAsReference ? "·" : letter,
            (colIndex + 0.5) * cellSize,
            (seqIndex + 0.8) * cellSize
          );
        }
      });
    });
  }, [
    msa,
    colorStyle,
    colorContext,
    darkMode,
    showLetters,
    cellSize,
    canvasRef,
    highlightPattern,
    highlightUseRegex,
    showOnlyDifferences,
    referenceSequence,
  ]);

  return (
    <canvas
      className={css({ display: "none" })}
      ref={canvasRef}
      height={numSeqs * cellSize}
      width={numColumns * cellSize}
    />
  );
}
