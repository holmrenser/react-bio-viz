import {
  ACCENT_COLOR,
  createCategoricalColorScale,
  Popover,
  PopoverBody,
  PopoverTrigger,
  stackIntervals,
} from "@react-bio-viz/core";
import { css } from "@emotion/css";

import { FEATURE_HEIGHT, FEATURE_ROW_HEIGHT } from "../constants";
import type { FeatureTrack as FeatureTrackData, TrackRenderProps } from "../types";

const colorScale = createCategoricalColorScale({ seed: "genome-browser-feature" });

const HOVER_CSS = css({
  cursor: "pointer",
  strokeWidth: 1,
  "&:hover": { stroke: ACCENT_COLOR, strokeWidth: 2 },
});

function defaultFeaturePopover(feature: FeatureTrackData["data"][number]): JSX.Element {
  return (
    <ul>
      <li>ID: {feature.id}</li>
      <li>
        Coordinates: {feature.start}..{feature.end}
      </li>
      {feature.strand && <li>Strand: {feature.strand}</li>}
    </ul>
  );
}

/** Renders a `"feature"` track: interval features auto-stacked into rows to avoid overlap. */
export function FeatureTrackRenderer({ track, scale }: TrackRenderProps<FeatureTrackData>) {
  const rows = stackIntervals(track.data);

  return (
    <g>
      {track.data.map((feature) => {
        const row = rows.get(feature.id) ?? 0;
        const x = scale(feature.start);
        const width = Math.max(1, scale(feature.end) - scale(feature.start));
        const fill = feature.color ?? colorScale(feature.id).base;
        return (
          <Popover key={feature.id}>
            <PopoverTrigger asChild>
              <rect
                x={x}
                y={row * FEATURE_ROW_HEIGHT}
                width={width}
                height={FEATURE_HEIGHT}
                fill={fill}
                className={HOVER_CSS}
                data-pan-ignore
              />
            </PopoverTrigger>
            <PopoverBody header={feature.label ?? feature.id}>{defaultFeaturePopover(feature)}</PopoverBody>
          </Popover>
        );
      })}
    </g>
  );
}

/** Pixel height needed to fit every feature in `data` without overlap. */
export function featureTrackHeight(data: FeatureTrackData["data"]): number {
  const rows = stackIntervals(data);
  let maxRow = -1;
  for (const row of rows.values()) maxRow = Math.max(maxRow, row);
  return (maxRow + 1) * FEATURE_ROW_HEIGHT;
}
