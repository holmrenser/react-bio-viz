"""Pairwise distance matrix widget."""

from __future__ import annotations

import traitlets

from ._base import BioVizWidget


class DistanceMatrix(BioVizWidget):
    """A pairwise distance matrix as a heatmap, windowed so it scales to thousands of rows.

    :param labels: Row/column ids, in ``matrix`` order.
    :param matrix: Symmetric ``len(labels)`` × ``len(labels)`` list of lists.
    :param label_names: Optional ``{id: display name}``.
    :param options: ``{"showNumbers": bool, "colorScheme": "warm" | "cool" | "green" | "grayscale"}``.
    :param row_order: Display order of rows (and columns), as ids; written back when labels are
        dragged. Same shape as :class:`MSA`'s, so the two can be linked.

    >>> w = DistanceMatrix(labels=["a", "b"], matrix=[[0, 0.1], [0.1, 0]])
    >>> w.observe(print, names="row_order")
    """

    _component = traitlets.Unicode("distancematrix").tag(sync=True)

    labels = traitlets.List(traitlets.Unicode(), default_value=[]).tag(sync=True)
    matrix = traitlets.List(traitlets.List(traitlets.Float()), default_value=[]).tag(sync=True)
    label_names = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)
    width = traitlets.Int(650).tag(sync=True)
    height = traitlets.Int(500).tag(sync=True)
    options = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)

    row_order = traitlets.List(traitlets.Unicode(), default_value=[]).tag(sync=True)
    panel_sizes = traitlets.Dict(default_value={"labelWidth": 160}).tag(sync=True)

    def _default_extent(self) -> dict[str, float] | None:
        if not self.labels:
            return None
        n = len(self.labels)
        return {"xMin": 0, "xMax": n, "yMin": 0, "yMax": n}
