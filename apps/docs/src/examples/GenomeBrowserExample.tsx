import { GenomeBrowser } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { gene } from "../lib/data";
import { genomeBrowserTracks } from "../lib/genomeData";

const referenceLength = 35039693 + 40 * 145;

export default function GenomeBrowserExample() {
  return (
    <Demo>
      {(width) => (
        <GenomeBrowser
          tracks={genomeBrowserTracks}
          referenceLength={referenceLength}
          referenceName={gene.seqid}
          width={width}
          defaultViewport={{ x0: 35039693, x1: 35045433, y0: 0, y1: 1, xMin: 0, xMax: referenceLength, yMin: 0, yMax: 1 }}
        />
      )}
    </Demo>
  );
}
