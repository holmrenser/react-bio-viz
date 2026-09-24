"""Tests for the react-bio-viz Jupyter widgets.

These exercise the Python half of the bridge: that every widget declares the traits the JavaScript
entry point reads, that viewports are seeded to a usable value, and that traits behave as the
two-way channel the design depends on. The React rendering itself is covered by the Vitest suites
in ``packages/components``.
"""

from __future__ import annotations

import json
import pathlib

import pytest

from react_bio_viz import (
    MSA,
    BioVizWidget,
    BlastHitDistribution,
    DistanceMatrix,
    GeneModel,
    GenomeBrowser,
    PhyloTree,
    fit_to_extent,
)

MSA_DATA = [
    {"header": "seq1", "sequence": "ACGTACGT"},
    {"header": "seq2", "sequence": "ACGTACGA"},
    {"header": "seq3", "sequence": "ACGT--GA"},
]

TREE_DATA = {
    "name": "root",
    "length": 0,
    "children": [
        {"name": "A", "length": 1.0, "children": []},
        {"name": "B", "length": 2.0, "children": []},
    ],
}

GENE_DATA = {
    "ID": "gene1",
    "seqid": "chr1",
    "source": "test",
    "interval_type": "gene",
    "start": 1000,
    "end": 2000,
    "score": ".",
    "strand": "+",
    "phase": ".",
    "attributes": {},
    "children": [],
}

HITS = [
    {
        "id": "h1",
        "queryId": "q1",
        "subjectId": "s1",
        "queryStart": 10,
        "queryEnd": 200,
        "evalue": 1e-30,
        "bitScore": 300.0,
        "percentIdentity": 99.0,
    }
]

ALL_WIDGETS = [
    (MSA, {"msa": MSA_DATA}),
    (PhyloTree, {"tree": TREE_DATA}),
    (GeneModel, {"gene": GENE_DATA}),
    (GenomeBrowser, {"tracks": [], "reference_length": 5000}),
    (BlastHitDistribution, {"hits": HITS, "query_length": 2000}),
    (DistanceMatrix, {"labels": ["a", "b"], "matrix": [[0, 0.1], [0.1, 0]]}),
]


# ---------------------------------------------------------------------------
# fit_to_extent — mirrors the core primitive the components use
# ---------------------------------------------------------------------------


def test_fit_to_extent_spans_the_whole_extent():
    extent = {"xMin": 0, "xMax": 100, "yMin": 0, "yMax": 10}
    assert fit_to_extent(extent) == {
        "x0": 0,
        "x1": 100,
        "y0": 0,
        "y1": 10,
        "xMin": 0,
        "xMax": 100,
        "yMin": 0,
        "yMax": 10,
    }


def test_fit_to_extent_is_json_serializable():
    """The viewport crosses the comm channel as JSON, so it must contain only plain numbers."""
    value = fit_to_extent({"xMin": 0, "xMax": 5, "yMin": 0, "yMax": 5})
    assert json.loads(json.dumps(value)) == value


# ---------------------------------------------------------------------------
# Construction and the shared contract
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("cls,kwargs", ALL_WIDGETS, ids=lambda v: getattr(v, "__name__", ""))
def test_widget_constructs_and_names_its_component(cls, kwargs):
    widget = cls(**kwargs)
    assert isinstance(widget, BioVizWidget)
    assert widget._component, f"{cls.__name__} must identify itself to the JS bundle"


@pytest.mark.parametrize("cls,kwargs", ALL_WIDGETS, ids=lambda v: getattr(v, "__name__", ""))
def test_every_widget_seeds_a_usable_viewport(cls, kwargs):
    """A ``None`` viewport would reach the component as a null store snapshot and crash it."""
    viewport = cls(**kwargs).viewport
    assert viewport is not None
    assert set(viewport) == {"x0", "x1", "y0", "y1", "xMin", "xMax", "yMin", "yMax"}
    assert viewport["x1"] > viewport["x0"]
    assert viewport["y1"] > viewport["y0"]


@pytest.mark.parametrize("cls,kwargs", ALL_WIDGETS, ids=lambda v: getattr(v, "__name__", ""))
def test_explicit_viewport_is_not_overwritten(cls, kwargs):
    given = fit_to_extent({"xMin": 1, "xMax": 2, "yMin": 3, "yMax": 4})
    assert cls(**kwargs, viewport=given).viewport == given


@pytest.mark.parametrize("cls,kwargs", ALL_WIDGETS, ids=lambda v: getattr(v, "__name__", ""))
def test_viewport_changes_are_observable(cls, kwargs):
    """`.observe` is the whole point of the bridge: browser interaction lands here."""
    widget = cls(**kwargs)
    seen = []
    widget.observe(lambda change: seen.append(change["new"]), names="viewport")

    moved = {**widget.viewport, "x0": widget.viewport["x0"] + 1}
    widget.viewport = moved
    assert seen == [moved]


