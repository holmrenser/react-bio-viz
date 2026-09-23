# react-bio-viz

Jupyter widgets for biological data visualization: multiple sequence alignments, phylogenetic
trees, gene models, genome browser tracks, and BLAST hit distributions.

These are [anywidget](https://anywidget.dev) bindings around the `react-bio-viz` React components,
so the same visualizations run in a notebook and in a web app.

## Install

```bash
pip install react-bio-viz
```

## Use

```python
from react_bio_viz import MSA

widget = MSA(msa=[
    {"header": "seq1", "sequence": "MKTAYIAKQRQISFVK"},
    {"header": "seq2", "sequence": "MKTAYIAKQRQISFVR"},
])
widget
```

Every piece of interactive state is an ordinary synced traitlet, so the kernel can both **drive**
and **observe** it — no bespoke callback API, just traitlets' own idiom:

```python
# Observe: fires whenever the user pans, zooms, or selects in the browser.
widget.observe(lambda change: print(change["new"]), names="viewport")

# Drive: writing the trait moves the view.
widget.viewport = {**widget.viewport, "x0": 0, "x1": 50}
```

### Widgets

| Class | Data prop | Interactive traits |
| --- | --- | --- |
| `MSA` | `msa` | `viewport` |
| `PhyloTree` | `tree` | `viewport`, `selection` |
| `GeneModel` | `gene` | `viewport` |
| `GenomeBrowser` | `tracks`, `reference_length` | `viewport` |
| `BlastHitDistribution` | `hits`, `query_length` | `viewport`, `selection` |

`viewport` is a plain dict — `{"x0", "x1", "y0", "y1", "xMin", "xMax", "yMin", "yMax"}` — seeded on
construction to show the whole dataset, so it is readable and observable before any interaction.

`selection` is `{"rerootedAt", "collapsed", "order"}` for `PhyloTree` and `{"selectedHitIds"}` for
`BlastHitDistribution`.

```python
from react_bio_viz import BlastHitDistribution

hits = BlastHitDistribution(hits=blast_rows, query_length=2000)
hits.observe(lambda c: print("selected:", c["new"]["selectedHitIds"]), names="selection")
hits
```

### Naming

Traits are `snake_case` (idiomatic Python) and map to the React components' `camelCase` props;
values that are themselves data — viewport keys, `selection` keys, `options` keys — keep their
`camelCase` spelling, since they cross the wire as JSON and are documented by the JavaScript API.

## How it works

An anywidget model is structurally already a `StoreController`, the external-store seam the React
components use for controlled state (`model.get` / `model.set` + `save_changes` / `on("change:…")`
↔ `getValue` / `setValue` / `subscribe`). So the Jupyter integration is one adapter,
`createAnywidgetStoreController`, and **no component contains any Jupyter-specific code** — a
notebook is just another external-store consumer, the same kind of thing as a web app's Zustand
store.

All five widgets share a single bundled ES module, dispatching on an internal `_component` trait,
so React ships once in the wheel rather than once per widget.

## Development

```bash
pnpm --filter @react-bio-viz/python-widgets build   # bundle the widget JavaScript
uv pip install -e ".[dev]"
pytest
```

The wheel needs `src/react_bio_viz/static/widget.js`; the hatchling build hook builds it with
Node if it is missing, and skips when it is already there (so installing from an sdist or wheel
needs no Node toolchain).

## License

MIT
