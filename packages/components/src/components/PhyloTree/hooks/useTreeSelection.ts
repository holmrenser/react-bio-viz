import { useControllableState, type StoreController } from "@react-bio-viz/core";

import type { TreeSelection } from "../types";

const DEFAULT_SELECTION: TreeSelection = { collapsed: [] };

/** Domain wrapper around {@link useControllableState} for PhyloTree's reroot/collapse selection. */
export function useTreeSelection(props: {
  selection?: TreeSelection;
  defaultSelection?: TreeSelection;
  onSelectionChange?: (next: TreeSelection) => void;
  selectionStore?: StoreController<TreeSelection>;
}): [TreeSelection, (next: TreeSelection | ((prev: TreeSelection) => TreeSelection)) => void] {
  return useControllableState<TreeSelection>({
    value: props.selection,
    defaultValue: props.defaultSelection ?? DEFAULT_SELECTION,
    onChange: props.onSelectionChange,
    store: props.selectionStore,
  });
}
