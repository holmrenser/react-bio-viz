import type { SequenceInterval } from "../types";

/** Default popover body for a clicked exon/CDS: every gff3 field, with column 9 expanded. */
export function defaultPopoverFn(exon: SequenceInterval): JSX.Element {
  return (
    <ul>
      <li>ID: {exon.ID}</li>
      <li>Source: {exon.source}</li>
      <li>
        Coordinates: {exon.seqid}:{exon.start}..{exon.end}
      </li>
      <li>Strand: {exon.strand}</li>
      <li>Score: {exon.score}</li>
      <li>Type: {exon.interval_type}</li>
      {Object.entries(exon.attributes).map(([attributeName, attributeValues]) => (
        <li key={attributeName}>
          {Array.isArray(attributeValues) && attributeValues.length > 1 ? (
            <ul>
              {attributeValues.map((attributeValue) => (
                <li key={attributeValue}>{attributeValue}</li>
              ))}
            </ul>
          ) : (
            <>
              {attributeName}: {attributeValues}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
