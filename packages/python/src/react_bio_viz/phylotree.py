"""Phylogenetic tree widget."""

from __future__ import annotations

from typing import Any

import traitlets

from ._base import BioVizWidget


class PhyloTree(BioVizWidget):
    """A phylogenetic tree in rectangular, cladogram or radial layout.

    :param tree: Recursively nested ``{"name": ..., "length": ..., "children": [...]}``.
    :param selection: Which node the tree is rerooted at and which subtrees are collapsed —
        ``{"rerootedAt": str | None, "collapsed": [str], "order": {...}}``. Writable from the
        kernel and written back when the user collapses a clade or drags a leaf.

    >>> w = PhyloTree(tree=newick_dict, interactive=True)
    >>> w.observe(lambda c: print(c["new"]["collapsed"]), names="selection")
    """

    _component = traitlets.Unicode("phylotree").tag(sync=True)

    tree = traitlets.Dict(default_value={}).tag(sync=True)
    width = traitlets.Int(1000).tag(sync=True)
    height = traitlets.Int(900).tag(sync=True)
    layout = traitlets.Enum(
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

    selection = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        if self.selection is None:
            self.selection = {"collapsed": []}

    def _default_extent(self) -> dict[str, float] | None:
        # The tree's pan/zoom is over the rendered pixel surface, not over data coordinates.
        return {"xMin": 0, "xMax": self.width, "yMin": 0, "yMax": self.height}
