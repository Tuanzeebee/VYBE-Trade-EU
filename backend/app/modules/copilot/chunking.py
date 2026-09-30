"""Cắt văn bản corpus thành đoạn để truy xuất (D1). Hàm thuần: không DB, không HTTP.

Quy tắc cứng: một đoạn KHÔNG bao giờ vượt qua ranh giới điều, phụ lục, chương hay tiêu đề. Điều dài
hơn giới hạn thì cắt bên trong chính điều đó (gối đầu một phần để không mất ngữ cảnh).
"""

import re
from dataclasses import dataclass

MIN_MAX_CHARS = 100
DEFAULT_MAX_CHARS = 1200
DEFAULT_OVERLAP = 150

# Đầu điều / phụ lục / chương (vi, en) hoặc tiêu đề markdown: bắt đầu một mục mới.
_BOUNDARY = re.compile(
    r"^\s*(?:#{1,6}\s+\S"
    r"|(?:Điều|Article|Phụ lục|Annex|Appendix|Chương|Chapter)\s+[0-9IVXLCivxlc]+\b)"
)
_SENTENCE_END = re.compile(r"(?<=[.!?;:])\s+")


@dataclass(frozen=True)
class Chunk:
    index: int
    heading: str  # tiêu đề của mục chứa đoạn này (điều / phụ lục / tiêu đề)
    text: str


def _heading_of(line: str) -> str:
    return line.strip().lstrip("#").strip()


def _sections(text: str) -> list[tuple[str, str]]:
    """(tiêu đề, nội dung): mỗi ranh giới mở một mục mới; phần trước ranh giới đầu là mục riêng."""
    sections: list[tuple[str, list[str]]] = []
    for line in text.splitlines():
        if _BOUNDARY.match(line) or not sections:
            sections.append((_heading_of(line) if _BOUNDARY.match(line) else "", [line]))
        else:
            sections[-1][1].append(line)
    return [(heading, "\n".join(lines).strip()) for heading, lines in sections]


def _units(section: str, limit: int) -> list[str]:
    """Đơn vị nhỏ nhất có thể ghép: câu; câu vượt giới hạn thì cắt cứng theo độ dài."""
    units: list[str] = []
    for part in _SENTENCE_END.split(section.replace("\n", " \n ")):
        part = part.strip()
        while len(part) > limit:
            units.append(part[:limit])
            part = part[limit:]
        if part:
            units.append(part)
    return units


def _overlap_tail(previous: str, overlap: int, room: int) -> str:
    """Phần cuối của đoạn trước (bắt đầu ở ranh giới từ) để gối đầu, không vượt `room` ký tự."""
    size = min(overlap, room)
    if size <= 0:
        return ""
    tail = previous[-size:]
    if len(previous) > size and " " in tail:
        tail = tail.split(" ", 1)[1]  # bỏ từ bị cắt dở
    return tail.strip()


def _split_long(section: str, max_chars: int, overlap: int) -> list[str]:
    pieces: list[str] = []
    current = ""
    for unit in _units(section, max_chars):
        joined = f"{current} {unit}".strip() if current else unit
        if len(joined) <= max_chars:
            current = joined
            continue
        if current:
            pieces.append(current)
        tail = _overlap_tail(current, overlap, max_chars - len(unit) - 1)
        current = f"{tail} {unit}".strip() if tail else unit
    if current:
        pieces.append(current)
    return pieces


def chunk_document(
    text: str, max_chars: int = DEFAULT_MAX_CHARS, overlap: int = DEFAULT_OVERLAP
) -> list[Chunk]:
    if max_chars < MIN_MAX_CHARS:
        raise ValueError(f"max_chars must be at least {MIN_MAX_CHARS}")
    if not 0 <= overlap < max_chars:
        raise ValueError("overlap must be between 0 and max_chars - 1")
    chunks: list[Chunk] = []
    for heading, section in _sections(text):
        if not section:
            continue
        pieces = (
            [section] if len(section) <= max_chars else _split_long(section, max_chars, overlap)
        )
        for piece in pieces:
            chunks.append(Chunk(index=len(chunks), heading=heading, text=piece))
    return chunks
