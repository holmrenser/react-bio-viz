"""Multiple sequence alignment widget."""

from __future__ import annotations

import traitlets

from ._base import BioVizWidget


class MSA(BioVizWidget):
    """A multiple sequence alignment, with pan/zoom, a column ruler, a minimap and a consensus row.

    :param msa: The alignment, as ``[{"header": ..., "sequence": ...}, ...]``.
    :param options: Rendering toggles, mirroring ``MSADrawOptions`` (camelCase keys, e.g.
        ``{"colorStyle": "AA Zappo", "showMinimap": False}``). Omitting ``colorStyle`` lets the
        component pick a scheme from the alignment's own alphabet.

    >>> w = MSA(msa=[{"header": "a", "sequence": "ACGT"}])
    >>> w.observe(print, names="viewport")   # fires when the user pans or zooms
    """

    _component = traitlets.Unicode("msa").tag(sync=True)

    msa = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True)
    width = traitlets.Int(650).tag(sync=True)
    height = traitlets.Int(400).tag(sync=True)
    options = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)

    def _default_extent(self) -> dict[str, float] | None:
        if not self.msa:
            return None
        columns = len(self.msa[0].get("sequence", ""))
        return {"xMin": 0, "xMax": columns, "yMin": 0, "yMax": len(self.msa)}
