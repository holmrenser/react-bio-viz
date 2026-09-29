import { createElement, type ComponentType, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  BlastHitDistribution,
  DistanceMatrix,
  GeneModel,
  GenomeBrowser,
  MultipleSequenceAlignment,
  PhyloTree,
  type TreeNodeInfo,
} from "react-bio-viz";
import "react-bio-viz/style.css";

import { createAnywidgetStoreController, type AnyModel } from "./_storeAdapter";

/** How one Python widget class maps onto a React component. */
interface WidgetSpec {
  render: (props: Record<string, unknown>) => ReactElement;
  /**
   * Data and display traits, bound to the camelCased prop of the same name — or, as a
   * `[trait, prop]` pair, to another prop (a trait can't take a name ipywidgets uses, like `layout`).
   */
  props: (string | [string, string])[];
  /** Interactive state: each trait binds, two-way, to the component's camelCased `<trait>Store` prop. */
  stores: string[];
  /** Callback props, each built from the model: a custom message to the kernel, or a trait write. */
  events?: Record<string, (model: AnyModel) => (...args: never[]) => void>;
}

/** Node/branch click info without the screen coordinates, which mean nothing to the kernel. */
function nodePayload({ clientX: _x, clientY: _y, ...info }: TreeNodeInfo) {
  return info;
}

/**
 * Renders a component from props assembled out of traits, which TypeScript can't check: the Python
 * class guarantees the required ones (and its tests assert the trait set).
 */
function bridge<P>(Component: ComponentType<P>): (props: Record<string, unknown>) => ReactElement {
  const Dynamic = Component as unknown as ComponentType<Record<string, unknown>>;
  return (props) => createElement(Dynamic, props);
}

/** snake_case trait → camelCase prop. */
function toPropName(trait: string): string {
  return trait.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase());
}

/** Store props are named for their state (`viewportStore`), so a trait binds to its prop by name alone. */
const SPECS: Record<string, WidgetSpec> = {
  msa: {
    render: bridge(MultipleSequenceAlignment),
    props: ["msa", "width", "height", "options"],
    stores: ["viewport", "selection", "row_order", "panel_sizes"],
    events: {
      onRenameRow: (model) => (rowId: string, name: string) => model.send({ event: "rename_row", row_id: rowId, name }),
      onRemoveRows: (model) => (rowIds: string[]) => model.send({ event: "remove_rows", row_ids: rowIds }),
      onRemoveColumns: (model) => (columns: number[]) => model.send({ event: "remove_columns", columns }),
    },
  },
  phylotree: {
    render: bridge(PhyloTree),
    props: [
      "tree",
      "width",
      "height",
      ["tree_layout", "layout"],
      "show_support_values",
      "support_threshold",
      "shade_branch_by_support",
      "font_size",
      "align_tips",
      "interactive",
      "drag_enabled",
      "search_query",
      "search_use_regex",
      "show_scale_bar",
      "show_branch_lengths",
      "branch_width",
      "node_radius",
      "label_font_size",
      "leaf_spacing",
      "leaf_marker_color",
      "node_styles",
      "branch_styles",
      "active_node_id",
    ],
    stores: ["viewport", "selection"],
    events: {
      onNodeClick: (model) => (info: TreeNodeInfo) => model.send({ event: "node_click", node: nodePayload(info) }),
      onBranchClick: (model) => (info: TreeNodeInfo) => model.send({ event: "branch_click", node: nodePayload(info) }),
      onLeafOrderChange: (model) => (leafNames: string[]) => {
        model.set("leaf_order", leafNames);
        model.save_changes();
      },
    },
  },
  distancematrix: {
    render: bridge(DistanceMatrix),
    props: ["labels", "matrix", "label_names", "width", "height", "options"],
    stores: ["viewport", "row_order", "panel_sizes"],
  },
  genemodel: {
    render: bridge(GeneModel),
    props: ["gene", "width", "color_seed", "show_scale"],
    stores: ["viewport"],
  },
  genomebrowser: {
    render: bridge(GenomeBrowser),
    props: ["tracks", "reference_length", "reference_name", "width", "show_scale"],
    stores: ["viewport"],
  },
  blasthitdistribution: {
    render: bridge(BlastHitDistribution),
    props: ["hits", "query_length", "query_name", "width", "show_scale"],
    stores: ["viewport", "selection", "metric"],
  },
};

function buildProps(model: AnyModel, spec: WidgetSpec): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const entry of spec.props) {
    const [trait, prop] = typeof entry === "string" ? [entry, toPropName(entry)] : entry;
    const value = model.get(trait);
    // `None` means "not set": leave the prop off, so the component's default applies.
    if (value !== null && value !== undefined) props[prop] = value;
  }

  for (const trait of spec.stores) {
    // Python seeds these; an unset one leaves the state uncontrolled rather than null.
    if (model.get(trait) === null || model.get(trait) === undefined) continue;
    props[`${toPropName(trait)}Store`] = createAnywidgetStoreController(model, trait);
  }

  for (const [prop, handler] of Object.entries(spec.events ?? {})) props[prop] = handler(model);

  return props;
}

function render({ model, el }: { model: AnyModel; el: HTMLElement }) {
  const name = String(model.get("_component"));
  const spec = SPECS[name];
  if (!spec) {
    el.textContent = `react-bio-viz: unknown component "${name}"`;
    return;
  }

  const root: Root = createRoot(el);
  const draw = () => root.render(spec.render(buildProps(model, spec)));
  draw();

  // Store traits re-render through their store; only the plain traits need a redraw from here.
  const watched = spec.props.map((entry) => `change:${typeof entry === "string" ? entry : entry[0]}`);
  for (const event of watched) model.on(event, draw);

  return () => {
    for (const event of watched) model.off(event, draw);
    root.unmount();
  };
}

export default { render };
