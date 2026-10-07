# Changelog

The npm package and the PyPI package are released together, from one `vX.Y.Z` tag (see
`.github/workflows/release.yml`). The `## X.Y.Z` section for a version is that release's notes on
GitHub, so a version can't be released without one.

## 0.2.0

The components now take the [betula](https://holmrenser.github.io/betula/) schemas as input data. betula is the set of JSON shapes shared with [picea](https://github.com/holmrenser/picea), [acacia](https://github.com/wur-bioinformatics/acacia), [blastserver](https://github.com/holmrenser/blastserver) and [iqtreeserver](https://github.com/holmrenser/iqtreeserver), so their output renders without conversion. See [Data formats](https://holmrenser.github.io/react-bio-viz/concepts/data-formats/) for which schema each component takes.

```bash
npm install react-bio-viz@0.2.0
pip install react-bio-viz==0.2.0
```

### ⚠️ Breaking changes

Three field names change to match betula:

| | 0.1.0 | 0.2.0 |
| --- | --- | --- |
| Alignment rows (`MultipleSequenceAlignment` `msa`) | `{ header, sequence, id? }` | `{ identifier, sequence, id? }` |
| Tree nodes (`PhyloTree` `tree`) | `{ ID?, name, length, children }` | `{ id?, name, length, children }` |
| Gene annotations (`GeneModel` `gene`, `genemodel` tracks) | `SequenceInterval`, `children` optional | `Annotation`, `children` required (`[]` on leaves) |

In Python, `parse_fasta` / `read_fasta` now return `[{"identifier", "sequence"}, …]`.

#### Migrating

**Alignments.** Rename `header` to `identifier`. A row's optional `id` is unchanged and still defaults to the identifier.

```diff
- const msa = [{ header: "seq1", sequence: "MKTAYIAKQR" }];
+ const msa = [{ identifier: "seq1", sequence: "MKTAYIAKQR" }];
```

**Trees.** Rename `ID` to `id`. Trees from `parseNewick` need no change.

```diff
- { ID: "clade1", name: "95", length: 0.1, children: [...] }
+ { id: "clade1", name: "95", length: 0.1, children: [...] }
```

**Gene annotations.** Every feature needs a `children` array, so give leaf exons and CDSs `children: []`. `SequenceInterval` still works as a deprecated alias for `Annotation`. `score` is now `number | "."`, no longer any string.

**Python.**

```diff
- msa.msa = [r for r in msa.msa if r.get("id", r["header"]) not in row_ids]
+ msa.msa = [r for r in msa.msa if r.get("id", r["identifier"]) not in row_ids]
```

Check your code for places that read `.header`, `["header"]` or `.ID`. TypeScript flags the renamed fields; plain JavaScript and Python code won't fail, but rows lose their labels and tree nodes their ids.

### New

- **`blastHitsFromResult(result)`** (Python: `blast_hits_from_result`) turns a betula `BlastResult`, which is blastserver's output, into `BlastHitDistribution` rows, one per HSP:
  ```tsx
  <BlastHitDistribution hits={blastHitsFromResult(result)} queryLength={result.queryLen} />
  ```
- **`alignmentSequences(alignment)`** returns the rows of a betula `Alignment`, whether it's a bare array or `{ type: "alignment", sequences }`.
- **`DistanceMatrix`** props already matched the betula `DistanceMatrix` shape, so one can be passed straight in: `<DistanceMatrix {...distances} />`.
- **The betula types are exported from `react-bio-viz`**: `Tree`, `Sequence`, `Alignment`, `Annotation`, `BlastResult`, `Hit`, `Hsp` and the rest. Nothing extra to install, since the types are bundled into the package's type declarations.
- Sequences may carry betula's alphabet discriminator (`type: "dna-sequence"`, `"rna-sequence"` or `"protein-sequence"`).

The components don't validate their input. To validate JSON from outside your app, use [`betula-schema`](https://www.npmjs.com/package/betula-schema) (`parse("Tree", data)`), which rejects exactly what the schema rejects.

**Full changelog:** https://github.com/holmrenser/react-bio-viz/compare/v0.1.0...v0.2.0 (#372)

## 0.1.0

A ground-up rewrite of react-bio-viz as a set of consistently controllable components, with a first release of the Jupyter widgets on PyPI and a [documentation site with live examples](https://holmrenser.github.io/react-bio-viz/).

```bash
npm install react-bio-viz@0.1.0
pip install react-bio-viz==0.1.0
```

> [!NOTE]
> 0.1.0 is not compatible with 0.0.x: component props, data shapes and styling all changed.
> [0.2.0](https://github.com/holmrenser/react-bio-viz/releases/tag/v0.2.0) has since changed the input data to the betula schemas. If you're upgrading from 0.0.x, go straight to 0.2.0 and follow the [Getting started](https://holmrenser.github.io/react-bio-viz/getting-started/) guide.

### Components

- **MultipleSequenceAlignment**: windowed canvas rendering, so alignment size doesn't matter and letters stay crisp at any zoom. Pan/zoom, a column ruler, minimap, consensus row and residue search. The ClustalX, Zappo and Taylor colour schemes plus analysis and score styles. Conservation, logo and custom score tracks. Row and column selection, drag-to-reorder rows, and rename/remove callbacks for editing.
- **PhyloTree**: rectangular, cladogram and radial layouts. Rerooting on a branch, midpoint rooting, collapsible clades, and drag-to-reorder (drag past either end to reroot). Node and branch click callbacks, per-node and per-branch styles, search, and `parseNewick` / `toNewick`.
- **DistanceMatrix** (new): a canvas heatmap of pairwise distances that scales to thousands of rows and can share its row order with an alignment.
- **GeneModel**: transcripts, exons and CDSs along a genomic axis.
- **GenomeBrowser**: stacked feature, coverage and gene-model tracks sharing one viewport.
- **BlastHitDistribution**: BLAST hits along a query, stacked into rows and coloured by e-value, bit score or percent identity.

### One state contract for every component

Each piece of interactive state (a viewport, a selection, a row order) is a group of props named for it, such as `viewport` / `defaultViewport` / `onViewportChange` / `viewportStore`. It works in three modes:

```jsx
// Uncontrolled: the component owns the state, and you can still observe every change.
<MultipleSequenceAlignment msa={msa} onViewportChange={console.log} />

// Controlled, like a controlled <input>.
<MultipleSequenceAlignment msa={msa} viewport={viewport} onViewportChange={setViewport} />

// External store: shared between views, or with your own state management.
const viewportStore = createControllableStore(initialViewport);
<MultipleSequenceAlignment msa={msa} viewportStore={viewportStore} />
```

Every component also has a fully controlled `Simple*` version (`SimplePhyloTree`, …) with no toolbar and no state of its own, for building your own navigation around it. See [Controllable state](https://holmrenser.github.io/react-bio-viz/concepts/controllable-state/).

### Jupyter widgets (first PyPI release)

The same components as [anywidget](https://anywidget.dev) widgets, where each piece of interactive state is a synced traitlet, so Python can both drive and observe it. Also included: FASTA/Newick helpers and a tour notebook. See [Python & Jupyter](https://holmrenser.github.io/react-bio-viz/python/).

### Also

- Works with React 18 and 19.
- No stylesheet to import: styles are injected on import and never restyle the host page, and your theme tokens take precedence. `react-bio-viz/style.css` is also shipped for server-rendered pages, strict CSPs and shadow roots.
- Safe to import and render in server-rendered apps.
- One self-contained package: the shared `@react-bio-viz/core` building blocks are bundled in, with complete type declarations.
- npm and PyPI releases are published from CI with provenance.

**Full changelog:** https://github.com/holmrenser/react-bio-viz/compare/v0.0.7...v0.1.0
