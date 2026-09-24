"""Multiple sequence alignment widget."""

from __future__ import annotations

from typing import Any, Callable

import traitlets

from ._base import BioVizWidget


class MSA(BioVizWidget):
    """A multiple sequence alignment, with pan/zoom, a column ruler, a minimap and a consensus row.

    :param msa: The alignment, as ``[{"header": ..., "sequence": ...}, ...]``.
    :param options: Rendering toggles, mirroring ``MSADrawOptions`` (camelCase keys, e.g.
        ``{"colorStyle": "AA Zappo", "tracks": ["conservation", "logo"]}``). Omitting
        ``colorStyle`` lets the component pick a scheme from the alignment's own alphabet.
    :param selection: Selected rows (by id — a record's ``id``, else its ``header``) and columns,
        ``{"rows": [...], "columns": [...]}``; written back as the user selects.
    :param row_order: Display order of the rows, as ids; written back when labels are dragged.
    :param panel_sizes: ``{"labelWidth", "trackHeight", "minimapHeight"}`` in pixels.

    The widget never edits ``msa`` itself: register :meth:`on_rename_row`,
    :meth:`on_remove_rows` or :meth:`on_remove_columns` to apply edits (which also enables them).

    >>> w = MSA(msa=[{"header": "a", "sequence": "ACGT"}])
    >>> w.observe(print, names="viewport")   # fires when the user pans or zooms
    >>> w.observe(print, names="selection")
    """

    _component = traitlets.Unicode("msa").tag(sync=True)

    msa = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True)
    width = traitlets.Int(650).tag(sync=True)
    height = traitlets.Int(400).tag(sync=True)
    options = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)

    selection = traitlets.Dict(default_value={"rows": [], "columns": []}).tag(sync=True)
    row_order = traitlets.List(traitlets.Unicode(), default_value=[]).tag(sync=True)
    panel_sizes = traitlets.Dict(
        default_value={"labelWidth": 150, "trackHeight": 48, "minimapHeight": 50}
    ).tag(sync=True)

    def on_rename_row(self, callback: Callable[[str, str], Any]) -> None:
        """Calls ``callback(row_id, new_name)`` when the user renames a row label."""
        self._on_event("rename_row", callback, "row_id", "name")

    def on_remove_rows(self, callback: Callable[[list[str]], Any]) -> None:
        """Calls ``callback(row_ids)`` when the user removes rows (× on a label, or Delete)."""
        self._on_event("remove_rows", callback, "row_ids")

    def on_remove_columns(self, callback: Callable[[list[int]], Any]) -> None:
        """Calls ``callback(columns)`` when the user deletes selected columns."""
        self._on_event("remove_columns", callback, "columns")

    def _default_extent(self) -> dict[str, float] | None:
        if not self.msa:
            return None
        columns = len(self.msa[0].get("sequence", ""))
        return {"xMin": 0, "xMax": columns, "yMin": 0, "yMax": len(self.msa)}
