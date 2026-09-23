"""BLAST hit distribution widget."""

from __future__ import annotations

from typing import Any

import traitlets

from ._base import BioVizWidget


class BlastHitDistribution(BioVizWidget):
    """BLAST hits along one query sequence, row-stacked and colored by a chosen metric.

    :param hits: ``[{"id", "queryId", "subjectId", "queryStart", "queryEnd", "evalue",
        "bitScore", "percentIdentity"}, ...]``.
    :param selection: ``{"selectedHitIds": [...]}``. Clicking a hit toggles it, which writes the
        trait back — this is the widget that shows the controllable-state seam generalizing beyond
        pan/zoom to arbitrary UI state.

    >>> w = BlastHitDistribution(hits=hits, query_length=2000)
    >>> w.observe(lambda c: print(c["new"]["selectedHitIds"]), names="selection")
    """

    _component = traitlets.Unicode("blasthitdistribution").tag(sync=True)

    hits = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True)
    query_length = traitlets.Int(0).tag(sync=True)
    query_name = traitlets.Unicode("").tag(sync=True)
    width = traitlets.Int(800).tag(sync=True)
    show_scale = traitlets.Bool(True).tag(sync=True)
    metric = traitlets.Enum(
        ["evalue", "bitScore", "percentIdentity"], allow_none=True, default_value=None
    ).tag(sync=True)

    selection = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        if self.selection is None:
            self.selection = {"selectedHitIds": []}

    def _default_extent(self) -> dict[str, float] | None:
        if not self.query_length:
            return None
        return {"xMin": 0, "xMax": self.query_length, "yMin": 0, "yMax": 1}
