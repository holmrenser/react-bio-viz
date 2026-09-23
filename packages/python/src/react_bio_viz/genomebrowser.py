"""Multi-track genome browser widget."""

from __future__ import annotations

import traitlets

from ._base import BioVizWidget


class GenomeBrowser(BioVizWidget):
    """Stacked genome tracks sharing one genomic-coordinate viewport.

    :param tracks: ``[{"id", "label", "kind", "data"}, ...]`` where ``kind`` is one of
        ``"feature"``, ``"coverage"`` or ``"genemodel"``.
    :param reference_length: Length of the reference sequence; the x-axis extent.

    >>> w = GenomeBrowser(tracks=tracks, reference_length=35_045_433)
    """

    _component = traitlets.Unicode("genomebrowser").tag(sync=True)

    tracks = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True)
    reference_length = traitlets.Int(0).tag(sync=True)
    reference_name = traitlets.Unicode("").tag(sync=True)
    width = traitlets.Int(1000).tag(sync=True)
    show_scale = traitlets.Bool(True).tag(sync=True)

    def _default_extent(self) -> dict[str, float] | None:
        if not self.reference_length:
            return None
        return {"xMin": 0, "xMax": self.reference_length, "yMin": 0, "yMax": 1}
