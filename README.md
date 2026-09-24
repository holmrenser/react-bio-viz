# react-bio-viz

React components for biological data visualization.

- **MultipleSequenceAlignment** — windowed canvas rendering (no size limit; letters crisp at any
  zoom) with pan/zoom, column ruler, minimap, consensus row, residue search, the standard colour
  schemes (ClustalX, Zappo, Taylor) plus analysis and score styles, conservation/logo/score tracks,
  row and column selection, drag-to-reorder rows, and rename/remove callbacks for editing.
- **PhyloTree** — rectangular, cladogram and radial layouts, with branch rerooting (and midpoint
  rooting), collapsible clades, drag-to-reorder (or drag past either end to reroot), node and branch
  click callbacks, per-node/branch styles, search, and Newick parse/serialise helpers.
- **DistanceMatrix** — a pairwise distance heatmap that scales to thousands of rows, sharing its
  row order with an alignment.
- **GeneModel** — transcripts, exons and CDSs over a genomic axis.
- **GenomeBrowser** — stacked feature/coverage/gene-model tracks sharing one viewport.
- **BlastHitDistribution** — BLAST hits along a query, row-stacked and coloured by e-value, bit
  score or percent identity.

![showcase](showcase.png 'react-bio-viz examples')

## Install

```bash
npm install react-bio-viz
```

## Use

Works with React 18 and 19.

```jsx
import { GeneModel, MultipleSequenceAlignment, PhyloTree } from 'react-bio-viz';
// Ships the component chrome and default theme tokens; import it once, anywhere in your app. It
// never restyles the rest of your page, and your own theme tokens (--background, --font-sans, …)
// take precedence over its defaults.
import 'react-bio-viz/style.css';

function App() {
  return (
    <div>
      <GeneModel gene={gene} />

      <MultipleSequenceAlignment
        msa={msa}
        options={{ cellSize: 16, showLabels: true, colorStyle: 'AA ClustalX' }}
      />

      <PhyloTree tree={tree} layout="radial" interactive />
    </div>
  );
}
```

## Controllable state

Every piece of interactive state — a viewport, a tree selection, a set of selected BLAST hits —
follows one contract, so learning it once covers every component. Each is a group of four props
named for its domain (`viewport` / `defaultViewport` / `onViewportChange` / `viewportStore`;
`selection` / `defaultSelection` / `onSelectionChange` / `selectionStore`) supporting three modes:

```jsx
// Uncontrolled: the component owns the state, but you can still observe every change.
<MultipleSequenceAlignment msa={msa} onViewportChange={console.log} />

// Controlled: you own it, exactly like a controlled <input>.
<MultipleSequenceAlignment msa={msa} viewport={viewport} onViewportChange={setViewport} />

// External store: hand the state to your own store (Zustand, or anything implementing
// StoreController) and the component reads and writes it directly.
<MultipleSequenceAlignment msa={msa} viewportStore={createZustandStoreController(appStore, ...)} />
```

The same `StoreController` seam is what the Jupyter bindings below plug into — a notebook is just
another external-store consumer, so no component contains any Jupyter-specific code.

## Python / Jupyter

The same components are published to PyPI as Jupyter widgets, where each piece of interactive
state is a synced traitlet:

```bash
pip install react-bio-viz
```

```python
from react_bio_viz import MSA

widget = MSA(msa=[{"header": "seq1", "sequence": "MKTAYIAKQRQISFVK"}])
widget.observe(lambda change: print(change["new"]), names="viewport")
widget
```

See [`packages/python/README.md`](packages/python/README.md).

## API reference

Generated from the source with api-extractor: [`docs/index.md`](docs/index.md), covering both
`react-bio-viz` (the components) and `@react-bio-viz/core` (the shared state, viewport, colour,
scale and layout primitives).

## Development

This is a pnpm workspace monorepo:

```
packages/core/         @react-bio-viz/core   shared primitives + shadcn/ui chrome
packages/components/   react-bio-viz         the components
packages/python/       react-bio-viz (PyPI)  anywidget/Jupyter bindings
apps/demo/                                   Vite playground
```

```bash
pnpm install
pnpm build          # core -> components -> the Python widget bundle
pnpm dev            # the demo playground
pnpm test           # Vitest across packages
pnpm typecheck
pnpm lint
pnpm run docs       # regenerate docs/ from the TSDoc comments (`pnpm docs` is a pnpm built-in)
```

For the Python package, from `packages/python`: `uv pip install -e ".[dev]"` then `pytest`.

Conventions for contributors (and AI agents) live in [`AGENTS.md`](AGENTS.md) and
`.claude/skills/bio-viz-conventions/SKILL.md`.

## License

MIT
