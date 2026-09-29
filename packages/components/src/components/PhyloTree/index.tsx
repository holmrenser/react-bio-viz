import { useCallback } from "react";
import { fitToExtent, ROOT_CLASS, useControllableState, useViewport, ViewportToolbar } from "@react-bio-viz/core";

import { EMPTY_SELECTION } from "./constants";
import { SimplePhyloTree } from "./SimplePhyloTree";
import type { PhyloTreeProps } from "./types";

export { SimplePhyloTree } from "./SimplePhyloTree";
export type {
  ColorFn,
  HierarchyPointNode,
  LayoutMode,
  LeafFn,
  PhyloTreeProps,
  SimplePhyloTreeProps,
  Tree,
  TreeBranchStyle,
  TreeNodeInfo,
  TreeNodeStyle,
  TreeSelection,
} from "./types";
export { REROOT_ID } from "./utils/reroot";
export { midpointRoot } from "./utils/midpoint";
export { parseNewick, toNewick } from "./utils/newick";
export {
  applyTreeSelection,
  collapseBySupport,
  ladderizeOrder,
  leafOrder,
  orderForLeafNames,
  rerootAbove,
  rotateOrder,
} from "./utils/treeOps";

/**
 * @public
 * @group Components
 * An interactive phylogenetic tree in rectangular, cladogram or radial layout, with a pan/zoom
 * toolbar. Scroll to pan, Ctrl/⌘-scroll to zoom; reroot, collapse clades, drag nodes to reorder
 * siblings, style nodes and branches, search leaves, and handle node/branch clicks.
 *
 * The `viewport` and the `selection` (root position, collapsed clades, sibling order) are
 * controllable; node ids are stable across reroots, so a selection and `nodeStyles` stay valid.
 * {@link SimplePhyloTree} is the same view without the toolbar, fully controlled. Pure helpers work
 * on the same `Tree` + `TreeSelection` pair: {@link midpointRoot}, {@link ladderizeOrder},
 * {@link rotateOrder}, {@link orderForLeafNames}, {@link collapseBySupport},
 * {@link applyTreeSelection}, {@link leafOrder}, {@link parseNewick} and {@link toNewick}.
 */
export function PhyloTree({
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  selection,
  defaultSelection,
  onSelectionChange,
  selectionStore,
  cladogram,
  layout,
  ...viewProps
}: PhyloTreeProps): React.JSX.Element {
  const { width = 1000, height = 900 } = viewProps;
  const [currentSelection, setSelection] = useControllableState({
    value: selection,
    defaultValue: defaultSelection ?? EMPTY_SELECTION,
    onChange: onSelectionChange,
    store: selectionStore,
  });
  // Seeded with the drawing area; the view extends it to the laid-out tree's height.
  const {
    viewport: current,
    setViewport,
    panBy,
    zoomBy,
  } = useViewport({
    extent: { xMin: 0, xMax: width, yMin: 0, yMax: height },
    viewport,
    defaultViewport,
    onViewportChange,
    viewportStore,
  });
  const reset = useCallback(() => setViewport((prev) => fitToExtent(prev)), [setViewport]);

  return (
    <div className={`${ROOT_CLASS} text-foreground`}>
      <ViewportToolbar viewport={current} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="both" />
      <SimplePhyloTree
        {...viewProps}
        layout={layout ?? (cladogram ? "cladogram" : undefined)}
        viewport={current}
        onViewportChange={setViewport}
        selection={currentSelection}
        onSelectionChange={setSelection}
      />
    </div>
  );
}
