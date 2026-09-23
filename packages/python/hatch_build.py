"""Bundles the widget JavaScript before hatchling packages the wheel or sdist.

anywidget loads ``_esm`` as a standalone ES module in the notebook page, so the bundle has to be
built and shipped inside the distribution — there is no bundler on the other side. This hook runs
``node build.mjs`` when the artifact is missing, and stays out of the way when it is already
there (an sdist install, or a checkout where ``pnpm --filter @react-bio-viz/python-widgets build``
has run), so packaging never hard-requires a Node toolchain.
"""

from __future__ import annotations

import pathlib
import shutil
import subprocess
import sys
from typing import Any

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

_ARTIFACTS = ("widget.js", "widget.css")


class WidgetBuildHook(BuildHookInterface):
    PLUGIN_NAME = "custom"

    def initialize(self, version: str, build_data: dict[str, Any]) -> None:
        root = pathlib.Path(self.root)
        static = root / "src" / "react_bio_viz" / "static"

        if all((static / name).is_file() for name in _ARTIFACTS):
            return

        node = shutil.which("node")
        if node is None:
            raise RuntimeError(
                "The widget bundle is missing and Node.js was not found on PATH.\n"
                "Build it first with `pnpm --filter @react-bio-viz/python-widgets build`, "
                "or install from an sdist/wheel, which ships it prebuilt."
            )

        print("react-bio-viz: bundling widget JavaScript...", file=sys.stderr)
        subprocess.run([node, "build.mjs"], cwd=root, check=True)

        missing = [name for name in _ARTIFACTS if not (static / name).is_file()]
        if missing:
            raise RuntimeError(f"widget bundle did not produce: {', '.join(missing)}")
