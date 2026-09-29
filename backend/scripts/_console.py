"""Console Windows mặc định cp1252 — in tiếng Việt sẽ sập. Gọi use_utf8() đầu main() của script."""

import sys


def use_utf8() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8")
