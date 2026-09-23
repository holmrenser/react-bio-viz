import { createElement, type ComponentType, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  BlastHitDistribution,
  GeneModel,
  GenomeBrowser,
  MultipleSequenceAlignment,
  PhyloTree,
} from "react-bio-viz";
import "react-bio-viz/style.css";

import { createAnywidgetStoreController, type AnyModel } from "./_storeAdapter";

/**
 * How one Python widget class maps onto a React component.
 *
 * `props` are plain data/display traits, forwarded straight through. `stores` are the controllable
 * ones: each binds a synced trait to the component's `StoreController` prop, which is what makes
 * state two-way (Python writes the trait → the component re-renders; the user pans → the trait is
 * written back and `.observe()` fires on the kernel side).
 */
interface WidgetSpec {
  render: (props: Record<string, unknown>) => ReactElement;
  props: string[];
  /** Synced traits bound as controllable state; each binds to the `<trait>Store` prop. */
  stores: string[];
}

/**
 * Bridges runtime trait values to a component's static prop type.
 *
 * Props here are assembled from synced traits, so TypeScript cannot check them at this boundary —
 * the Python widget class is what guarantees the required ones are present, and its tests assert
 * the trait set. This helper keeps that one unavoidable assertion in a single documented place
 * instead of scattering casts through the spec table.
 */
function bridge<P>(Component: ComponentType<P>): (props: Record<string, unknown>) => ReactElement {
  const Dynamic = Component as unknown as ComponentType<Record<string, unknown>>;
  return (props) => createElement(Dynamic, props);
}

/**
 * Traits are snake_case (idiomatic Python); props are camelCase (idiomatic React). One conversion
 * here keeps both sides natural instead of forcing one language's convention on the other.
 */
function toPropName(trait: string): string {
  return trait.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase());
}

/**
 * Every component names its store props for their domain (`viewportStore`, `selectionStore`), so
 * a trait binds to its prop by name alone — no per-component mapping table.
 */
const SPECS: Record<string, WidgetSpec> = {
  msa: {
    render: bridge(MultipleSequenceAlignment),
    props: ["msa", "width", "height", "options"],
    stores: ["viewport"],
  },
  phylotree: {
    render: bridge(PhyloTree),
    props: [
      "tree",
      "width",
      "height",
      "layout",
      "show_support_values",
      "shade_branch_by_support",
      "font_size",
      "align_tips",
      "interactive",
      "search_query",
      "search_use_regex",
      "show_scale_bar",
    ],
    stores: ["viewport", "selection"],
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
    props: ["hits", "query_length", "query_name", "width", "show_scale", "metric"],
    stores: ["viewport", "selection"],
  },
};

function buildProps(model: AnyModel, spec: WidgetSpec): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const trait of spec.props) {
    const value = model.get(trait);
    // A `None` trait means "not set" — leave the prop off so the component's own default applies,
    // rather than overriding it with null.
    if (value !== null && value !== undefined) props[toPropName(trait)] = value;
  }

  for (const trait of spec.stores) {
    // Python seeds these at construction; if one is somehow unset, fall back to leaving the
    // component uncontrolled rather than handing it a null viewport/selection.
    if (model.get(trait) === null || model.get(trait) === undefined) continue;
    props[`${trait}Store`] = createAnywidgetStoreController(model, trait);
  }

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

  // Store-backed traits re-render through `useSyncExternalStore`, so only the plain data/display
  // traits need to force a re-render from out here.
  const watched = spec.props.map((trait) => `change:${trait}`);
  for (const event of watched) model.on(event, draw);

  return () => {
    for (const event of watched) model.off(event, draw);
    root.unmount();
  };
}

export default { render };
