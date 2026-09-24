"""Phylogenetic tree widget."""

from __future__ import annotations

from typing import Any, Callable

import traitlets

from ._base import BioVizWidget


class PhyloTree(BioVizWidget):
    """A phylogenetic tree in rectangular, cladogram or radial layout.

    :param tree: Recursively nested ``{"name": ..., "length": ..., "children": [...]}``.
    :param selection: Where the tree is rooted and how it is arranged —
        ``{"rerootedAt": str | None, "rerootPosition": float, "collapsed": [str], "order": {...}}``.
        Writable from the kernel and written back when the user collapses, drags or reroots.
    :param node_styles: ``{node_id: {"color": ..., "bold": ...}}``.
    :param branch_styles: ``{node_id: {"color": ...}}`` for the branch above each node.
    :param leaf_order: Read-only: leaf names in display order, updated as the user rearranges.

    >>> w = PhyloTree(tree=newick_dict, tree_layout="radial", interactive=True)
    >>> w.observe(lambda c: print(c["new"]["collapsed"]), names="selection")
    >>> w.on_node_click(lambda node: print(node["id"], node["leafNames"]))
    """

    _component = traitlets.Unicode("phylotree").tag(sync=True)

    tree = traitlets.Dict(default_value={}).tag(sync=True)
    width = traitlets.Int(1000).tag(sync=True)
    height = traitlets.Int(900).tag(sync=True)
    #: ``"rectangular"``, ``"cladogram"`` or ``"radial"``. Not called ``layout``: every ipywidgets
    #: widget already has a ``layout`` trait (its CSS layout), and shadowing it breaks the view.
    tree_layout = traitlets.Enum(
        ["rectangular", "cladogram", "radial"], default_value="rectangular"
    ).tag(sync=True)
    show_support_values = traitlets.Bool(True).tag(sync=True)
    shade_branch_by_support = traitlets.Bool(True).tag(sync=True)
    font_size = traitlets.Int(10).tag(sync=True)
    align_tips = traitlets.Bool(True).tag(sync=True)
    interactive = traitlets.Bool(False).tag(sync=True)
    search_query = traitlets.Unicode(allow_none=True, default_value=None).tag(sync=True)
    search_use_regex = traitlets.Bool(False).tag(sync=True)
    show_scale_bar = traitlets.Bool(True).tag(sync=True)
    show_branch_lengths = traitlets.Bool(False).tag(sync=True)
    support_threshold = traitlets.Float(0).tag(sync=True)
    drag_enabled = traitlets.Bool(allow_none=True, default_value=None).tag(sync=True)
    branch_width = traitlets.Float(0.75).tag(sync=True)
    node_radius = traitlets.Float(4).tag(sync=True)
    label_font_size = traitlets.Float(11).tag(sync=True)
    leaf_spacing = traitlets.Float(allow_none=True, default_value=None).tag(sync=True)
    leaf_marker_color = traitlets.Unicode(allow_none=True, default_value=None).tag(sync=True)
    node_styles = traitlets.Dict(default_value={}).tag(sync=True)
    branch_styles = traitlets.Dict(default_value={}).tag(sync=True)
    active_node_id = traitlets.Unicode(allow_none=True, default_value=None).tag(sync=True)
    leaf_order = traitlets.List(traitlets.Unicode(), default_value=[]).tag(sync=True)

    selection = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)

    def __init__(self, **kwargs: Any) -> None:
        # Accept the React prop's name as a convenience; a string can only mean the tree layout
        # (ipywidgets' own `layout` takes a Layout widget or a dict).
        if isinstance(kwargs.get("layout"), str):
            kwargs["tree_layout"] = kwargs.pop("layout")
        super().__init__(**kwargs)
        if self.selection is None:
            self.selection = {"collapsed": []}

    def on_node_click(self, callback: Callable[[dict[str, Any]], Any]) -> None:
        """Calls ``callback(node)`` when a node marker is clicked (see ``TreeNodeInfo``)."""
        self._on_event("node_click", callback, "node")

    def on_branch_click(self, callback: Callable[[dict[str, Any]], Any]) -> None:
        """Calls ``callback(node)`` — the node below the branch — when a branch is clicked."""
        self._on_event("branch_click", callback, "node")

    def _default_extent(self) -> dict[str, float] | None:
        # The tree's pan/zoom is over the rendered pixel surface, not over data coordinates.
        return {"xMin": 0, "xMax": self.width, "yMin": 0, "yMax": self.height}