@pytest.mark.parametrize("cls,kwargs", ALL_WIDGETS, ids=lambda v: getattr(v, "__name__", ""))
def test_synced_traits_are_tagged_for_the_comm_channel(cls, kwargs):
    """A trait that is not tagged ``sync=True`` silently never reaches the browser."""
    widget = cls(**kwargs)
    for name in ("_component", "viewport"):
        assert widget.trait_metadata(name, "sync") is True


# ---------------------------------------------------------------------------
# Per-widget extents
# ---------------------------------------------------------------------------


def test_msa_extent_covers_columns_and_rows():
    viewport = MSA(msa=MSA_DATA).viewport
    assert viewport["xMax"] == 8
    assert viewport["yMax"] == 3


def test_msa_without_data_has_no_viewport():
    """Nothing sensible to show yet; the component falls back to being uncontrolled."""
    assert MSA().viewport is None


def test_phylotree_extent_follows_the_pixel_surface():
    viewport = PhyloTree(tree=TREE_DATA, width=800, height=600).viewport
    assert (viewport["xMax"], viewport["yMax"]) == (800, 600)


def test_genemodel_extent_pads_the_gene():
    viewport = GeneModel(gene=GENE_DATA).viewport
    # 10% of the 1000bp gene on each side, matching the component's own default.
    assert viewport["xMin"] == 900
    assert viewport["xMax"] == 2100


def test_genemodel_extent_is_clamped_at_the_sequence_start():
    """A gene near position 0 would otherwise be padded to a negative coordinate."""
    gene = {**GENE_DATA, "start": 5, "end": 1000}
    assert GeneModel(gene=gene).viewport["xMin"] == 0


def test_genemodel_without_coordinates_has_no_viewport():
    assert GeneModel().viewport is None


def test_genomebrowser_extent_is_the_reference_length():
    assert GenomeBrowser(tracks=[], reference_length=5000).viewport["xMax"] == 5000


def test_blast_extent_is_the_query_length():
    assert BlastHitDistribution(hits=HITS, query_length=2000).viewport["xMax"] == 2000


# ---------------------------------------------------------------------------
# Selection: the second controllable state, on the two widgets that have one
# ---------------------------------------------------------------------------


def test_phylotree_seeds_an_empty_selection():
    assert PhyloTree(tree=TREE_DATA).selection == {"collapsed": []}


def test_blast_seeds_an_empty_selection():
    assert BlastHitDistribution(hits=HITS, query_length=2000).selection == {"selectedHitIds": []}


@pytest.mark.parametrize(
    "cls,kwargs,value",
    [
        (PhyloTree, {"tree": TREE_DATA}, {"collapsed": ["n1"]}),
        (BlastHitDistribution, {"hits": HITS, "query_length": 2000}, {"selectedHitIds": ["h1"]}),
    ],
    ids=["phylotree", "blast"],
)
def test_selection_is_observable(cls, kwargs, value):
    widget = cls(**kwargs)
    seen = []
    widget.observe(lambda change: seen.append(change["new"]), names="selection")
    widget.selection = value
    assert seen == [value]


def test_explicit_selection_is_not_overwritten():
    given = {"collapsed": ["n2"], "rerootedAt": "n5"}
    assert PhyloTree(tree=TREE_DATA, selection=given).selection == given


# ---------------------------------------------------------------------------
# MSA and DistanceMatrix: selection, row order and panel sizes
# ---------------------------------------------------------------------------


def test_msa_seeds_its_other_controllable_state():
    widget = MSA(msa=MSA_DATA)
    assert widget.selection == {"rows": [], "columns": []}
    assert widget.row_order == []
    assert set(widget.panel_sizes) == {"labelWidth", "trackHeight", "minimapHeight"}


@pytest.mark.parametrize("trait", ["selection", "row_order", "panel_sizes"])
def test_msa_state_traits_are_synced(trait):
    assert MSA(msa=MSA_DATA).trait_metadata(trait, "sync") is True


def test_row_order_is_observable_and_shared_in_shape():
    """MSA and DistanceMatrix use the same row-order shape, so one can drive the other."""
    msa = MSA(msa=MSA_DATA)
    matrix = DistanceMatrix(labels=["seq1", "seq2", "seq3"], matrix=[[0, 1, 2], [1, 0, 1], [2, 1, 0]])
    msa.observe(lambda change: setattr(matrix, "row_order", change["new"]), names="row_order")
    msa.row_order = ["seq3", "seq1", "seq2"]
    assert matrix.row_order == ["seq3", "seq1", "seq2"]


def test_distance_matrix_extent_is_square():
    viewport = DistanceMatrix(labels=["a", "b", "c"], matrix=[[0] * 3] * 3).viewport
    assert (viewport["xMax"], viewport["yMax"]) == (3, 3)


# ---------------------------------------------------------------------------
# Events: user actions that are not state arrive as custom messages
# ---------------------------------------------------------------------------


