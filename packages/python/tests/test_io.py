"""Tests for the FASTA/Newick helpers."""

from __future__ import annotations

import pytest

from react_bio_viz import parse_fasta, parse_newick, read_fasta, to_newick


def test_parse_fasta_joins_wrapped_lines_and_keeps_the_full_header():
    records = parse_fasta(">sp|P1| protein one\nACGT\nAC GT\n\n>two\n--AC\n")
    assert records == [
        {"header": "sp|P1| protein one", "sequence": "ACGTACGT"},
        {"header": "two", "sequence": "--AC"},
    ]


def test_parse_fasta_rejects_sequence_before_a_header():
    with pytest.raises(ValueError):
        parse_fasta("ACGT\n>one\nAC")


def test_read_fasta(tmp_path):
    path = tmp_path / "a.fasta"
    path.write_text(">a\nAC\n>b\nAG\n")
    assert [r["header"] for r in read_fasta(path)] == ["a", "b"]


def test_parse_newick_reads_topology_lengths_and_support():
    tree = parse_newick("((A:0.1,B:0.2)95:0.3,C:0.4);")
    clade, c = tree["children"]
    assert clade["name"] == "95" and clade["length"] == pytest.approx(0.3)
    assert [child["name"] for child in clade["children"]] == ["A", "B"]
    assert c == {"name": "C", "length": pytest.approx(0.4), "children": []}


def test_parse_newick_unquotes_labels():
    tree = parse_newick("('sp|Q1|X a, b':1,'it''s':2);")
    assert [child["name"] for child in tree["children"]] == ["sp|Q1|X a, b", "it's"]


def test_newick_round_trips_with_quoting():
    text = "(('sp|Q1 x':0.1,B:0.2)0.9:0.3,C:0.4);"
    assert to_newick(parse_newick(text)) == text


def test_missing_lengths_default_to_zero():
    tree = parse_newick(" ( A , B ) ; ")
    assert [(c["name"], c["length"]) for c in tree["children"]] == [("A", 0.0), ("B", 0.0)]
