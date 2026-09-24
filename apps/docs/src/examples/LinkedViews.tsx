import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  DistanceMatrix,
  MultipleSequenceAlignment,
  PhyloTree,
  createControllableStore,
  createZustandStoreController,
  leafOrder,
  midpointRoot,
  orderForLeafNames,
  type TreeSelection,
} from "react-bio-viz";

import { Demo } from "../components/Demo";
import { subset } from "../lib/data";
import { neighborJoining, pDistances } from "../lib/phylo";

const alignment = subset(24);
const labels = alignment.map((s) => s.header);

/** One row order for all three views — an ordinary store, bound through each view's `rowOrderStore`. */
const orderStore = createControllableStore<string[]>([]);
const rowOrder = createZustandStoreController(
  orderStore,
  (order) => order,
  (store, next) => store.setState((prev) => (typeof next === "function" ? next(prev) : next))
);

export default function LinkedViews() {
  const distances = useMemo(() => pDistances(alignment), []);
  const tree = useMemo(() => neighborJoining(labels, distances), [distances]);
  const [selection, setSelection] = useState<TreeSelection>(() => ({ collapsed: [], ...midpointRoot(tree) }));
  const order = useSyncExternalStore(orderStore.subscribe, orderStore.getState);

  // Rows reordered in the alignment or matrix: rotate the tree to follow, as far as its topology allows.
  useEffect(() => {
    if (order.length === 0 || order.join() === leafOrder(tree, selection).join()) return;
    setSelection((s) => ({ ...s, order: orderForLeafNames(tree, s, order) }));
    // Only a change of the shared order should rotate the tree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <Demo>
      {(width) => {
        const half = Math.floor((width - 16) / 2);
        return (
          <>
            <PhyloTree
              tree={tree}
              width={width}
              height={440}
              leafSpacing={17}
              interactive
              showSupportValues={false}
              selection={selection}
              onSelectionChange={setSelection}
              onLeafOrderChange={(names) => rowOrder.setValue(names)}
            />
            <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
              <MultipleSequenceAlignment
                msa={alignment}
                width={width >= 900 ? half : width}
                height={430}
                options={{ showMinimap: false, showToolbar: false }}
                defaultPanelSizes={{ labelWidth: 110 }}
                rowOrderStore={rowOrder}
              />
              <DistanceMatrix
                labels={labels}
                matrix={distances}
                width={width >= 900 ? half : width}
                height={430}
                options={{ showToolbar: false, showNumbers: false, cellWidth: 16, cellHeight: 16 }}
                defaultPanelSizes={{ labelWidth: 110 }}
                rowOrderStore={rowOrder}
              />
            </div>
          </>
        );
      }}
    </Demo>
  );
}
