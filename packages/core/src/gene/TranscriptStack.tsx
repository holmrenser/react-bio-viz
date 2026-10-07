import { useId, useMemo, type ReactNode } from "react";

import { createCategoricalColorScale } from "../color/categoricalScale";
import { Popover, PopoverBody, PopoverTrigger } from "../overlay/Popover";
import type { LinearScale } from "../scale/linearScale";
import { getTranscriptParts, getTranscripts } from "./intervals";
import type { Annotation } from "../data";

/** @public Vertical space one transcript row occupies, in pixels. */
export const TRANSCRIPT_HEIGHT = 14;

/** Top padding above the first transcript. */
const STACK_TOP = 8;
const CDS_HEIGHT = 10;
const UTR_HEIGHT = 4;
const HOVER_CLASS = "cursor-pointer stroke-[1.5px] hover:stroke-[3px] hover:stroke-(--rbv-accent)";

/** @public Default popover body for a clicked exon/CDS: every GFF3 field, with column 9 expanded. */
export function defaultIntervalPopover(interval: Annotation): ReactNode {
  return (
    <ul>
      <li>ID: {interval.ID}</li>
      <li>Source: {interval.source}</li>
      <li>
        Coordinates: {interval.seqid}:{interval.start}..{interval.end}
      </li>
      <li>Strand: {interval.strand}</li>
      <li>Score: {interval.score}</li>
      <li>Type: {interval.interval_type}</li>
      {Object.entries(interval.attributes).map(([name, values]) => (
        <li key={name}>
          {Array.isArray(values) && values.length > 1 ? (
            <ul>
              {values.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          ) : (
            <>
              {name}: {values}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/** @public */
export interface TranscriptStackProps {
  gene: Annotation;
  /** Genome coordinate → pixel x. */
  scale: LinearScale;
  /** Seeds the gene's colours. */
  colorSeed: string;
  /** Popover content for a clicked exon/CDS. @defaultValue {@link defaultIntervalPopover} */
  popoverFn?: (interval: Annotation) => ReactNode;
}

/**
 * @public
 * A gene's transcripts, one row each: an arrow-tipped backbone with its exons and CDSs on top, each
 * opening a popover when clicked. Shared by `GeneModel` and `GenomeBrowser`'s gene-model track.
 */
export function TranscriptStack({ gene, scale, colorSeed, popoverFn = defaultIntervalPopover }: TranscriptStackProps) {
  // Per instance: two views of the same gene must not share (or miss) each other's marker.
  const markerId = `rbv-arrow-${useId().replace(/[^\w-]/g, "")}`;
  const transcripts = useMemo(() => getTranscripts(gene), [gene]);
  const { base, contrast } = useMemo(() => createCategoricalColorScale()(colorSeed), [colorSeed]);

  return (
    <g transform={`translate(0,${STACK_TOP})`}>
      <defs>
        <marker
          id={markerId}
          markerWidth="16"
          markerHeight="10"
          refX="0"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,5 L15,5 L10,10 M10,0 L15,5" fill="none" stroke="currentColor" />
        </marker>
      </defs>
      {transcripts.map((transcript, index) => (
        <g key={transcript.ID} className="transcript" transform={`translate(0,${index * TRANSCRIPT_HEIGHT})`}>
          <line
            x1={scale(transcript.start)}
            x2={scale(transcript.end)}
            y1={0}
            y2={0}
            stroke="currentColor"
            markerEnd={`url(#${markerId})`}
            className={HOVER_CLASS}
          />
          {getTranscriptParts(gene, transcript).map((part) => {
            const height = part.interval_type === "CDS" ? CDS_HEIGHT : UTR_HEIGHT;
            return (
              <Popover key={part.ID}>
                <PopoverTrigger asChild>
                  <rect
                    x={scale(part.start)}
                    width={scale(part.end) - scale(part.start)}
                    y={-height / 2}
                    height={height}
                    fill={part.interval_type === "CDS" ? base : contrast}
                    className={HOVER_CLASS}
                    data-pan-ignore
                  />
                </PopoverTrigger>
                <PopoverBody header={part.ID}>{popoverFn(part)}</PopoverBody>
              </Popover>
            );
          })}
        </g>
      ))}
    </g>
  );
}

/** @public Pixel height a {@link TranscriptStack} of `gene` needs, including its padding. */
export function transcriptStackHeight(gene: Annotation): number {
  return TRANSCRIPT_HEIGHT * Math.max(1, getTranscripts(gene).length) + 2 * STACK_TOP;
}
