"""Shared plumbing for every react-bio-viz widget."""

from __future__ import annotations

import pathlib
from typing import Any, Mapping

import anywidget
import traitlets

_STATIC = pathlib.Path(__file__).parent / "static"

#: One bundle serves every widget, dispatching on the ``_component`` trait, so React ships once in
#: the wheel rather than once per widget.
_ESM = _STATIC / "widget.js"
_CSS = _STATIC / "widget.css"


def fit_to_extent(extent: Mapping[str, float]) -> dict[str, float]:
    """A viewport showing the full extent, i.e. fully zoomed out.

    Mirrors ``fitToExtent`` in ``@react-bio-viz/core``; the ``Viewport`` shape is deliberately
    plain JSON so it survives the Jupyter comm channel unchanged.
    """
    return {
        "x0": extent["xMin"],
        "x1": extent["xMax"],
        "y0": extent["yMin"],
        "y1": extent["yMax"],
        "xMin": extent["xMin"],
        "xMax": extent["xMax"],
        "yMin": extent["yMin"],
        "yMax": extent["yMax"],
    }


class BioVizWidget(anywidget.AnyWidget):
    """Base class for the react-bio-viz Jupyter widgets.

    Every interactive piece of state is an ordinary synced trait, so the Python side uses
    traitlets' own idiom rather than a bespoke callback API::

        widget = MSA(msa=records)
        widget.observe(lambda change: print(change["new"]), names="viewport")
        widget.viewport = {...}   # drives the view from the kernel

    On the JavaScript side each of those traits is wrapped as a ``StoreController`` — the same seam
    a consumer's Zustand store plugs into — so no component contains any Jupyter-specific code.
    """

    _esm = _ESM
    _css = _CSS

    #: Selects which React component the shared bundle renders.
    _component = traitlets.Unicode("").tag(sync=True)

    #: The visible window, as a plain ``Viewport`` dict. Seeded on construction so it is readable
    #: and observable before the user has interacted with the widget.
    viewport = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        if self.viewport is None:
            extent = self._default_extent()
            if extent is not None:
                self.viewport = fit_to_extent(extent)

    def _default_extent(self) -> dict[str, float] | None:
        """The data extent this widget's viewport spans, or ``None`` if it has no viewport."""
        return None
