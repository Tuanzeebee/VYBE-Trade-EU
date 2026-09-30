"""Chuyển bộ corpus tải từ EUR-Lex (mỗi thư mục có full.md + metadata.json) sang định dạng bộ nạp.

    uv run python -m scripts.convert_corpus <thư-mục-nguồn> [thư-mục-đích]

Đích mặc định backend/data/corpus/. Mỗi thư mục nguồn thành một file <act_id>.md có front matter
(title, source, language, type, url). Không gán hs_codes và không sửa nội dung luật: chỉ bỏ các dòng
đánh dấu bản hợp nhất (▼B, ▼M108…) vì đó là ký hiệu biên tập, không phải điều khoản.
Sau đó chạy `python -m app.modules.copilot.ingest` — văn bản vẫn CHƯA duyệt cho tới khi admin duyệt.
"""

import json
import re
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from scripts._console import use_utf8

DEFAULT_TARGET = Path(__file__).resolve().parents[1] / "data" / "corpus"
_MARKER = re.compile(r"^[▼►◄]\S*\s*$")
_HEADER = re.compile(r"\A#[^\n]*\n+CELEX:[^\n]*\n+")
_LANGUAGES = {"EN": "en", "VI": "vi"}


@dataclass(frozen=True)
class Converted:
    act_id: str
    text: str


def clean_body(raw: str) -> str:
    """Bỏ phần đầu (tiêu đề + dòng CELEX) và dòng ký hiệu hợp nhất; gộp dòng trống thừa."""
    body = _HEADER.sub("", raw.replace("\r\n", "\n").lstrip("﻿"), count=1)
    lines = [line for line in body.split("\n") if not _MARKER.match(line.strip())]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def convert_folder(folder: Path) -> Converted:
    meta = json.loads((folder / "metadata.json").read_text(encoding="utf-8"))
    body = clean_body((folder / "full.md").read_text(encoding="utf-8"))
    language = _LANGUAGES.get(str(meta.get("language", "")).upper())
    if language is None:
        raise ValueError(f"{folder.name}: language không hợp lệ: {meta.get('language')!r}")
    if not body:
        raise ValueError(f"{folder.name}: full.md trống sau khi làm sạch")
    front = [
        f"title: {meta['title']}",
        f"source: EUR-Lex {meta['celex']} ({meta['version']})",
        f"language: {language}",
        "type: law",
    ]
    if meta.get("source_url"):
        front.append(f"url: {meta['source_url']}")
    return Converted(str(meta["act_id"]), "---\n" + "\n".join(front) + "\n---\n" + body + "\n")


def convert_all(source: Path, target: Path) -> tuple[list[str], list[str]]:
    """(đã chuyển, bỏ qua kèm lý do). Thư mục thiếu full.md/metadata.json bị báo, không dừng."""
    done: list[str] = []
    skipped: list[str] = []
    target.mkdir(parents=True, exist_ok=True)
    for folder in sorted(p for p in source.iterdir() if p.is_dir()):
        if not (folder / "full.md").is_file() or not (folder / "metadata.json").is_file():
            skipped.append(f"{folder.name}: thiếu full.md hoặc metadata.json")
            continue
        converted = convert_folder(folder)
        (target / f"{converted.act_id}.md").write_text(converted.text, encoding="utf-8")
        done.append(converted.act_id)
    return done, skipped


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    args = list(sys.argv[1:] if argv is None else argv)
    if not args:
        print("Cách dùng: python -m scripts.convert_corpus <thư-mục-nguồn> [thư-mục-đích]")
        return 1
    source = Path(args[0])
    target = Path(args[1]) if len(args) > 1 else DEFAULT_TARGET
    if not source.is_dir():
        print(f"Không tìm thấy thư mục nguồn: {source}", file=sys.stderr)
        return 1
    try:
        done, skipped = convert_all(source, target)
    except (ValueError, KeyError) as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    print(f"Đã chuyển {len(done)} văn bản vào {target}")
    for line in skipped:
        print(f"BỎ QUA {line}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
