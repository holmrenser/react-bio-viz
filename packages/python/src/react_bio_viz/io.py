"""Reading alignments and trees into the plain structures the widgets take.

The widgets take plain JSON-able data — a list of ``{"header", "sequence"}`` records for
:class:`~react_bio_viz.MSA`, nested ``{"name", "length", "children"}`` dicts for
:class:`~react_bio_viz.PhyloTree` — so any parser works. These cover the common formats without
extra dependencies, and parse Newick the same way the JavaScript ``parseNewick`` does.
"""

from __future__ import annotations

import os
import re
from typing import Any, Union

PathLike = Union[str, "os.PathLike[str]"]

Record = dict[str, str]
TreeNode = dict[str, Any]


def parse_fasta(text: str) -> list[Record]:
    """Parses FASTA text into ``[{"header": ..., "sequence": ...}, ...]``.

    The header is the whole line after ``>``; sequence lines are joined with whitespace removed.
    """
    records: list[Record] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith(">"):
            records.append({"header": line[1:].strip(), "sequence": ""})
        elif records:
            records[-1]["sequence"] += re.sub(r"\s+", "", line)
        else:
            raise ValueError("FASTA text must start with a '>' header line")
    return records


def read_fasta(path: PathLike) -> list[Record]:
    """Reads a FASTA file — see :func:`parse_fasta`."""
    with open(path, encoding="utf-8") as handle:
        return parse_fasta(handle.read())


def parse_newick(text: str) -> TreeNode:
    """Parses a Newick string into nested ``{"name", "length", "children"}`` dicts.

    Internal-node labels (typically bootstrap support) become the node's ``name``; ``:length``
    suffixes become ``length`` (0 when absent). Quoted labels (``'a b'``, with ``''`` for a literal
    quote) are unquoted, so FASTA-style names with spaces or ``|`` survive a round trip.
    """
    position = 0

    def skip_space() -> None:
        nonlocal position
        while position < len(text) and text[position].isspace():
            position += 1

    def parse_label() -> str:
        nonlocal position
        skip_space()
        if position < len(text) and text[position] in "'\"":
            quote = text[position]
            position += 1
            label = []
            while position < len(text):
                if text[position] == quote:
                    if position + 1 < len(text) and text[position + 1] == quote:
                        label.append(quote)
                        position += 2
                        continue
                    position += 1
                    break
                label.append(text[position])
                position += 1
            return "".join(label)
        start = position
        while position < len(text) and text[position] not in ":,();":
            position += 1
        return text[start:position].strip()

    def parse_node() -> TreeNode:
        nonlocal position
        node: TreeNode = {"name": "", "length": 0.0, "children": []}
        skip_space()
        if position < len(text) and text[position] == "(":
            position += 1
            node["children"].append(parse_node())
            skip_space()
            while position < len(text) and text[position] == ",":
                position += 1
                node["children"].append(parse_node())
                skip_space()
            if position < len(text) and text[position] == ")":
                position += 1
        node["name"] = parse_label()
        skip_space()
        if position < len(text) and text[position] == ":":
            position += 1
            start = position
            while position < len(text) and text[position] not in ",);":
                position += 1
            try:
                node["length"] = float(text[start:position])
            except ValueError:
                node["length"] = 0.0
        return node

    return parse_node()


def read_newick(path: PathLike) -> TreeNode:
    """Reads a Newick file — see :func:`parse_newick`."""
    with open(path, encoding="utf-8") as handle:
        return parse_newick(handle.read())


def _quote(name: str) -> str:
    return f"'{name.replace(chr(39), chr(39) * 2)}'" if re.search(r"[\s:,;()\[\]']", name) else name


def to_newick(tree: TreeNode) -> str:
    """Serializes nested ``{"name", "length", "children"}`` dicts to Newick, quoting names as needed."""

    def write(node: TreeNode, is_root: bool) -> str:
        children = node.get("children") or []
        inner = "(" + ",".join(write(child, False) for child in children) + ")" if children else ""
        length = node.get("length") or 0
        suffix = "" if is_root and not length else f":{length:g}"
        return f"{inner}{_quote(node.get('name', ''))}{suffix}"

    return write(tree, True) + ";"
