"""Shared plumbing for every react-bio-viz widget."""

from __future__ import annotations

import pathlib
from typing import Any, Callable, Mapping

import anywidget
import traitlets

_STATIC = pathlib.Path(__file__).parent / "static"

#: One bundle serves every widget, dispatching on the ``_component`` trait, so React ships once.
_ESM = _STATIC / "widget.js"
_CSS = _STATIC / "widget.css"


def fit_to_extent(extent: Mapping[str, float]) -> dict[str, float]:
    """A viewport showing the full extent, i.e. fully zoomed out — ``fitToExtent`` in the JS core."""
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

    Every piece of interactive state is a synced trait, observable and writable from the kernel::

        widget = MSA(msa=records)
        widget.observe(lambda change: print(change["new"]), names="viewport")
        widget.viewport = {...}   # drives the view from the kernel
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

    def _on_event(self, event: str, callback: Callable[..., None], *fields: str) -> None:
        """Calls ``callback`` with ``fields`` of every ``event`` message the component sends.

        One-off user actions (a rename, a click) arrive as custom messages, not traits: a trait would
        drop the second of two identical events.
        """

        def handler(_widget: Any, content: Mapping[str, Any], _buffers: Any) -> None:
            if isinstance(content, Mapping) and content.get("event") == event:
                callback(*(content.get(field) for field in fields))

        self.on_msg(handler)
