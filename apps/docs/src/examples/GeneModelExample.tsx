import { GeneModel } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { gene } from "../lib/data";

export default function GeneModelExample() {
  return <Demo>{(width) => <GeneModel gene={gene} width={width} />}</Demo>;
}
