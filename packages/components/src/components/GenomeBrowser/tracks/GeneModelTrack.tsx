import { TranscriptStack } from "@react-bio-viz/core";

import type { GeneModelTrack as GeneModelTrackData, TrackRenderProps } from "../types";

/** Renders a `"genemodel"` track: the gene's transcripts, drawn as `GeneModel` draws them. */
export function GeneModelTrackRenderer({ track, scale }: TrackRenderProps<GeneModelTrackData>) {
  return <TranscriptStack gene={track.data} scale={scale} colorSeed={track.data.ID ?? track.id} />;
}
