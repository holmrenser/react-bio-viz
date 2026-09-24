import { useControllableState, type StoreController } from "@react-bio-viz/core";

import { LABEL_WIDTH, MINIMAP_HEIGHT, TRACK_HEIGHT } from "../constants";
import type { MSAPanelSizes, MSASelection } from "../types";
import { EMPTY_SELECTION } from "../utils/selection";

type Setter<T> = (next: T | ((prev: T) => T)) => void;

/** Domain wrapper around {@link useControllableState} for the MSA's row/column selection. */
export function useMSASelection(props: {
  selection?: MSASelection;
  defaultSelection?: MSASelection;
  onSelectionChange?: (next: MSASelection) => void;
  selectionStore?: StoreController<MSASelection>;
}): [MSASelection, Setter<MSASelection>] {
  return useControllableState<MSASelection>({
    value: props.selection,
    defaultValue: props.defaultSelection ?? EMPTY_SELECTION,
    onChange: props.onSelectionChange,
    store: props.selectionStore,
  });
}

const NO_ORDER: string[] = [];

/** Domain wrapper around {@link useControllableState} for the MSA's row display order. */
export function useRowOrder(props: {
  rowOrder?: string[];
  defaultRowOrder?: string[];
  onRowOrderChange?: (next: string[]) => void;
  rowOrderStore?: StoreController<string[]>;
}): [string[], Setter<string[]>] {
  return useControllableState<string[]>({
    value: props.rowOrder,
    defaultValue: props.defaultRowOrder ?? NO_ORDER,
    onChange: props.onRowOrderChange,
    store: props.rowOrderStore,
  });
}

/** Default panel sizes; `labelWidth` also honours the deprecated `options.labelWidth`. */
export function defaultPanelSizes(seed: Partial<MSAPanelSizes> | undefined, legacyLabelWidth?: number): MSAPanelSizes {
  return {
    labelWidth: seed?.labelWidth ?? legacyLabelWidth ?? LABEL_WIDTH,
    trackHeight: seed?.trackHeight ?? TRACK_HEIGHT,
    minimapHeight: seed?.minimapHeight ?? MINIMAP_HEIGHT,
  };
}

/** Domain wrapper around {@link useControllableState} for the MSA's resizable panel sizes. */
export function usePanelSizes(props: {
  panelSizes?: MSAPanelSizes;
  defaultPanelSizes: MSAPanelSizes;
  onPanelSizesChange?: (next: MSAPanelSizes) => void;
  panelSizesStore?: StoreController<MSAPanelSizes>;
}): [MSAPanelSizes, Setter<MSAPanelSizes>] {
  return useControllableState<MSAPanelSizes>({
    value: props.panelSizes,
    defaultValue: props.defaultPanelSizes,
    onChange: props.onPanelSizesChange,
    store: props.panelSizesStore,
  });
}

