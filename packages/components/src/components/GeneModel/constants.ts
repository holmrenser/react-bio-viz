/** Vertical space one transcript row occupies, in pixels. */
export const TRANSCRIPT_HEIGHT = 14;

/** Height of the exon/CDS boxes drawn on a transcript's backbone. */
export const EXON_HEIGHT = 10;

/** Extra vertical room for the scale ruler and the top/bottom margins. */
export const CHROME_HEIGHT = 46;

/** Height reserved for the genomic-position ruler at the bottom of the SVG. */
export const SCALE_HEIGHT = 22;

export const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 } as const;

/** Fraction of the gene's length padded onto each side of the default viewport. */
export const VIEWPORT_PADDING_RATIO = 0.1;
