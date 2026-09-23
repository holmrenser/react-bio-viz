import { createCategoricalColorScale } from "@react-bio-viz/core";

import { Exon } from "../../GeneModel/components/Exon";
import { defaultPopoverFn } from "../../GeneModel/components/IntervalPopover";
import { Transcript } from "../../GeneModel/components/Transcript";
import { TRANSCRIPT_HEIGHT } from "../../GeneModel/constants";
import type { SequenceInterval } from "../../GeneModel/types";
import { getTranscriptChildren, getTranscripts, groupByID } from "../../GeneModel/utils/intervals";
import type { GeneModelTrack as GeneModelTrackData, TrackRenderProps } from "../types";

/** Vertical padding around the transcripts inside a gene-model track. */
const TRACK_PADDING = 16;

/**
 * Renders a `"genemodel"` track by reusing `GeneModel`'s own `Transcript`/`Exon` sub-renderers —
 * a gene track in a genome browser is the same visual as the standalone `GeneModel` component,
 * just laid out as one track among others instead of owning the whole widget.
 */
export function GeneModelTrackRenderer({ track, scale }: TrackRenderProps<GeneModelTrackData>) {
  const gene = track.data;
  const intervals = groupByID(gene.children ?? []);
  const transcripts = getTranscripts(gene);
  const { base: baseColor, contrast: contrastColor } = createCategoricalColorScale()(gene.ID ?? gene.seqid ?? track.id);

  return (
    <g transform="translate(0,8)">
      {transcripts.map((transcript: SequenceInterval, index) => {
        const transcriptChildren = getTranscriptChildren({ transcript, intervals });
        return (
          <Transcript scale={scale} key={transcript.ID} transcript={transcript} index={index}>
            {transcriptChildren
              .slice()
              .sort((interval) => (interval.interval_type === "CDS" ? 1 : 0))
              .map((interval: SequenceInterval) => (
                <Exon
                  scale={scale}
                  key={interval.ID}
                  interval={interval}
                  baseColor={baseColor}
                  contrastColor={contrastColor}
                  exonPopoverFn={defaultPopoverFn}
                />
              ))}
          </Transcript>
        );
      })}
    </g>
  );
}

/** Pixel height needed to fit every transcript of `gene` without overlap. */
export function geneModelTrackHeight(gene: SequenceInterval): number {
  return TRANSCRIPT_HEIGHT * Math.max(1, getTranscripts(gene).length) + TRACK_PADDING;
}
