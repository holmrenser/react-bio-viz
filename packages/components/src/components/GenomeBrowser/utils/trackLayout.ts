import { countIntervalRows, transcriptStackHeight } from "@react-bio-viz/core";

import { COVERAGE_TRACK_HEIGHT, FEATURE_ROW_HEIGHT, MARGIN, SCALE_HEIGHT, TRACK_GAP } from "../constants";
import type { GenomeTrack } from "../types";

/** A track's own `height`, else what its kind needs to show all of its data. */
export function trackHeight(track: GenomeTrack): number {
  if (track.height) return track.height;
  switch (track.kind) {
    case "feature":
      return Math.max(1, countIntervalRows(track.data)) * FEATURE_ROW_HEIGHT;
    case "coverage":
      return COVERAGE_TRACK_HEIGHT;
    case "genemodel":
      return transcriptStackHeight(track.data);
    default:
      return FEATURE_ROW_HEIGHT;
  }
}

/** Where each track goes — tracks stacked below the ruler — and the total height they take. */
export function layoutTracks(
  tracks: GenomeTrack[],
  showScale: boolean
): { rows: { track: GenomeTrack; y: number; height: number }[]; totalHeight: number } {
  let y = MARGIN.top + (showScale ? SCALE_HEIGHT : 0);
  const rows = tracks.map((track) => {
    const row = { track, y, height: trackHeight(track) };
    y += row.height + TRACK_GAP;
    return row;
  });
  const last = rows[rows.length - 1];
  const bottom = last ? last.y + last.height : y;
  return { rows, totalHeight: bottom + MARGIN.bottom };
}
