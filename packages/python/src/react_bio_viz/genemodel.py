"""Gene model widget."""

from __future__ import annotations

import traitlets

from ._base import BioVizWidget

#: Fraction of the gene's length padded onto each side of the default view, mirroring the
#: component's own ``VIEWPORT_PADDING_RATIO``.
_PADDING_RATIO = 0.1


class GeneModel(BioVizWidget):
    """A (potentially spliced) gene model: transcripts with their exons and CDSs.

    :param gene: A gff3-shaped ``SequenceInterval`` dict, with nested ``children``.

    >>> w = GeneModel(gene=gff3_record)
    >>> w.viewport = {**w.viewport, "x0": 35_040_000, "x1": 35_042_000}   # zoom from the kernel
    """

    _component = traitlets.Unicode("genemodel").tag(sync=True)

    gene = traitlets.Dict(default_value={}).tag(sync=True)
    width = traitlets.Int(500).tag(sync=True)
    color_seed = traitlets.Unicode("42").tag(sync=True)
    show_scale = traitlets.Bool(True).tag(sync=True)

    def _default_extent(self) -> dict[str, float] | None:
        start, end = self.gene.get("start"), self.gene.get("end")
        if start is None or end is None:
            return None
        padding = round(_PADDING_RATIO * (end - start))
        return {"xMin": max(0, start - padding), "xMax": end + padding, "yMin": 0, "yMax": 1}
