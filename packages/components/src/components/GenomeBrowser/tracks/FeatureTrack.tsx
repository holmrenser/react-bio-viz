import { createCategoricalColorScale, Popover, PopoverBody, PopoverTrigger, stackIntervals } from "@react-bio-viz/core";

import { FEATURE_HEIGHT, FEATURE_ROW_HEIGHT } from "../constants";
import type { FeatureTrack as FeatureTrackData, GenomeFeature, TrackRenderProps } from "../types";

const colorScale = createCategoricalColorScale({ seed: "genome-browser-feature" });

function defaultFeaturePopover(feature: GenomeFeature) {
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

/** Renders a `"feature"` track: interval features, stacked into rows where they overlap. */
export function FeatureTrackRenderer({ track, scale }: TrackRenderProps<FeatureTrackData>) {
  const rows = stackIntervals(track.data);
  return (
    <g>
      {track.data.map((feature) => (
        <Popover key={feature.id}>
          <PopoverTrigger asChild>
            <rect
              x={scale(feature.start)}
              y={(rows.get(feature.id) ?? 0) * FEATURE_ROW_HEIGHT}
              width={Math.max(1, scale(feature.end) - scale(feature.start))}
              height={FEATURE_HEIGHT}
              fill={feature.color ?? colorScale(feature.id).base}
              className="cursor-pointer stroke-1 hover:stroke-2 hover:stroke-(--rbv-accent)"
              data-pan-ignore
            />
          </PopoverTrigger>
          <PopoverBody header={feature.label ?? feature.id}>{defaultFeaturePopover(feature)}</PopoverBody>
        </Popover>
      ))}
    </g>
  );
}
