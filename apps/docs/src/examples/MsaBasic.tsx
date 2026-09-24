import { MultipleSequenceAlignment } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { msa, shortName } from "../lib/data";

const CELL = 16;
/** The alignment's most densely aligned stretch — its first columns are nearly all gaps. */
const FIRST_COLUMN = 443;
const alignment = msa.map((s) => ({ ...s, header: shortName(s.header) }));
/**
 * The canvas area at these settings: 440 minus toolbar (40), cursor readout (16), minimap and its
 * divider (56), ruler (22), consensus row (16) and one track with its divider (54); the label
 * column and its divider take 156px. Seeding the window to match keeps cells square.
 */
const HEIGHT = 440;
const VISIBLE_ROWS = (HEIGHT - 40 - 16 - 56 - 22 - 16 - 54) / CELL;
const LABEL_SPACE = 156;

export default function MsaBasic() {
  return (
    <Demo>
      {(width) => (
        <MultipleSequenceAlignment
          msa={alignment}
          width={width}
          height={HEIGHT}
          options={{ tracks: ["conservation"] }}
          defaultViewport={{
            x0: FIRST_COLUMN,
            x1: FIRST_COLUMN + (width - LABEL_SPACE) / CELL,
            y0: 0,
            y1: VISIBLE_ROWS,
            xMin: 0,
            xMax: alignment[0].sequence.length,
            yMin: 0,
            yMax: alignment.length,
          }}
        />
      )}
    </Demo>
  );
}