def _send_from_browser(widget, content):
    """What anywidget does when the component calls ``model.send(content)``."""
    widget._handle_custom_msg(content, [])


def test_msa_edit_events_reach_their_callbacks():
    widget = MSA(msa=MSA_DATA)
    renames, row_removals, column_removals = [], [], []
    widget.on_rename_row(lambda row_id, name: renames.append((row_id, name)))
    widget.on_remove_rows(row_removals.append)
    widget.on_remove_columns(column_removals.append)

    _send_from_browser(widget, {"event": "rename_row", "row_id": "seq1", "name": "first"})
    _send_from_browser(widget, {"event": "remove_rows", "row_ids": ["seq2"]})
    _send_from_browser(widget, {"event": "remove_columns", "columns": [0, 3]})

    assert renames == [("seq1", "first")]
    assert row_removals == [["seq2"]]
    assert column_removals == [[0, 3]]


def test_events_only_reach_the_matching_callback():
    widget = MSA(msa=MSA_DATA)
    renames = []
    widget.on_rename_row(lambda row_id, name: renames.append(row_id))
    _send_from_browser(widget, {"event": "remove_rows", "row_ids": ["seq2"]})
    _send_from_browser(widget, "not a dict")
    assert renames == []


def test_phylotree_click_events_reach_their_callbacks():
    widget = PhyloTree(tree=TREE_DATA, interactive=True)
    nodes, branches = [], []
    widget.on_node_click(nodes.append)
    widget.on_branch_click(branches.append)
    _send_from_browser(widget, {"event": "node_click", "node": {"id": "0.0", "leafNames": ["A"]}})
    _send_from_browser(widget, {"event": "branch_click", "node": {"id": "0.1"}})
    assert nodes == [{"id": "0.0", "leafNames": ["A"]}]
    assert branches == [{"id": "0.1"}]


def test_phylotree_display_traits_are_synced():
    widget = PhyloTree(tree=TREE_DATA)
    for name in (
        "show_branch_lengths",
        "support_threshold",
        "drag_enabled",
        "branch_width",
        "node_radius",
        "label_font_size",
        "leaf_spacing",
        "leaf_marker_color",
        "node_styles",
        "branch_styles",
        "active_node_id",
        "leaf_order",
    ):
        assert widget.trait_metadata(name, "sync") is True, name


def test_js_bridge_binds_every_store_trait_by_its_camel_cased_name():
    """A store trait like ``row_order`` must bind to ``rowOrderStore``, not ``row_orderStore``."""
    source = (pathlib.Path(__file__).parents[1] / "js" / "widget.tsx").read_text()
    assert "props[`${toPropName(trait)}Store`]" in source


# ---------------------------------------------------------------------------
# Trait validation
# ---------------------------------------------------------------------------


def test_phylotree_rejects_an_unknown_layout():
    with pytest.raises(Exception):
        PhyloTree(tree=TREE_DATA, layout="spiral")


def test_blast_rejects_an_unknown_metric():
    with pytest.raises(Exception):
        BlastHitDistribution(hits=HITS, query_length=2000, metric="pValue")


@pytest.mark.parametrize("layout", ["rectangular", "cladogram", "radial"])
def test_phylotree_accepts_every_implemented_layout(layout):
    assert PhyloTree(tree=TREE_DATA, layout=layout).layout == layout


# ---------------------------------------------------------------------------
# The shipped bundle
# ---------------------------------------------------------------------------


def _static_dir() -> pathlib.Path:
    import react_bio_viz

    return pathlib.Path(react_bio_viz.__file__).parent / "static"


def test_bundle_is_present():
    for name in ("widget.js", "widget.css"):
        assert (_static_dir() / name).is_file(), f"missing {name}; run the JS build first"


def test_bundle_is_self_contained():
    """anywidget loads the bundle as a bare ES module: unresolved imports would 404 in the page."""
    source = (_static_dir() / "widget.js").read_text()
    assert 'from"react"' not in source
    assert 'from"react-dom' not in source
    assert "process.env" not in source


def test_every_widget_shares_one_bundle():
    """The whole point of dispatching on ``_component``: React ships once, not five times.

    anywidget resolves a ``Path`` ``_esm`` to the file's contents, so comparing the loaded source
    across widgets is what actually proves they share an artifact.
    """
    sources = {cls(**kwargs)._esm for cls, kwargs in ALL_WIDGETS}
    assert len(sources) == 1
    (source,) = sources
    assert "export" in source

    styles = {cls(**kwargs)._css for cls, kwargs in ALL_WIDGETS}
    assert len(styles) == 1


def test_each_widget_selects_a_distinct_component():
    names = [cls(**kwargs)._component for cls, kwargs in ALL_WIDGETS]
    assert sorted(names) == sorted(set(names))
    assert set(names) == {
        "msa",
        "phylotree",
        "distancematrix",
        "genemodel",
        "genomebrowser",
        "blasthitdistribution",
    }
