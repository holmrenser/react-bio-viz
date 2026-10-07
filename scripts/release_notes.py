#!/usr/bin/env python3
"""Print the CHANGELOG.md section for a version; exit 1 if there isn't one."""
import re
import sys
from pathlib import Path

CHANGELOG = Path(__file__).resolve().parent.parent / "CHANGELOG.md"


def main() -> int:
    version = sys.argv[1]
    match = re.search(rf"^## {re.escape(version)}\n(.*?)(?=^## |\Z)", CHANGELOG.read_text(), re.S | re.M)
    if not match or not match.group(1).strip():
        print(f"CHANGELOG.md has no '## {version}' section", file=sys.stderr)
        return 1
    print(match.group(1).strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
