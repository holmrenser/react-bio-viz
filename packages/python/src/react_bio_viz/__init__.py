"""Jupyter widgets for biological data visualization.

Thin `anywidget <https://anywidget.dev>`_ bindings around the ``react-bio-viz`` React components.
Every piece of interactive state is a synced traitlet, so the kernel can both drive and observe it::

    from react_bio_viz import MSA

    widget = MSA(msa=[{"header": "seq1", "sequence": "ACGT"}])
    widget.observe(lambda change: print(change["new"]), names="viewport")
    widget                      # renders in the notebook
    widget.viewport = {...}     # drives the view from Python

Each trait is bridged to the component as a ``StoreController``, the same external-store seam a
JavaScript app fills with a Zustand store — the components themselves contain no Jupyter-specific
code.
"""

from ._base import BioVizWidget, fit_to_extent
from .blasthitdistribution import BlastHitDistribution
from .genemodel import GeneModel
from .genomebrowser import GenomeBrowser
from .msa import MSA
from .phylotree import PhyloTree

__version__ = "0.1.0"

__all__ = [
    "BioVizWidget",
    "BlastHitDistribution",
    "GeneModel",
    "GenomeBrowser",
    "MSA",
    "PhyloTree",
    "fit_to_extent",
    "__version__",
]
